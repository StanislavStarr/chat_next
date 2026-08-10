import type { MeetingsResponse } from "../model/types"

export async function fetchMeetings(): Promise<MeetingsResponse> {
  const response = await fetch("/api/meetings")

  if (!response.ok) {
    throw new Error("Не удалось загрузить встречи")
  }

  return response.json()
}
