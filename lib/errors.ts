import { ConvexError } from "convex/values";

export function convexMessage(e: unknown): string {
  if (e instanceof ConvexError) return String(e.data);
  if (e instanceof Error) {
    return e.message
      .replace(/^\[CONVEX[^\]]*\]\s*/i, "")
      .replace(/^Uncaught (Error|ConvexError):\s*/i, "")
      .trim();
  }
  return "Something went wrong";
}
