const express = require('express');
const roomModel = require('../models/roomModel');
const chatModel = require('../models/chatModel');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const {
  createRoomSchema,
  joinRoomSchema,
  roomIdParamSchema,
} = require('../validators/roomValidators');

const router = express.Router();

router.use(requireAuth); // every room route requires a logged-in user

router.post(
  '/',
  validate(createRoomSchema),
  asyncHandler(async (req, res) => {
    const room = await roomModel.createRoom({ name: req.body.name, ownerId: req.user.id });
    res.status(201).json({ success: true, data: { room } });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rooms = await roomModel.listForUser(req.user.id);
    res.json({ success: true, data: { rooms } });
  })
);

router.post(
  '/join',
  validate(joinRoomSchema),
  asyncHandler(async (req, res) => {
    const room = await roomModel.findByInviteCode(req.body.inviteCode);
    if (!room) throw new NotFoundError('No room found with that invite code');

    await roomModel.addMember(room.id, req.user.id);
    res.json({ success: true, data: { room } });
  })
);

// Middleware specific to this router: confirm the user is actually a member
// of the room before exposing any room-scoped data. This is the key
// authorization check that prevents any authenticated user from reading
// another room's chat/members just by guessing a UUID.
async function requireRoomMembership(req, res, next) {
  try {
    const { roomId } = roomIdParamSchema.parse(req.params);
    const member = await roomModel.isMember(roomId, req.user.id);
    if (!member) throw new ForbiddenError('You are not a member of this room');
    req.roomId = roomId;
    next();
  } catch (err) {
    next(err);
  }
}

router.get(
  '/:roomId',
  requireRoomMembership,
  asyncHandler(async (req, res) => {
    const room = await roomModel.findById(req.roomId);
    if (!room) throw new NotFoundError('Room not found');
    res.json({ success: true, data: { room } });
  })
);

router.get(
  '/:roomId/members',
  requireRoomMembership,
  asyncHandler(async (req, res) => {
    const members = await roomModel.listMembers(req.roomId);
    res.json({ success: true, data: { members } });
  })
);

router.get(
  '/:roomId/messages',
  requireRoomMembership,
  asyncHandler(async (req, res) => {
    const messages = await chatModel.getRecentMessages(req.roomId);
    res.json({ success: true, data: { messages } });
  })
);

module.exports = router;
