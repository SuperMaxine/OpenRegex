using System;
using StackExchange.Redis;
using OpenRegex.Worker;

var redisUrl = Environment.GetEnvironmentVariable("REDIS_URL") ?? "redis://redis:6379";
if (redisUrl.StartsWith("redis://"))
{
    redisUrl = redisUrl.Substring(8);
}

var redis = await ConnectionMultiplexer.ConnectAsync(redisUrl);
var db = redis.GetDatabase();
var pubSub = redis.GetSubscriber();

await Registry.RegisterEnginesAsync(db);
await Processor.ListenAndProcessAsync(db, pubSub);