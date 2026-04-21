package com.openregex;

import redis.clients.jedis.Jedis;

public class WorkerRunner {
    public static void main(String[] args) {
        String redisUrl = System.getenv("REDIS_URL");
        if (redisUrl == null || redisUrl.isEmpty()) {
            redisUrl = "redis://redis:6379";
        }

        try (Jedis jedis = new Jedis(redisUrl)) {
            Registry.registerEngines(jedis);
        } catch (Exception e) {
            System.err.println("Failed to register engines: " + e.getMessage());
        }

        Processor.listenAndProcess(redisUrl);
    }
}