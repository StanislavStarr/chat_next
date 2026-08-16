"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type {
  ChatSocketClientEvent,
  ChatSocketServerEvent,
  ConnectionStatus,
} from "../model/types"
import { parseSocketEvent } from "./chat-socket-protocol"

const INITIAL_RECONNECT_DELAY = 1_000
const MAX_RECONNECT_DELAY = 10_000

export type SendFn = (event: ChatSocketClientEvent) => boolean

type UseWebSocketConnectionOptions = {
  url: string | undefined
  onConnecting: () => void
  onOpen: (send: SendFn) => void
  onEvent: (event: ChatSocketServerEvent) => void
  onClose: () => void
}

type UseWebSocketConnectionResult = {
  connectionStatus: ConnectionStatus
  send: SendFn
  reconnect: () => void
}

export function useWebSocketConnection({
  url,
  onConnecting,
  onOpen,
  onEvent,
  onClose,
}: UseWebSocketConnectionOptions): UseWebSocketConnectionResult {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting")

  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptRef = useRef(0)
  const connectRef = useRef<() => void>(() => undefined)

  const onConnectingRef = useRef(onConnecting)
  const onOpenRef = useRef(onOpen)
  const onEventRef = useRef(onEvent)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onConnectingRef.current = onConnecting
    onOpenRef.current = onOpen
    onEventRef.current = onEvent
    onCloseRef.current = onClose
  })

  const send = useCallback<SendFn>((event) => {
    const socket = socketRef.current

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false
    }

    try {
      socket.send(JSON.stringify(event))
      return true
    } catch {
      return false
    }
  }, [])

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
      onConnectingRef.current()

      const socket = new WebSocket(url)
      socketRef.current = socket

      socket.addEventListener("open", () => {
        if (!active || socketRef.current !== socket) {
          return
        }

        reconnectAttemptRef.current = 0
        setConnectionStatus("connected")
        onOpenRef.current(send)
      })

      socket.addEventListener("message", (messageEvent) => {
        if (!active || socketRef.current !== socket) {
          return
        }

        const event = parseSocketEvent(messageEvent.data)

        if (event) {
          onEventRef.current(event)
        }
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
        onCloseRef.current()
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
  }, [send, url])

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

  return { connectionStatus, send, reconnect }
}
