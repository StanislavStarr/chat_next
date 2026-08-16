"use client"

import { useEffect, useRef } from "react"
import { cx } from "@/shared/lib/cx"
import { RetroButton, retroScreenClassName } from "@/shared/ui/retro"

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
    return (
      <p
        className={cx(
          retroScreenClassName,
          "m-3 border-[#334a36] p-4 text-[0.8rem] text-green-muted",
        )}
      >
        Сообщений пока нет.
      </p>
    )
  }

  return (
    <ol
      ref={listRef}
      aria-live="polite"
      className={cx(
        retroScreenClassName,
        "m-3 max-h-full overflow-y-auto overscroll-contain border-[#334a36] px-4 py-2",
        "[scroll-behavior:smooth] [scrollbar-color:var(--color-green-muted)_#080c08] [scrollbar-width:thin]",
      )}
    >
      {messages.map((message) => {
        const isUser = message.author === "user"
        const isUnresolved =
          message.status === "pending" || message.status === "failed"

        return (
          <li
            key={message.id}
            className={cx(
              "border-b border-dashed border-[#2c7435] py-3 last:border-b-0",
              isUser && "text-[#b6dba6]",
              isUnresolved && "text-amber",
            )}
          >
            <article>
              <header className="flex items-center justify-between gap-3">
                <strong className="text-[0.78rem] font-medium uppercase tracking-[0.08em]">
                  {authorLabels[message.author]}
                </strong>
                <time
                  dateTime={message.createdAt}
                  className="text-[0.68rem] text-green-muted"
                >
                  {new Date(message.createdAt).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </header>
              <p className="my-[0.45rem] whitespace-pre-wrap pl-4 leading-[1.45]">
                {message.text}
              </p>
              {isUser && (
                <footer className="flex items-center justify-between gap-3 text-[0.68rem] text-green-muted">
                  <span>{statusLabels[message.status]}</span>
                  {isUnresolved && (
                    <RetroButton onClick={() => onRetry(message.clientId)}>
                      Повторить
                    </RetroButton>
                  )}
                </footer>
              )}
            </article>
          </li>
        )
      })}
    </ol>
  )
}
