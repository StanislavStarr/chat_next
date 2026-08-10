import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"

import { ChatWorkspace } from "@/features/chat/components/chat-workspace"
import { meetingsQueryKey } from "@/features/meetings/model/queries"
import { getMeetings } from "@/shared/api/meetings"

export default async function ChatPage() {
  const queryClient = new QueryClient()
  const meetings = await getMeetings()

  queryClient.setQueryData(meetingsQueryKey, meetings)

  return (
    <main className="chat-page">
      <h1>Чат с консультантом</h1>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ChatWorkspace initialMeeting={meetings[0] ?? null} />
      </HydrationBoundary>
    </main>
  )
}
