package main

import (
	"context"
	"log"
	"os"

	"github.com/redis/go-redis/v9"
)

func main() {
	redisUrl := os.Getenv("REDIS_URL")
	if redisUrl == "" {
		redisUrl = "redis://redis:6379"
	}

	opts, err := redis.ParseURL(redisUrl)
	if err != nil {
		log.Fatalf("Failed to parse REDIS_URL: %v", err)
	}

	client := redis.NewClient(opts)

	ctx := context.Background()

	if err := registerEngines(ctx, client); err != nil {
		log.Fatalf("Failed to register engines: %v", err)
	}

	listenAndProcess(client)
}