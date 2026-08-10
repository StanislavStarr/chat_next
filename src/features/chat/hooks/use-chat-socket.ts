"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type {
  ChatMessage,
  ChatSocketClientEvent,
  ChatSocketServerEvent,
  ConnectionStatus,
} from "../model/types"

const INITIAL_RECONNECT_DELAY = 1_000
const MAX_RECONNECT_DELAY = 10_000

type MessagesByMeeting = Record<string, ChatMessage[]>

type UseChatSocketResult = {
  messages: ChatMessage[]
  connectionStatus: ConnectionStatus
  isConsultantTyping: boolean
  sendMessage: (text: string) => void
  retryMessage: (clientId: string) => void
  reconnect: () => void
}

function isChatMessage(value: unknown): value is ChatMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "meetingId" in value &&
    typeof value.meetingId === "string" &&
    "clientId" in value &&
    typeof value.clientId === "string" &&
    "text" in value &&
    typeof value.text === "string" &&
    "author" in value &&
    (value.author === "user" || value.author === "consultant") &&
    "status" in value &&
    value.status === "delivered" &&
    "createdAt" in value &&
    typeof value.createdAt === "string"
  )
}

function parseSocketEvent(data: unknown): ChatSocketServerEvent | null {
  if (typeof data !== "string") {
    return null
  }

  try {
    const event: unknown = JSON.parse(data)

    if (
      typeof event !== "object" ||
      event === null ||
      !("type" in event) ||
      !("meetingId" in event) ||
      typeof event.meetingId !== "string"
    ) {
      return null
    }

    if (
      event.type === "typing" &&
      "clientId" in event &&
      typeof event.clientId === "string" &&
      "isTyping" in event &&
      typeof event.isTyping === "boolean"
    ) {
      return event as ChatSocketServerEvent
    }

    if (
      event.type === "history" &&
      "messages" in event &&
      Array.isArray(event.messages) &&
      event.messages.every(isChatMessage)
    ) {
      return event as ChatSocketServerEvent
    }

    if (
      event.type === "message" &&
      "message" in event &&
      isChatMessage(event.message)
    ) {
      return event as ChatSocketServerEvent
    }
  } catch {
    return null
  }

  return null
}

function sendToSocket(socket: WebSocket, event: ChatSocketClientEvent): boolean {
  if (socket.readyState !== WebSocket.OPEN) {
    return false
  }

  try {
    socket.send(JSON.stringify(event))
    return true
  } catch {
    return false
  }
}

function mergeHistory(
  serverMessages: ChatMessage[],
  localMessages: ChatMessage[],
): ChatMessage[] {
  const serverIds = new Set(serverMessages.map((message) => message.id))
  const localOnlyMessages = localMessages.filter(
    (message) => !serverIds.has(message.id),
  )

  return [...serverMessages, ...localOnlyMessages].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  )
}

export function useChatSocket(
  meetingId: string | null,
  url = process.env.NEXT_PUBLIC_WS_URL,
): UseChatSocketResult {
  const [messagesByMeeting, setMessagesByMeeting] =
    useState<MessagesByMeeting>({})
  const [typingKeys, setTypingKeys] = useState<Set<string>>(() => new Set())
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting")

  const messagesRef = useRef<MessagesByMeeting>({})
  const activeMeetingIdRef = useRef(meetingId)
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptRef = useRef(0)
  const connectRef = useRef<() => void>(() => undefined)

  activeMeetingIdRef.current = meetingId

  const updateMeetingMessages = useCallback(
    (
      targetMeetingId: string,
      updater: (current: ChatMessage[]) => ChatMessage[],
    ) => {
      setMessagesByMeeting((current) => {
        const next = {
          ...current,
          [targetMeetingId]: updater(current[targetMeetingId] ?? []),
        }
        messagesRef.current = next
        return next
      })
    },
    [],
  )

  useEffect(() => {
    let active = true

    const scheduleReconnect = () => {
      if (!active || reconnectTimerRef.current) {
        return
      }

      const delay = Math.min(
        INITIAL_RECONNECT_DELAY * 2 ** reconnectAttemptRef.current,
        MAX_RECONNECT_DELAY,
      )

      reconnectAttemptRef.current += 1
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null
        connectRef.current()
      }, delay)
    }

    const connect = () => {
      if (!active || !url) {
        setConnectionStatus("disconnected")
        return
      }

      setConnectionStatus("connecting")
      setTypingKeys(new Set())

      const socket = new WebSocket(url)
      socketRef.current = socket

      socket.addEventListener("open", () => {
        if (!active || socketRef.current !== socket) {
          return
        }

        reconnectAttemptRef.current = 0
        setConnectionStatus("connected")

        const activeMeetingId = activeMeetingIdRef.current

        if (activeMeetingId) {
          sendToSocket(socket, {
            type: "join",
            meetingId: activeMeetingId,
          })
        }

        const sentIds = new Set<string>()
        const failedIds = new Set<string>()

        Object.values(messagesRef.current)
          .flat()
          .filter(
            (message) =>
              message.author === "user" && message.status === "pending",
          )
          .forEach((message) => {
            const wasSent = sendToSocket(socket, {
              type: "message",
              meetingId: message.meetingId,
              clientId: message.clientId,
              text: message.text,
              createdAt: message.createdAt,
            })

            if (wasSent) {
              sentIds.add(message.id)
            } else {
              failedIds.add(message.id)
            }
          })

        if (sentIds.size || failedIds.size) {
          setMessagesByMeeting((current) => {
            const next = Object.fromEntries(
              Object.entries(current).map(([id, messages]) => [
                id,
                messages.map((message) => {
                  if (sentIds.has(message.id)) {
                    return { ...message, status: "sent" as const }
                  }

                  if (failedIds.has(message.id)) {
                    return { ...message, status: "failed" as const }
                  }

                  return message
                }),
              ]),
            )
            messagesRef.current = next
            return next
          })
        }
      })

      socket.addEventListener("message", (messageEvent) => {
        if (!active || socketRef.current !== socket) {
          return
        }

        const event = parseSocketEvent(messageEvent.data)

        if (!event) {
          return
        }

        if (event.type === "typing") {
          const typingKey = `${event.meetingId}:${event.clientId}`

          setTypingKeys((current) => {
            const next = new Set(current)

            if (event.isTyping) {
              next.add(typingKey)
            } else {
              next.delete(typingKey)
            }

            return next
          })
          return
        }

        if (event.type === "history") {
          updateMeetingMessages(event.meetingId, (current) =>
            mergeHistory(event.messages, current),
          )
          return
        }

        setTypingKeys((current) => {
          const next = new Set(current)
          next.delete(`${event.meetingId}:${event.message.clientId}`)
          return next
        })

        updateMeetingMessages(event.meetingId, (current) => {
          const deliveredMessages = current.map((message) =>
            message.author === "user" &&
            message.clientId === event.message.clientId
              ? { ...message, status: "delivered" as const }
              : message,
          )

          if (
            deliveredMessages.some(
              (message) => message.id === event.message.id,
            )
          ) {
            return deliveredMessages
          }

          return [...deliveredMessages, event.message]
        })
      })

      socket.addEventListener("error", () => {
        socket.close()
      })

      socket.addEventListener("close", () => {
        if (!active || socketRef.current !== socket) {
          return
        }

        socketRef.current = null
        setConnectionStatus("disconnected")
        setTypingKeys(new Set())
        setMessagesByMeeting((current) => {
          const next = Object.fromEntries(
            Object.entries(current).map(([id, messages]) => [
              id,
              messages.map((message) =>
                message.author === "user" && message.status === "sent"
                  ? { ...message, status: "pending" as const }
                  : message,
              ),
            ]),
          )
          messagesRef.current = next
          return next
        })
        scheduleReconnect()
      })
    }

    connectRef.current = connect
    connect()

    return () => {
      active = false

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }

      socketRef.current?.close()
      socketRef.current = null
    }
  }, [updateMeetingMessages, url])

  useEffect(() => {
    const socket = socketRef.current

    if (meetingId && socket?.readyState === WebSocket.OPEN) {
      sendToSocket(socket, {
        type: "join",
        meetingId,
      })
    }
  }, [meetingId])

  const sendMessage = useCallback(
    (text: string) => {
      const normalizedText = text.trim()
      const targetMeetingId = activeMeetingIdRef.current

      if (!normalizedText || !targetMeetingId) {
        return
      }

      const clientId = crypto.randomUUID()
      const createdAt = new Date().toISOString()
      const socket = socketRef.current
      const wasSent =
        socket !== null &&
        sendToSocket(socket, {
          type: "message",
          meetingId: targetMeetingId,
          clientId,
          text: normalizedText,
          createdAt,
        })

      updateMeetingMessages(targetMeetingId, (current) => [
        ...current,
        {
          id: clientId,
          meetingId: targetMeetingId,
          clientId,
          text: normalizedText,
          author: "user",
          status: wasSent ? "sent" : "pending",
          createdAt,
        },
      ])
    },
    [updateMeetingMessages],
  )

  const retryMessage = useCallback(
    (clientId: string) => {
      const targetMeetingId = activeMeetingIdRef.current

      if (!targetMeetingId) {
        return
      }

      const message = messagesRef.current[targetMeetingId]?.find(
        (item) => item.author === "user" && item.clientId === clientId,
      )

      if (!message || message.status === "delivered") {
        return
      }

      const socket = socketRef.current
      const wasSent =
        socket !== null &&
        sendToSocket(socket, {
          type: "message",
          meetingId: message.meetingId,
          clientId: message.clientId,
          text: message.text,
          createdAt: message.createdAt,
        })

      updateMeetingMessages(targetMeetingId, (current) =>
        current.map((item) =>
          item.author === "user" && item.clientId === clientId
            ? { ...item, status: wasSent ? "sent" : "failed" }
            : item,
        ),
      )
    },
    [updateMeetingMessages],
  )

  const reconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    const socket = socketRef.current
    socketRef.current = null
    socket?.close()
    reconnectAttemptRef.current = 0
    connectRef.current()
  }, [])

  const messages = meetingId ? (messagesByMeeting[meetingId] ?? []) : []
  const typingPrefix = `${meetingId}:`

  return {
    messages,
    connectionStatus,
    isConsultantTyping:
      meetingId !== null &&
      [...typingKeys].some((key) => key.startsWith(typingPrefix)),
    sendMessage,
    retryMessage,
    reconnect,
  }
}
