# Poker Anytime

Virtual chips for a real deck of cards. One person creates a room code; everyone else joins on their phone. The pot lives on the top half of the screen, your stack on the bottom. Cards stay in your hands.

## Run it

```bash
npm install
npx convex dev
```

Sign in with a free Convex account when asked. Leave that terminal running.

In a second terminal:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Phone (Expo Go)

Keep Convex and Next running. In two more terminals:

```bash
npm run dev:phone
npm run expo
```

Scan the QR with **Expo Go** (same Wi-Fi as this computer). The app loads the local site inside Expo. If the QR is missing, open Expo Go → Enter URL → `exp://YOUR_LAN_IP:8081`. You can also skip Expo and open `http://YOUR_LAN_IP:3000` in Safari.

## Deploy

Host the Next.js app on Vercel. Run `npx convex deploy` and set `NEXT_PUBLIC_CONVEX_URL` to your Convex production URL.
