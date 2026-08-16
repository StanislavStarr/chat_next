import type { MeetingsResponse } from "../model/types"

export async function fetchMeetings(): Promise<MeetingsResponse> {
  const response = await fetch("/api/meetings")

  return response.json()
}
