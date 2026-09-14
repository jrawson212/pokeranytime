import os from "node:os";
import type { NextConfig } from "next";

function lanHosts() {
  const hosts = ["127.0.0.1", "localhost"];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) hosts.push(addr.address);
    }
  }
  return hosts;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanHosts(),
  devIndicators: false,
};

export default nextConfig;
