"use client"

import { useState, type FormEvent } from "react"

type MessageFormProps = {
  onSend: (text: string) => void
}

export function MessageForm({ onSend }: MessageFormProps) {
  const [message, setMessage] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!message.trim()) {
      return
    }

    onSend(message)
    setMessage("")
  }

  return (
    <form className="message-form" onSubmit={handleSubmit}>
      <label htmlFor="chat-message">Сообщение</label>
      <textarea
        id="chat-message"
        name="message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            event.currentTarget.form?.requestSubmit()
          }
        }}
        rows={3}
      />
      <button
        className="retro-button"
        type="submit"
        disabled={!message.trim()}
      >
        Отправить
      </button>
    </form>
  )
}
