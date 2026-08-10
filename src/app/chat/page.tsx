import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"

import { Chat } from "@/features/chat/components/chat"
import { MeetingsList } from "@/features/meetings/components/meetings-list"
import { meetingsQueryKey } from "@/features/meetings/model/queries"
import { getMeetings } from "@/shared/api/meetings"

export default async function ChatPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: meetingsQueryKey,
    queryFn: getMeetings,
  })

  return (
    <main className="chat-page">
      <h1>Чат с консультантом</h1>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <MeetingsList />
      </HydrationBoundary>
      <Chat />
    </main>
  )
}
