"use client";

import { useMutation } from "convex/react";
import { LandingScreen } from "@/components/landing/LandingScreen";
import { isConvexConfigured } from "./ConvexClientProvider";
import { api } from "../convex/_generated/api";

export default function Home() {
  if (!isConvexConfigured) {
    return (
      <LandingScreen
        convexReady={false}
        onCreate={async () => {
          throw new Error("Run npx convex dev first");
        }}
        onJoin={async () => {
          throw new Error("Run npx convex dev first");
        }}
      />
    );
  }

  return <ReadyHome />;
}

function ReadyHome() {
  const create = useMutation(api.rooms.create);
  const join = useMutation(api.rooms.join);

  return (
    <LandingScreen
      convexReady
      onCreate={(input) => create(input)}
      onJoin={(input) => join(input)}
    />
  );
}
