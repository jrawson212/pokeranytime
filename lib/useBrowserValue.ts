"use client";

import { useSyncExternalStore } from "react";

function noopSubscribe() {
  return () => {};
}

export function useBrowserValue<T>(getSnapshot: () => T, serverSnapshot: T): T {
  return useSyncExternalStore(noopSubscribe, getSnapshot, () => serverSnapshot);
}
