import { cx } from "@/shared/lib/cx"
import { RetroButton } from "@/shared/ui/retro"
import type { ConnectionStatus as ConnectionStatusValue } from "../model/types"

type ConnectionStatusProps = {
  status: ConnectionStatusValue
  isTyping: boolean
  onReconnect: () => void
}

const statusLabels: Record<ConnectionStatusValue, string> = {
  connecting: "Подключение...",
  connected: "На связи",
  disconnected: "Нет связи",
}

export function ConnectionStatus({
  status,
  isTyping,
  onReconnect,
}: ConnectionStatusProps) {
  const displayStatus = isTyping ? "typing" : status
  const label = isTyping ? "Печатает..." : statusLabels[status]
  const colorClass =
    displayStatus === "connected"
      ? "text-green"
      : displayStatus === "disconnected"
        ? "text-danger [text-shadow:0_0_7px_rgba(255,112,95,0.35)]"
        : "text-amber"

  return (
    <div
      role="status"
      data-status={displayStatus}
      className={cx(
        "flex items-center gap-[0.65rem] text-[0.72rem] uppercase max-sm:justify-between",
        colorClass,
      )}
    >
      <span>{label}</span>
      {status === "disconnected" && (
        <RetroButton onClick={onReconnect}>Переподключиться</RetroButton>
      )}
    </div>
  )
}
