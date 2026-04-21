package com.openregex;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openregex.engines.Engines;
import redis.clients.jedis.Jedis;

public class Registry {
    private static final ObjectMapper mapper = new ObjectMapper();

    public static void registerEngines(Jedis jedis) throws Exception {
        jedis.hset(
                "openregex:workers",
                Engines.WORKER_INFO.worker_name(),
                mapper.writeValueAsString(Engines.WORKER_INFO)
        );
        System.out.printf("[Worker] Registered '%s' with %d engines.%n",
                Engines.WORKER_INFO.worker_name(),
                Engines.WORKER_INFO.engines().size()
        );
    }
}