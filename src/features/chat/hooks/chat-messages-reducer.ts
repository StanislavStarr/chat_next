import type { ChatMessage, MessageStatus } from "../model/types"

export type MessagesByMeeting = Record<string, ChatMessage[]>

export type ChatMessagesState = {
  messagesByMeeting: MessagesByMeeting
  typingKeys: Set<string>
}

export const initialChatMessagesState: ChatMessagesState = {
  messagesByMeeting: {},
  typingKeys: new Set(),
}

export type ChatMessagesAction =
  | { type: "connectionAttemptStarted" }
  | { type: "connectionLost" }
  | { type: "historyMerged"; meetingId: string; messages: ChatMessage[] }
  | { type: "messageQueued"; message: ChatMessage }
  | {
      type: "messagesStatusChanged"
      changes: ReadonlyMap<string, MessageStatus>
    }
  | { type: "messageDelivered"; meetingId: string; message: ChatMessage }
  | {
      type: "typingChanged"
      meetingId: string
      clientId: string
      isTyping: boolean
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

function updateMeetingMessages(
  messagesByMeeting: MessagesByMeeting,
  meetingId: string,
  updater: (current: ChatMessage[]) => ChatMessage[],
): MessagesByMeeting {
  return {
    ...messagesByMeeting,
    [meetingId]: updater(messagesByMeeting[meetingId] ?? []),
  }
}

function markSentMessagesAsPending(
  messagesByMeeting: MessagesByMeeting,
): MessagesByMeeting {
  return Object.fromEntries(
    Object.entries(messagesByMeeting).map(([meetingId, messages]) => [
      meetingId,
      messages.map((message) =>
        message.author === "user" && message.status === "sent"
          ? { ...message, status: "pending" as const }
          : message,
      ),
    ]),
  )
}

function applyStatusChanges(
  messagesByMeeting: MessagesByMeeting,
  changes: ReadonlyMap<string, MessageStatus>,
): MessagesByMeeting {
  return Object.fromEntries(
    Object.entries(messagesByMeeting).map(([meetingId, messages]) => [
      meetingId,
      messages.map((message) => {
        const nextStatus = changes.get(message.id)
        return nextStatus ? { ...message, status: nextStatus } : message
      }),
    ]),
  )
}

export function chatMessagesReducer(
  state: ChatMessagesState,
  action: ChatMessagesAction,
): ChatMessagesState {
  switch (action.type) {
    case "connectionAttemptStarted":
      return { ...state, typingKeys: new Set() }

    case "connectionLost":
      return {
        messagesByMeeting: markSentMessagesAsPending(state.messagesByMeeting),
        typingKeys: new Set(),
      }

    case "historyMerged":
      return {
        ...state,
        messagesByMeeting: updateMeetingMessages(
          state.messagesByMeeting,
          action.meetingId,
          (current) => mergeHistory(action.messages, current),
        ),
      }

    case "messageQueued":
      return {
        ...state,
        messagesByMeeting: updateMeetingMessages(
          state.messagesByMeeting,
          action.message.meetingId,
          (current) => [...current, action.message],
        ),
      }

    case "messagesStatusChanged":
      return {
        ...state,
        messagesByMeeting: applyStatusChanges(
          state.messagesByMeeting,
          action.changes,
        ),
      }

    case "messageDelivered": {
      const typingKeys = new Set(state.typingKeys)
      typingKeys.delete(`${action.meetingId}:${action.message.clientId}`)

      const messagesByMeeting = updateMeetingMessages(
        state.messagesByMeeting,
        action.meetingId,
        (current) => {
          const deliveredMessages = current.map((message) =>
            message.author === "user" &&
            message.clientId === action.message.clientId
              ? { ...message, status: "delivered" as const }
              : message,
          )

          if (
            deliveredMessages.some(
              (message) => message.id === action.message.id,
            )
          ) {
            return deliveredMessages
          }

          return [...deliveredMessages, action.message]
        },
      )

      return { messagesByMeeting, typingKeys }
    }

    case "typingChanged": {
      const typingKey = `${action.meetingId}:${action.clientId}`
      const typingKeys = new Set(state.typingKeys)

      if (action.isTyping) {
        typingKeys.add(typingKey)
      } else {
        typingKeys.delete(typingKey)
      }

      return { ...state, typingKeys }
    }

    default:
      return state
  }
}
