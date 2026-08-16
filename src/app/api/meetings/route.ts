import { getMeetings } from "@/server/meetings"

export async function GET() {
  const meetings = await getMeetings()

  return Response.json(meetings)
}
