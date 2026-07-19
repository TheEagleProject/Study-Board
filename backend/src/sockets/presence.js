const redis = require('../config/redis');

const presenceKey = (roomId) => `presence:room:${roomId}`;

/**
 * Presence is stored in Redis (not just in-memory on one server process)
 * so that "who's online" stays correct even when the API is scaled to
 * multiple containers behind a load balancer -- a socket connected to
 * server A can still see presence updates caused by a socket on server B.
 */
async function addPresence(roomId, userId, displayName) {
  await redis.hset(presenceKey(roomId), userId, JSON.stringify({ userId, displayName }));
}

async function removePresence(roomId, userId) {
  await redis.hdel(presenceKey(roomId), userId);
}

async function listPresence(roomId) {
  const entries = await redis.hgetall(presenceKey(roomId));
  return Object.values(entries).map((v) => JSON.parse(v));
}

module.exports = { addPresence, removePresence, listPresence };
