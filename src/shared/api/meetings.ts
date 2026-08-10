import type { MeetingsResponse } from "@/features/meetings/model/types"

const meetings: MeetingsResponse = [
  {
    id: "meeting-1",
    title: "Знакомство с консультантом",
    date: "2026-08-10T10:00:00.000Z",
    status: "scheduled",
  },
  {
    id: "meeting-2",
    title: "Обсуждение целей",
    date: "2026-08-12T13:30:00.000Z",
    status: "scheduled",
  },
  {
    id: "meeting-3",
    title: "Промежуточная консультация",
    date: "2026-08-01T09:00:00.000Z",
    status: "completed",
  },
  {
    id: "meeting-4",
    title: "Разбор результатов",
    date: "2026-07-25T15:00:00.000Z",
    status: "completed",
  },
  {
    id: "meeting-5",
    title: "Дополнительная встреча",
    date: "2026-08-05T11:00:00.000Z",
    status: "cancelled",
  },
]

export async function getMeetings(): Promise<MeetingsResponse> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  return meetings
}
