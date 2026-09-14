import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poker Anytime",
    short_name: "Poker Anytime",
    description: "Virtual chips for a real deck of cards",
    start_url: "/",
    display: "standalone",
    background_color: "#06291f",
    theme_color: "#0b3d2e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
