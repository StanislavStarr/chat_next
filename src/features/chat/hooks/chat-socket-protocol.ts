import type {
  ChatMessage,
  ChatSocketHistoryEvent,
  ChatSocketMessageEvent,
  ChatSocketServerEvent,
  ChatSocketTypingEvent,
} from "../model/types"

function isString(value: unknown): value is string {
  return typeof value === "string"
}

export function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isString(candidate.id) &&
    isString(candidate.meetingId) &&
    isString(candidate.clientId) &&
    isString(candidate.text) &&
    (candidate.author === "user" || candidate.author === "consultant") &&
    candidate.status === "delivered" &&
    isString(candidate.createdAt)
  )
}

type RawSocketEvent = {
  type: unknown
  meetingId: string
  [key: string]: unknown
}

export function isTypingEvent(
  event: RawSocketEvent,
): event is ChatSocketTypingEvent {
  return (
    event.type === "typing" &&
    isString(event.clientId) &&
    typeof event.isTyping === "boolean"
  )
}

export function isHistoryEvent(
  event: RawSocketEvent,
): event is ChatSocketHistoryEvent {
  return (
    event.type === "history" &&
    Array.isArray(event.messages) &&
    event.messages.every(isChatMessage)
  )
}

export function isMessageEvent(
  event: RawSocketEvent,
): event is ChatSocketMessageEvent {
  return event.type === "message" && isChatMessage(event.message)
}

export function parseSocketEvent(data: unknown): ChatSocketServerEvent | null {
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

    const rawEvent = event as RawSocketEvent

    if (isTypingEvent(rawEvent) || isHistoryEvent(rawEvent) || isMessageEvent(rawEvent)) {
      return rawEvent
    }
  } catch {
    return null
  }

  return null
}
