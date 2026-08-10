"use client"

import { useEffect, useRef } from "react"

import type {
  ChatMessage,
  MessageAuthor,
  MessageStatus,
} from "../model/types"

type MessageListProps = {
  messages: ChatMessage[]
  onRetry: (clientId: string) => void
}

const authorLabels: Record<MessageAuthor, string> = {
  user: "Вы",
  consultant: "Консультант",
}

const statusLabels: Record<MessageStatus, string> = {
  pending: "Ожидает отправки",
  sent: "Отправлено",
  delivered: "Доставлено",
  failed: "Не отправлено",
}

export function MessageList({ messages, onRetry }: MessageListProps) {
  const listRef = useRef<HTMLOListElement>(null)
  const lastMessageId = messages.at(-1)?.id

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [lastMessageId])

  if (messages.length === 0) {
    return <p className="empty-message">Сообщений пока нет.</p>
  }

  return (
    <ol ref={listRef} className="message-list" aria-live="polite">
      {messages.map((message) => (
        <li
          key={message.id}
          data-author={message.author}
          data-status={message.status}
        >
          <article>
            <header>
              <strong>{authorLabels[message.author]}</strong>
              <time dateTime={message.createdAt}>
                {new Date(message.createdAt).toLocaleTimeString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </header>
            <p>{message.text}</p>
            {message.author === "user" && (
              <footer>
                <span>{statusLabels[message.status]}</span>
                {(message.status === "pending" ||
                  message.status === "failed") && (
                  <button
                    className="retro-button"
                    type="button"
                    onClick={() => onRetry(message.clientId)}
                  >
                    Повторить
                  </button>
                )}
              </footer>
            )}
          </article>
        </li>
      ))}
    </ol>
  )
}
