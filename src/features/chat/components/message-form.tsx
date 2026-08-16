"use client"

import { useState } from "react"
import { RetroButton } from "@/shared/ui/retro"
import type { SubmitEvent } from "react"

type MessageFormProps = {
  onSend: (text: string) => void
  disabled?: boolean
}

export function MessageForm({ onSend, disabled = false }: MessageFormProps) {
  const [message, setMessage] = useState("")

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!message.trim()) {
      return
    }

    onSend(message)
    setMessage("")
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-[0.65rem] border-t border-metal bg-gradient-to-b from-[#151a13] to-[#0a0d09] p-3 max-sm:grid-cols-1 max-sm:items-stretch"
    >
      <label
        htmlFor="chat-message"
        className="self-center text-[0.72rem] uppercase tracking-[0.07em] text-amber"
      >
        Сообщение
      </label>
      <textarea
        id="chat-message"
        name="message"
        disabled={disabled}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            event.currentTarget.form?.requestSubmit()
          }
        }}
        rows={3}
        className="min-h-16 w-full resize-y border border-[#3d6542] bg-screen p-[0.65rem] text-green caret-green shadow-[inset_0_0_1rem_#000] outline-none [text-shadow:0_0_6px_rgba(114,247,126,0.35)] focus:border-green focus-visible:outline focus-visible:outline-1 focus-visible:outline-green focus-visible:outline-offset-2"
      />
      <RetroButton type="submit" disabled={disabled || !message.trim()}>
        Отправить
      </RetroButton>
    </form>
  )
}
