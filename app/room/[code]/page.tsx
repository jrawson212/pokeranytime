import { Suspense } from "react";
import { RoomClient } from "./room-client";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <Suspense fallback={<div className="min-h-dvh felt-bg" />}>
      <RoomClient code={code.toUpperCase()} />
    </Suspense>
  );
}
