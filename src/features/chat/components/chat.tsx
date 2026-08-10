"use client"

import { useChatSocket } from "../hooks/use-chat-socket"
import { ConnectionStatus } from "./connection-status"
import { MessageForm } from "./message-form"
import { MessageList } from "./message-list"

export function Chat() {
  const {
    connectionStatus,
    isConsultantTyping,
    messages,
    reconnect,
    retryMessage,
    sendMessage,
  } = useChatSocket()

  return (
    <section className="chat-panel" aria-labelledby="chat-title">
      <header className="panel-header">
        <h2 id="chat-title">Чат</h2>
        <ConnectionStatus
          status={connectionStatus}
          isTyping={isConsultantTyping}
          onReconnect={reconnect}
        />
      </header>

      <MessageList messages={messages} onRetry={retryMessage} />
      <MessageForm onSend={sendMessage} />
    </section>
  )
}
