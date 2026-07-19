const { z } = require('zod');

const createRoomSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

const joinRoomSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(8, 'Invite code must be 8 characters'),
});

const roomIdParamSchema = z.object({
  roomId: z.string().uuid('Invalid room ID'),
});

const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

module.exports = {
  createRoomSchema,
  joinRoomSchema,
  roomIdParamSchema,
  sendMessageSchema,
};
