"use client"

import { useChatSocket } from "../hooks/use-chat-socket"
import { ConnectionStatus } from "./connection-status"
import { MessageForm } from "./message-form"
import { MessageList } from "./message-list"
import { RetroPanel, RetroPanelHeader, RetroPanelHeading } from "@/shared/ui/retro"
import type { Meeting } from "@/features/meetings/model/types"

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
    <RetroPanel
      ariaLabelledBy="chat-title"
      className="grid h-[calc(100dvh-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden md:h-full"
    >
      <RetroPanelHeader>
        <RetroPanelHeading id="chat-title">
          {meeting ? `Чат: ${meeting.title}` : "Выберите встречу"}
        </RetroPanelHeading>
        <ConnectionStatus
          status={connectionStatus}
          isTyping={isConsultantTyping}
          onReconnect={reconnect}
        />
      </RetroPanelHeader>

      <MessageList messages={messages} onRetry={retryMessage} />
      <MessageForm
        key={meeting?.id}
        onSend={sendMessage}
        disabled={!meeting}
      />
    </RetroPanel>
  )
}
