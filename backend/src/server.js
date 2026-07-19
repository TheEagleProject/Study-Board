const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');

const env = require('./config/env');
const logger = require('./config/logger');
const app = require('./app');
const initSockets = require('./sockets');
const { pool } = require('./config/db');
const redis = require('./config/redis');

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: env.CLIENT_ORIGIN, credentials: true },
  // Ping/pong tuning: detect dead connections (e.g. laptop lid closed)
  // within ~25s instead of the default, so presence data doesn't go stale.
  pingInterval: 10000,
  pingTimeout: 15000,
});

// The Redis adapter lets Socket.io broadcast events across multiple server
// instances -- without this, a message sent by a client connected to
// container A would never reach a client connected to container B, which
// breaks real-time sync the moment this app is horizontally scaled.
const pubClient = new Redis(env.REDIS_URL);
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));

initSockets(io);

const server = httpServer.listen(env.PORT, () => {
  logger.info(`🚀 StudyBoard API listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

// --- Graceful shutdown ---
// Ensures in-flight requests finish and DB/Redis connections close cleanly
// on container stop (SIGTERM), instead of dropping connections abruptly --
// important for zero-downtime deploys on ECS/Kubernetes.
async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);

  server.close(async () => {
    try {
      await io.close();
      await pool.end();
      redis.disconnect();
      pubClient.disconnect();
      subClient.disconnect();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }
  });

  // Force-exit if graceful shutdown hangs.
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: reason?.message || reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception - shutting down', { error: err.message, stack: err.stack });
  process.exit(1);
});

module.exports = { httpServer, io };
