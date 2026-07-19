const { verifyAccessToken } = require('../utils/tokenService');
const roomModel = require('../models/roomModel');
const userModel = require('../models/userModel');

/**
 * Every socket connection must present a valid access token, exactly like
 * an HTTP request would. Unauthenticated sockets are rejected at the
 * handshake so no unauthenticated client ever reaches an event handler.
 */
function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const payload = verifyAccessToken(token);
    socket.userId = payload.sub;
    socket.userEmail = payload.email;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
}

/**
 * Per-room authorization: re-checks membership on every "join-room" event
 * rather than trusting client-supplied room IDs, since socket rooms have
 * no built-in access control of their own.
 */
async function assertRoomMembership(socket, roomId) {
  const isMember = await roomModel.isMember(roomId, socket.userId);
  if (!isMember) {
    throw new Error('Not authorized to join this room');
  }
}

async function getSocketUser(socket) {
  return userModel.findById(socket.userId);
}

module.exports = { socketAuthMiddleware, assertRoomMembership, getSocketUser };
