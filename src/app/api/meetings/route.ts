import { getMeetings } from "@/shared/api/meetings"

export async function GET() {
  const meetings = await getMeetings()

  return Response.json(meetings)
}
