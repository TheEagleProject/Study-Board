const { socketAuthMiddleware, assertRoomMembership, getSocketUser } = require('./socketAuth');
const { addPresence, removePresence, listPresence } = require('./presence');
const { registerDocHandlers, releaseDoc } = require('./docSync');
const { registerChatHandlers } = require('./chatSync');
const { registerTimerHandlers } = require('./timerSync');
const logger = require('../config/logger');

// Track which rooms each socket has joined so we can clean up presence
// correctly on disconnect (a client can be in exactly one study room's
// socket.io room at a time in this app's design).
function initSockets(io) {
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    const user = await getSocketUser(socket);
    socket.displayName = user?.displayName || 'Unknown';
    socket.currentRoomId = null;

    logger.info('Socket connected', { userId: socket.userId, socketId: socket.id });

    socket.on('room:join', async ({ roomId }, callback) => {
      try {
        await assertRoomMembership(socket, roomId);

        // Enforce one active study room per connection to keep presence
        // and doc-collaboration state simple and unambiguous.
        if (socket.currentRoomId) {
          socket.leave(socket.currentRoomId);
          await removePresence(socket.currentRoomId, socket.userId);
          releaseDoc(socket.currentRoomId);
          socket.to(socket.currentRoomId).emit('presence:left', { userId: socket.userId });
        }

        socket.join(roomId);
        socket.currentRoomId = roomId;

        await addPresence(roomId, socket.userId, socket.displayName);
        const presenceList = await listPresence(roomId);

        socket.to(roomId).emit('presence:joined', {
          userId: socket.userId,
          displayName: socket.displayName,
        });

        callback?.({ ok: true, presence: presenceList });
      } catch (err) {
        callback?.({ ok: false, error: err.message || 'Failed to join room' });
      }
    });

    socket.on('room:leave', async () => {
      if (!socket.currentRoomId) return;
      const roomId = socket.currentRoomId;
      socket.leave(roomId);
      await removePresence(roomId, socket.userId);
      releaseDoc(roomId);
      socket.to(roomId).emit('presence:left', { userId: socket.userId });
      socket.currentRoomId = null;
    });

    registerDocHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerTimerHandlers(io, socket);

    socket.on('disconnect', async () => {
      logger.info('Socket disconnected', { userId: socket.userId, socketId: socket.id });
      if (socket.currentRoomId) {
        await removePresence(socket.currentRoomId, socket.userId);
        releaseDoc(socket.currentRoomId);
        socket.to(socket.currentRoomId).emit('presence:left', { userId: socket.userId });
      }
    });
  });
}

module.exports = initSockets;
