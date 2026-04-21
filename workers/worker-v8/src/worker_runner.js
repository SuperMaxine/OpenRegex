import { Redis } from "ioredis";
import { registerEngines } from "./registry.js";
import { listenAndProcess } from "./processor.js";

async function main() {
  const redisUrl = process.env.REDIS_URL || "redis://redis:6379";
  const redisClient = new Redis(redisUrl);
  const pubClient = new Redis(redisUrl);

  await registerEngines(redisClient);
  await listenAndProcess(redisClient, pubClient);
}

main().catch(console.error);