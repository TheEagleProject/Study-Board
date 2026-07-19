const db = require('../config/db');
const { ForbiddenError } = require('../utils/errors');
const roomModel = require('../models/roomModel');

const VALID_ACTIONS = new Set(['start', 'pause', 'reset']);
const MIN_DURATION = 60; // 1 minute
const MAX_DURATION = 90 * 60; // 90 minutes -- sanity cap against bad input

async function getTimerState(roomId) {
  const { rows } = await db.query(
    `SELECT status, phase, duration_secs AS "durationSecs",
            started_at AS "startedAt", updated_at AS "updatedAt"
     FROM timer_sessions WHERE room_id = $1`,
    [roomId]
  );
  return rows[0] || null;
}

async function updateTimerState(roomId, { status, phase, durationSecs, startedAt }) {
  const { rows } = await db.query(
    `UPDATE timer_sessions
     SET status = COALESCE($2, status),
         phase = COALESCE($3, phase),
         duration_secs = COALESCE($4, duration_secs),
         started_at = $5,
         updated_at = now()
     WHERE room_id = $1
     RETURNING status, phase, duration_secs AS "durationSecs", started_at AS "startedAt"`,
    [roomId, status, phase, durationSecs, startedAt]
  );
  return rows[0];
}

function registerTimerHandlers(io, socket) {
  socket.on('timer:action', async ({ roomId, action, durationSecs }, callback) => {
    try {
      if (!VALID_ACTIONS.has(action)) {
        return callback?.({ ok: false, error: 'Invalid timer action' });
      }

      const isMember = await roomModel.isMember(roomId, socket.userId);
      if (!isMember) throw new ForbiddenError('Not a member of this room');

      let clampedDuration;
      if (durationSecs !== undefined) {
        clampedDuration = Math.max(MIN_DURATION, Math.min(MAX_DURATION, Number(durationSecs) || 0));
      }

      const updates = {};
      if (action === 'start') {
        updates.status = 'running';
        updates.startedAt = new Date();
      } else if (action === 'pause') {
        updates.status = 'paused';
        updates.startedAt = null;
      } else if (action === 'reset') {
        updates.status = 'idle';
        updates.startedAt = null;
        if (clampedDuration) updates.durationSecs = clampedDuration;
      }

      const newState = await updateTimerState(roomId, updates);

      // Broadcast to everyone in the room (including the sender) so every
      // client's timer UI stays perfectly in sync.
      io.to(roomId).emit('timer:state', newState);
      callback?.({ ok: true, state: newState });
    } catch (err) {
      callback?.({ ok: false, error: err.message || 'Failed to update timer' });
    }
  });
}

module.exports = { registerTimerHandlers, getTimerState };
