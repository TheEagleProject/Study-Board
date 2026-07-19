const crypto = require('crypto');
const db = require('../config/db');

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity

function generateInviteCode(length = 8) {
  return Array.from(
    { length },
    () => INVITE_CODE_ALPHABET[crypto.randomInt(0, INVITE_CODE_ALPHABET.length)]
  ).join('');
}

async function createRoom({ name, ownerId }) {
  return db.withTransaction(async (client) => {
    // Retry on the (astronomically rare) invite-code collision.
    let room;
    for (let attempt = 0; attempt < 5 && !room; attempt += 1) {
      try {
        const inviteCode = generateInviteCode();
        const { rows } = await client.query(
          `INSERT INTO rooms (name, invite_code, owner_id)
           VALUES ($1, $2, $3)
           RETURNING id, name, invite_code AS "inviteCode", owner_id AS "ownerId", created_at AS "createdAt"`,
          [name, inviteCode, ownerId]
        );
        [room] = rows;
      } catch (err) {
        if (err.code !== '23505') throw err; // not a unique-violation, rethrow
      }
    }
    if (!room) throw new Error('Failed to generate a unique invite code, please retry');

    await client.query(
      `INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [room.id, ownerId]
    );

    await client.query(
      `INSERT INTO timer_sessions (room_id) VALUES ($1)`,
      [room.id]
    );

    return room;
  });
}

async function findByInviteCode(inviteCode) {
  const { rows } = await db.query(
    `SELECT id, name, invite_code AS "inviteCode", owner_id AS "ownerId"
     FROM rooms WHERE invite_code = $1`,
    [inviteCode]
  );
  return rows[0] || null;
}

async function findById(roomId) {
  const { rows } = await db.query(
    `SELECT id, name, invite_code AS "inviteCode", owner_id AS "ownerId"
     FROM rooms WHERE id = $1`,
    [roomId]
  );
  return rows[0] || null;
}

async function isMember(roomId, userId) {
  const { rows } = await db.query(
    `SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2`,
    [roomId, userId]
  );
  return rows.length > 0;
}

async function addMember(roomId, userId) {
  await db.query(
    `INSERT INTO room_members (room_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (room_id, user_id) DO NOTHING`,
    [roomId, userId]
  );
}

async function listMembers(roomId) {
  const { rows } = await db.query(
    `SELECT u.id, u.display_name AS "displayName", rm.role, rm.joined_at AS "joinedAt"
     FROM room_members rm
     JOIN users u ON u.id = rm.user_id
     WHERE rm.room_id = $1
     ORDER BY rm.joined_at ASC`,
    [roomId]
  );
  return rows;
}

async function listForUser(userId) {
  const { rows } = await db.query(
    `SELECT r.id, r.name, r.invite_code AS "inviteCode", rm.role
     FROM rooms r
     JOIN room_members rm ON rm.room_id = r.id
     WHERE rm.user_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );
  return rows;
}

module.exports = {
  createRoom,
  findByInviteCode,
  findById,
  isMember,
  addMember,
  listMembers,
  listForUser,
};
