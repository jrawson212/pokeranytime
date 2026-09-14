import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobile = path.join(root, "mobile");

function lanIPv4() {
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) return addr.address;
    }
  }
  return null;
}

const ip = lanIPv4();
if (!ip) {
  console.error("No LAN IPv4 address found. Connect to Wi-Fi and retry.");
  process.exit(1);
}

const expoUrl = `exp://${ip}:8081`;
const siteUrl = `http://${ip}:3000`;

console.log("\nPoker Anytime — Expo Go");
console.log("Keep Convex, Next, and npm run dev:phone running.");
console.log(`Site:     ${siteUrl}`);
console.log(`Expo Go:  ${expoUrl}`);
console.log("Scan the QR, or in Expo Go tap Enter URL and paste the Expo Go line.\n");

const env = {
  ...process.env,
  TERM:
    process.env.TERM && process.env.TERM !== "dumb"
      ? process.env.TERM
      : "xterm-256color",
  REACT_NATIVE_PACKAGER_HOSTNAME: ip,
  EXPO_PUBLIC_SITE_URL: siteUrl,
  EXPO_NO_TELEMETRY: "1",
};
delete env.CI;

const qr = spawn("npx", ["--yes", "qrcode-terminal"], {
  cwd: root,
  env,
  stdio: ["pipe", "inherit", "inherit"],
});
qr.stdin.write(expoUrl);
qr.stdin.end();

qr.on("close", () => {
  const extra = process.argv.slice(2);
  const expo = spawn("npx", ["expo", "start", "--lan", "--go", ...extra], {
    cwd: mobile,
    env,
    stdio: "inherit",
  });

  expo.on("exit", (code) => process.exit(code ?? 0));
});
