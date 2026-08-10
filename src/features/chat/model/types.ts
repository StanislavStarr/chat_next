export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"

export type MessageStatus = "pending" | "sent" | "delivered" | "failed"

export type MessageAuthor = "user" | "consultant"

export type ChatMessage = {
  id: string
  clientId: string
  text: string
  author: MessageAuthor
  status: MessageStatus
  createdAt: string
}

export type ChatSocketMessage = {
  clientId: string
  text: string
  createdAt: string
}

export type ChatSocketTypingEvent = {
  type: "typing"
  clientId: string
  isTyping: boolean
}

export type ChatSocketEvent = ChatSocketMessage | ChatSocketTypingEvent
