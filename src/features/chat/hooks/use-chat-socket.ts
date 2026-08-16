"use client"

import { useCallback, useEffect, useReducer, useRef } from "react"

import type {
  ChatMessage,
  ChatSocketServerEvent,
  ConnectionStatus,
  MessageStatus,
} from "../model/types"
import {
  chatMessagesReducer,
  initialChatMessagesState,
} from "./chat-messages-reducer"
import { type SendFn, useWebSocketConnection } from "./use-websocket-connection"

type UseChatSocketResult = {
  messages: ChatMessage[]
  connectionStatus: ConnectionStatus
  isConsultantTyping: boolean
  sendMessage: (text: string) => void
  retryMessage: (clientId: string) => void
  reconnect: () => void
}

export function useChatSocket(
  meetingId: string | null,
  url = process.env.NEXT_PUBLIC_WS_URL,
): UseChatSocketResult {
  const [state, dispatch] = useReducer(
    chatMessagesReducer,
    initialChatMessagesState,
  )

  const stateRef = useRef(state)
  const activeMeetingIdRef = useRef(meetingId)

  useEffect(() => {
    stateRef.current = state
  })

  useEffect(() => {
    activeMeetingIdRef.current = meetingId
  }, [meetingId])

  const handleConnecting = useCallback(() => {
    dispatch({ type: "connectionAttemptStarted" })
  }, [])

  const handleOpen = useCallback((send: SendFn) => {
    const activeMeetingId = activeMeetingIdRef.current

    if (activeMeetingId) {
      send({ type: "join", meetingId: activeMeetingId })
    }

    const changes = new Map<string, MessageStatus>()

    Object.values(stateRef.current.messagesByMeeting)
      .flat()
      .filter(
        (message) => message.author === "user" && message.status === "pending",
      )
      .forEach((message) => {
        const wasSent = send({
          type: "send",
          meetingId: message.meetingId,
          clientId: message.clientId,
          text: message.text,
          createdAt: message.createdAt,
        })

        changes.set(message.id, wasSent ? "sent" : "failed")
      })

    if (changes.size) {
      dispatch({ type: "messagesStatusChanged", changes })
    }
  }, [])

  const handleEvent = useCallback((event: ChatSocketServerEvent) => {
    if (event.type === "typing") {
      dispatch({
        type: "typingChanged",
        meetingId: event.meetingId,
        clientId: event.clientId,
        isTyping: event.isTyping,
      })
      return
    }

    if (event.type === "history") {
      dispatch({
        type: "historyMerged",
        meetingId: event.meetingId,
        messages: event.messages,
      })
      return
    }

    dispatch({
      type: "messageDelivered",
      meetingId: event.meetingId,
      message: event.message,
    })
  }, [])

  const handleClose = useCallback(() => {
    dispatch({ type: "connectionLost" })
  }, [])

  const { connectionStatus, send, reconnect } = useWebSocketConnection({
    url,
    onConnecting: handleConnecting,
    onOpen: handleOpen,
    onEvent: handleEvent,
    onClose: handleClose,
  })

  useEffect(() => {
    if (meetingId) {
      send({ type: "join", meetingId })
    }
  }, [meetingId, send])

  const sendMessage = useCallback(
    (text: string) => {
      const normalizedText = text.trim()
      const targetMeetingId = activeMeetingIdRef.current

      if (!normalizedText || !targetMeetingId) {
        return
      }

      const clientId = crypto.randomUUID()
      const createdAt = new Date().toISOString()
      const wasSent = send({
        type: "send",
        meetingId: targetMeetingId,
        clientId,
        text: normalizedText,
        createdAt,
      })

      dispatch({
        type: "messageQueued",
        message: {
          id: clientId,
          meetingId: targetMeetingId,
          clientId,
          text: normalizedText,
          author: "user",
          status: wasSent ? "sent" : "pending",
          createdAt,
        },
      })
    },
    [send],
  )

  const retryMessage = useCallback(
    (clientId: string) => {
      const targetMeetingId = activeMeetingIdRef.current

      if (!targetMeetingId) {
        return
      }

      const message = stateRef.current.messagesByMeeting[targetMeetingId]?.find(
        (item) => item.author === "user" && item.clientId === clientId,
      )

      if (!message || message.status === "delivered") {
        return
      }

      const wasSent = send({
        type: "send",
        meetingId: message.meetingId,
        clientId: message.clientId,
        text: message.text,
        createdAt: message.createdAt,
      })

      dispatch({
        type: "messagesStatusChanged",
        changes: new Map([[message.id, wasSent ? "sent" : "failed"]]),
      })
    },
    [send],
  )

  const messages = meetingId ? (state.messagesByMeeting[meetingId] ?? []) : []
  const typingPrefix = `${meetingId}:`

  return {
    messages,
    connectionStatus,
    isConsultantTyping:
      meetingId !== null &&
      [...state.typingKeys].some((key) => key.startsWith(typingPrefix)),
    sendMessage,
    retryMessage,
    reconnect,
  }
}
