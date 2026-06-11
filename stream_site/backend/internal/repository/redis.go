package repository

import (
	"context"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

func NewRedis(url string) *redis.Client {
	opts, err := redis.ParseURL(url)
	if err != nil {
		log.Fatalf("failed to parse redis URL: %v", err)
	}
	opts.PoolSize = 100
	opts.MinIdleConns = 10
	opts.ReadTimeout = 3 * time.Second
	client := redis.NewClient(opts)
	if err := client.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("failed to connect to redis: %v", err)
	}
	log.Println("connected to redis")
	return client
}
