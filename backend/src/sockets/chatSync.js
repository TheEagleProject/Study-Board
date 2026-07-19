const chatModel = require('../models/chatModel');
const roomModel = require('../models/roomModel');
const { sendMessageSchema } = require('../validators/roomValidators');

function registerChatHandlers(io, socket) {
  socket.on('chat:send', async ({ roomId, body }, callback) => {
    try {
      const parsed = sendMessageSchema.safeParse({ body });
      if (!parsed.success) {
        return callback?.({ ok: false, error: 'Message must be 1-2000 characters' });
      }

      const isMember = await roomModel.isMember(roomId, socket.userId);
      if (!isMember) {
        return callback?.({ ok: false, error: 'Not a member of this room' });
      }

      const message = await chatModel.saveMessage({
        roomId,
        userId: socket.userId,
        body: parsed.data.body,
      });

      io.to(roomId).emit('chat:message', {
        ...message,
        displayName: socket.displayName,
      });
      callback?.({ ok: true });
    } catch (err) {
      callback?.({ ok: false, error: 'Failed to send message' });
    }
  });
}

module.exports = { registerChatHandlers };
