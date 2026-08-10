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
  const label =
    status === "connected" && isTyping ? "Печатает..." : statusLabels[status]

  return (
    <div
      className="connection-status"
      data-status={isTyping ? "typing" : status}
      role="status"
    >
      <span>{label}</span>
      {status === "disconnected" && (
        <button className="retro-button" type="button" onClick={onReconnect}>
          Переподключиться
        </button>
      )}
    </div>
  )
}
