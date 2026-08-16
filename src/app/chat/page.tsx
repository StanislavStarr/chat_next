import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"

import { ChatWorkspace } from "@/features/chat/components/chat-workspace"
import { meetingsQueryKey } from "@/features/meetings/model/queries"
import { getMeetings } from "@/server/meetings"

export default async function ChatPage() {
  const queryClient = new QueryClient()
  const meetings = await getMeetings()

  queryClient.setQueryData(meetingsQueryKey, meetings)

  return (
    <main className="mx-auto flex min-h-dvh w-[min(100%-1rem,42rem)] flex-col gap-3 py-2 md:grid md:h-dvh md:w-[min(100%-2rem,82rem)] md:grid-cols-[minmax(16rem,0.7fr)_minmax(0,1.6fr)] md:grid-rows-[auto_minmax(0,1fr)] md:overflow-hidden md:py-4">
      <h1 className="m-0 border border-metal bg-gradient-to-b from-panel-light to-[#0b0e0a] px-4 py-3 text-[clamp(1rem,2vw,1.35rem)] font-medium uppercase tracking-[0.12em] text-amber shadow-[inset_0_1px_#727968,inset_0_-2px_#050705,0_0_1.5rem_rgba(0,0,0,0.8)] outline outline-2 outline-[#0a0c09] [text-shadow:0_0_8px_rgba(213,189,108,0.35)] md:col-span-full">
        Чат с консультантом
      </h1>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ChatWorkspace initialMeeting={meetings[0] ?? null} />
      </HydrationBoundary>
    </main>
  )
}
