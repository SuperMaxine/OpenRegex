import { WORKER_INFO } from './engines/index.js';

export async function registerEngines(redisClient) {
  await redisClient.hset(
    "openregex:workers",
    WORKER_INFO.worker_name,
    JSON.stringify(WORKER_INFO)
  );
  console.log(`[Worker] Registered '${WORKER_INFO.worker_name}' with ${WORKER_INFO.engines.length} engine(s).`);
}