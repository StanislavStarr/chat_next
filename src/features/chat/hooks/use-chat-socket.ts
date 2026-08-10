"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type {
  ChatMessage,
  ChatSocketEvent,
  ChatSocketMessage,
  ConnectionStatus,
} from "../model/types"

const INITIAL_RECONNECT_DELAY = 1_000
const MAX_RECONNECT_DELAY = 10_000

type UseChatSocketResult = {
  messages: ChatMessage[]
  connectionStatus: ConnectionStatus
  isConsultantTyping: boolean
  sendMessage: (text: string) => void
  retryMessage: (clientId: string) => void
  reconnect: () => void
}

function parseSocketEvent(data: unknown): ChatSocketEvent | null {
  if (typeof data !== "string") {
    return null
  }

  try {
    const message: unknown = JSON.parse(data)

    if (
      typeof message === "object" &&
      message !== null &&
      "clientId" in message &&
      typeof message.clientId === "string"
    ) {
      if (
        "type" in message &&
        message.type === "typing" &&
        "isTyping" in message &&
        typeof message.isTyping === "boolean"
      ) {
        return message as ChatSocketEvent
      }

      if (
      "text" in message &&
      typeof message.text === "string" &&
      "createdAt" in message &&
      typeof message.createdAt === "string"
      ) {
        return message as ChatSocketEvent
      }
    }
  } catch {
    return null
  }

  return null
}

function sendToSocket(
  socket: WebSocket,
  message: ChatSocketMessage,
): boolean {
  if (socket.readyState !== WebSocket.OPEN) {
    return false
  }

  try {
    socket.send(JSON.stringify(message))
    return true
  } catch {
    return false
  }
}

export function useChatSocket(
  url = process.env.NEXT_PUBLIC_WS_URL,
): UseChatSocketResult {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typingClientIds, setTypingClientIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting")

  const messagesRef = useRef<ChatMessage[]>([])
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptRef = useRef(0)
  const connectRef = useRef<() => void>(() => undefined)

  const updateMessages = useCallback(
    (updater: (current: ChatMessage[]) => ChatMessage[]) => {
      setMessages((current) => {
        const next = updater(current)
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
      setTypingClientIds(new Set())

      const socket = new WebSocket(url)
      socketRef.current = socket

      socket.addEventListener("open", () => {
        if (!active || socketRef.current !== socket) {
          return
        }

        reconnectAttemptRef.current = 0
        setConnectionStatus("connected")

        const queuedMessages = messagesRef.current.filter(
          (message) =>
            message.author === "user" && message.status === "pending",
        )
        const sentClientIds = new Set<string>()
        const failedClientIds = new Set<string>()

        queuedMessages.forEach((message) => {
          const wasSent = sendToSocket(socket, {
            clientId: message.clientId,
            text: message.text,
            createdAt: message.createdAt,
          })

          if (wasSent) {
            sentClientIds.add(message.clientId)
          } else {
            failedClientIds.add(message.clientId)
          }
        })

        if (sentClientIds.size || failedClientIds.size) {
          updateMessages((current) =>
            current.map((message) => {
              if (sentClientIds.has(message.clientId)) {
                return { ...message, status: "sent" }
              }

              if (failedClientIds.has(message.clientId)) {
                return { ...message, status: "failed" }
              }

              return message
            }),
          )
        }
      })

      socket.addEventListener("message", (event) => {
        if (!active || socketRef.current !== socket) {
          return
        }

        const incomingMessage = parseSocketEvent(event.data)

        if (!incomingMessage) {
          return
        }

        if ("type" in incomingMessage) {
          setTypingClientIds((current) => {
            const next = new Set(current)

            if (incomingMessage.isTyping) {
              next.add(incomingMessage.clientId)
            } else {
              next.delete(incomingMessage.clientId)
            }

            return next
          })
          return
        }

        setTypingClientIds((current) => {
          const next = new Set(current)
          next.delete(incomingMessage.clientId)
          return next
        })

        updateMessages((current) => {
          const echoId = `echo-${incomingMessage.clientId}`
          const hasEcho = current.some((message) => message.id === echoId)
          const deliveredMessages = current.map((message) =>
            message.author === "user" &&
            message.clientId === incomingMessage.clientId
              ? { ...message, status: "delivered" as const }
              : message,
          )

          if (hasEcho) {
            return deliveredMessages
          }

          return [
            ...deliveredMessages,
            {
              id: echoId,
              clientId: incomingMessage.clientId,
              text: incomingMessage.text,
              author: "consultant",
              status: "delivered",
              createdAt: incomingMessage.createdAt,
            },
          ]
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
        setTypingClientIds(new Set())
        updateMessages((current) =>
          current.map((message) =>
            message.author === "user" && message.status === "sent"
              ? { ...message, status: "pending" }
              : message,
          ),
        )
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
  }, [updateMessages, url])

  const sendMessage = useCallback(
    (text: string) => {
      const normalizedText = text.trim()

      if (!normalizedText) {
        return
      }

      const clientId = crypto.randomUUID()
      const createdAt = new Date().toISOString()
      const socket = socketRef.current
      const wasSent =
        socket !== null &&
        sendToSocket(socket, {
          clientId,
          text: normalizedText,
          createdAt,
        })

      updateMessages((current) => [
        ...current,
        {
          id: clientId,
          clientId,
          text: normalizedText,
          author: "user",
          status: wasSent ? "sent" : "pending",
          createdAt,
        },
      ])
    },
    [updateMessages],
  )

  const retryMessage = useCallback(
    (clientId: string) => {
      const message = messagesRef.current.find(
        (item) => item.author === "user" && item.clientId === clientId,
      )

      if (!message || message.status === "delivered") {
        return
      }

      const socket = socketRef.current
      const wasSent =
        socket !== null &&
        sendToSocket(socket, {
          clientId: message.clientId,
          text: message.text,
          createdAt: message.createdAt,
        })

      updateMessages((current) =>
        current.map((item) =>
          item.author === "user" && item.clientId === clientId
            ? { ...item, status: wasSent ? "sent" : "failed" }
            : item,
        ),
      )
    },
    [updateMessages],
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

  return {
    messages,
    connectionStatus,
    isConsultantTyping: typingClientIds.size > 0,
    sendMessage,
    retryMessage,
    reconnect,
  }
}
