export type MeetingStatus = "scheduled" | "completed" | "cancelled"

export type Meeting = {
  id: string
  title: string
  date: string
  status: MeetingStatus
}

export type MeetingsResponse = Meeting[]
