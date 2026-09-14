"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo, type ReactNode } from "react";

const configuredUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export const isConvexConfigured = Boolean(configuredUrl);

export function resolveConvexUrl(): string | null {
  if (!configuredUrl) return null;
  if (typeof window === "undefined") return configuredUrl;
  const pageHost = window.location.hostname;
  if (pageHost === "localhost" || pageHost === "127.0.0.1") return configuredUrl;
  try {
    const url = new URL(configuredUrl);
    url.hostname = pageHost;
    return url.toString().replace(/\/$/, "");
  } catch {
    return configuredUrl;
  }
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    const url = resolveConvexUrl();
    if (!url) return null;
    return new ConvexReactClient(url);
  }, []);

  if (!client) return children;
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
