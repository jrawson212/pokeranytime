import net from "node:net";
import os from "node:os";

const ports = [3210, 3211];

function lanIPv4s() {
  const ips = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) ips.push(addr.address);
    }
  }
  return ips;
}

function proxy(listenHost, listenPort, destPort) {
  const server = net.createServer((client) => {
    const upstream = net.connect({ host: "127.0.0.1", port: destPort });
    client.pipe(upstream);
    upstream.pipe(client);
    const close = () => {
      client.destroy();
      upstream.destroy();
    };
    client.on("error", close);
    upstream.on("error", close);
    client.on("close", close);
    upstream.on("close", close);
  });
  server.on("error", (err) => {
    console.error(`Could not bind ${listenHost}:${listenPort}:`, err.message);
  });
  server.listen(listenPort, listenHost, () => {
    console.log(`Phone proxy ${listenHost}:${listenPort} -> 127.0.0.1:${destPort}`);
  });
}

const ips = lanIPv4s();
if (ips.length === 0) {
  console.error("No LAN IPv4 address found. Connect to Wi-Fi and retry.");
  process.exit(1);
}

for (const ip of ips) {
  for (const port of ports) {
    proxy(ip, port, port);
  }
}

console.log("Keep this running while testing on a phone.");
