"use client";

export function HomeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="End game and go home"
      className="absolute right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-cream ring-1 ring-white/25 touch-manipulation"
      style={{
        top: "calc(max(3rem, env(safe-area-inset-top, 0px), var(--app-safe-top)) + 0.35rem)",
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M10 21v-7h4v7" />
      </svg>
    </button>
  );
}
