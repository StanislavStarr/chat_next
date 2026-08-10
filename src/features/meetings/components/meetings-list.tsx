"use client"

import { useQuery } from "@tanstack/react-query"

import { fetchMeetings } from "../api/get-meetings"
import { meetingsQueryKey } from "../model/queries"
import type { MeetingStatus } from "../model/types"

const statusLabels: Record<MeetingStatus, string> = {
  scheduled: "Запланирована",
  completed: "Завершена",
  cancelled: "Отменена",
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

export function MeetingsList() {
  const {
    data: meetings = [],
    error,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: meetingsQueryKey,
    queryFn: fetchMeetings,
  })

  return (
    <section className="meetings-panel" aria-labelledby="meetings-title">
      <header className="panel-header">
        <h2 id="meetings-title">Встречи</h2>
        <button
          className="retro-button"
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? "Обновление..." : "Обновить"}
        </button>
      </header>

      {isError && (
        <p className="error-message" role="alert">
          {error instanceof Error
            ? error.message
            : "Не удалось загрузить встречи"}
        </p>
      )}

      {meetings.length === 0 ? (
        <p className="empty-message">Встреч пока нет.</p>
      ) : (
        <ul className="meetings-list">
          {meetings.map((meeting) => (
            <li key={meeting.id} data-status={meeting.status}>
              <article>
                <h3>{meeting.title}</h3>
                <time dateTime={meeting.date}>
                  {dateFormatter.format(new Date(meeting.date))}
                </time>
                <p>{statusLabels[meeting.status]}</p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
