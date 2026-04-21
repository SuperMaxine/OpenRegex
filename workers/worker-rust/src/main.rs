mod models;
mod processor;
mod registry;

use std::env;

#[tokio::main]
async fn main() -> redis::RedisResult<()> {
    let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://redis:6379".to_string());
    let client = redis::Client::open(redis_url)?;

    // Use multiplexed connection for simple registration
    let mut con = client.get_multiplexed_tokio_connection().await?;
    registry::register_engines(&mut con).await?;

    // Pass the client to the processor so it can spawn dedicated connections
    processor::listen_and_process(client).await;

    Ok(())
}