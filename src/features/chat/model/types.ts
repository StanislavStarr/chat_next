export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"

export type MessageStatus = "pending" | "sent" | "delivered" | "failed"

export type MessageAuthor = "user" | "consultant"

export type ChatMessage = {
  id: string
  meetingId: string
  clientId: string
  text: string
  author: MessageAuthor
  status: MessageStatus
  createdAt: string
}

export type ChatSocketSendEvent = {
  type: "send"
  meetingId: string
  clientId: string
  text: string
  createdAt: string
}

export type ChatSocketTypingEvent = {
  type: "typing"
  meetingId: string
  clientId: string
  isTyping: boolean
}

export type ChatSocketJoinEvent = {
  type: "join"
  meetingId: string
}

export type ChatSocketHistoryEvent = {
  type: "history"
  meetingId: string
  messages: ChatMessage[]
}

export type ChatSocketMessageEvent = {
  type: "message"
  meetingId: string
  message: ChatMessage
}

export type ChatSocketClientEvent = ChatSocketJoinEvent | ChatSocketSendEvent

export type ChatSocketServerEvent =
  | ChatSocketHistoryEvent
  | ChatSocketMessageEvent
  | ChatSocketTypingEvent
