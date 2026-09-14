"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo, type ReactNode } from "react";

const configuredUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export const isConvexConfigured = Boolean(configuredUrl);

/** True when Convex is reached via local/LAN (phone testing with lan-proxy). */
function isLocalConvexHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  // RFC1918 private ranges used when phones hit the same Wi‑Fi as `npm run dev:phone`
  if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)) return true;
  return false;
}

/**
 * On a phone over LAN, rewrite localhost Convex URLs to the page host so traffic
 * goes through the LAN proxy. Never rewrite cloud deployments (*.convex.cloud).
 */
export function resolveConvexUrl(): string | null {
  if (!configuredUrl) return null;
  if (typeof window === "undefined") return configuredUrl;
  try {
    const configured = new URL(configuredUrl);
    if (!isLocalConvexHost(configured.hostname)) return configuredUrl;

    const pageHost = window.location.hostname;
    if (pageHost === "localhost" || pageHost === "127.0.0.1") return configuredUrl;
    if (!isLocalConvexHost(pageHost)) return configuredUrl;

    configured.hostname = pageHost;
    return configured.toString().replace(/\/$/, "");
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
