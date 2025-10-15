// shared/redis/redisClient.js
const { createClient } = require('redis');
let client;

async function init(url){
  client = createClient({ url });
  client.on('error', e => console.error('Redis error', e));
  await client.connect();
  console.log("✅ Redis connected");
  return client;
}

function getClient() { 
  if (!client) throw new Error('Redis client not initialized!');
  return client;
}

module.exports = { init, getClient };
