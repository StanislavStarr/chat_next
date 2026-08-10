"use client"

import { useState } from "react"

import type { Meeting } from "@/features/meetings/model/types"
import { MeetingsList } from "@/features/meetings/components/meetings-list"

import { Chat } from "./chat"

type ChatWorkspaceProps = {
  initialMeeting: Meeting | null
}

export function ChatWorkspace({ initialMeeting }: ChatWorkspaceProps) {
  const [selectedMeeting, setSelectedMeeting] = useState(initialMeeting)

  return (
    <>
      <MeetingsList
        selectedMeetingId={selectedMeeting?.id ?? null}
        onSelectMeeting={setSelectedMeeting}
      />
      <Chat meeting={selectedMeeting} />
    </>
  )
}
