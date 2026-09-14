"use client";

import { useEffect, useRef } from "react";

export function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => onDismissRef.current(), 10_000);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message) return null;
  return (
    <button
      type="button"
      onClick={onDismiss}
      className="w-full shrink-0 rounded-xl px-4 py-3 text-center text-sm font-semibold text-white"
      style={{ backgroundColor: "var(--danger)" }}
    >
      {message}
    </button>
  );
}
