import Room from "./Room";

// In Next.js 15+ App Router, params is a Promise
export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <Room roomId={roomId.toUpperCase()} />;
}
