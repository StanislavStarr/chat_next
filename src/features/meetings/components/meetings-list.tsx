"use client"

import { useQuery } from "@tanstack/react-query"
import { cx } from "@/shared/lib/cx"
import {
  RetroButton,
  RetroPanel,
  RetroPanelHeader,
  RetroPanelHeading,
  retroScreenClassName,
} from "@/shared/ui/retro"
import { fetchMeetings } from "../api/get-meetings"
import { meetingsQueryKey } from "../model/queries"
import type { Meeting, MeetingStatus } from "../model/types"

type MeetingsListProps = {
  selectedMeetingId: string | null
  onSelectMeeting: (meeting: Meeting) => void
}

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

export function MeetingsList({
  selectedMeetingId,
  onSelectMeeting,
}: MeetingsListProps) {
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
    <RetroPanel ariaLabelledBy="meetings-title" className="overflow-y-auto">
      <RetroPanelHeader>
        <RetroPanelHeading id="meetings-title">Встречи</RetroPanelHeading>
        <RetroButton onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Обновление..." : "Обновить"}
        </RetroButton>
      </RetroPanelHeader>

      {isError && (
        <p
          role="alert"
          className={cx(
            retroScreenClassName,
            "m-3 border-[#6f3931] p-4 text-[0.8rem] text-danger [text-shadow:0_0_7px_rgba(255,112,95,0.35)]",
          )}
        >
          {error instanceof Error
            ? error.message
            : "Не удалось загрузить встречи"}
        </p>
      )}

      {meetings.length === 0 ? (
        <p
          className={cx(
            retroScreenClassName,
            "m-3 border-[#334a36] p-4 text-[0.8rem] text-green-muted",
          )}
        >
          Встреч пока нет.
        </p>
      ) : (
        <ul className="p-2">
          {meetings.map((meeting) => {
            const isSelected = meeting.id === selectedMeetingId
            const borderLeftClass = isSelected
              ? "border-l-green"
              : meeting.status === "cancelled"
                ? "border-l-danger"
                : meeting.status === "completed"
                  ? "border-l-[#67715f]"
                  : "border-l-green-muted"

            return (
              <li
                key={meeting.id}
                className={cx(
                  "mb-[0.45rem] border border-l-[3px] bg-screen shadow-[inset_0_0_1rem_rgba(34,255,76,0.035)] last:mb-0",
                  isSelected
                    ? "border-green shadow-[inset_0_0_1.2rem_rgba(34,255,76,0.08),0_0_0.6rem_rgba(114,247,126,0.18)]"
                    : "border-[#2f4933]",
                  borderLeftClass,
                )}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectMeeting(meeting)}
                  className="block w-full border-0 bg-transparent p-[0.7rem] text-left text-inherit hover:bg-[rgba(114,247,126,0.05)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-green focus-visible:outline-offset-2"
                >
                  <span className="mb-[0.45rem] block text-[0.83rem] font-medium leading-[1.35] text-green">
                    {meeting.title}
                  </span>
                  <time
                    dateTime={meeting.date}
                    className="mt-[0.2rem] block text-[0.72rem] text-green-muted"
                  >
                    {dateFormatter.format(new Date(meeting.date))}
                  </time>
                  <span
                    className={cx(
                      "mt-[0.2rem] block text-[0.72rem]",
                      meeting.status === "cancelled"
                        ? "text-danger"
                        : "text-green-muted",
                    )}
                  >
                    {statusLabels[meeting.status]}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </RetroPanel>
  )
}
