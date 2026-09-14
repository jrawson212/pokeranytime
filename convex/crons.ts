import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("expire old rooms", { hours: 1 }, internal.rooms.expireOld);

export default crons;
