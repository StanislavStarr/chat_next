"use client"

import type { Meeting } from "@/features/meetings/model/types"

import { useChatSocket } from "../hooks/use-chat-socket"
import { ConnectionStatus } from "./connection-status"
import { MessageForm } from "./message-form"
import { MessageList } from "./message-list"

type ChatProps = {
  meeting: Meeting | null
}

export function Chat({ meeting }: ChatProps) {
  const {
    connectionStatus,
    isConsultantTyping,
    messages,
    reconnect,
    retryMessage,
    sendMessage,
  } = useChatSocket(meeting?.id ?? null)

  return (
    <section className="chat-panel" aria-labelledby="chat-title">
      <header className="panel-header">
        <h2 id="chat-title">
          {meeting ? `Чат: ${meeting.title}` : "Выберите встречу"}
        </h2>
        <ConnectionStatus
          status={connectionStatus}
          isTyping={isConsultantTyping}
          onReconnect={reconnect}
        />
      </header>

      <MessageList messages={messages} onRetry={retryMessage} />
      <MessageForm
        key={meeting?.id}
        onSend={sendMessage}
        disabled={!meeting}
      />
    </section>
  )
}
