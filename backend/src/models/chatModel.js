const db = require('../config/db');

async function saveMessage({ roomId, userId, body }) {
  const { rows } = await db.query(
    `INSERT INTO chat_messages (room_id, user_id, body)
     VALUES ($1, $2, $3)
     RETURNING id, room_id AS "roomId", user_id AS "userId", body, created_at AS "createdAt"`,
    [roomId, userId, body]
  );
  return rows[0];
}

async function getRecentMessages(roomId, limit = 50) {
  const { rows } = await db.query(
    `SELECT cm.id, cm.body, cm.created_at AS "createdAt",
            cm.user_id AS "userId", u.display_name AS "displayName"
     FROM chat_messages cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.room_id = $1
     ORDER BY cm.created_at DESC
     LIMIT $2`,
    [roomId, limit]
  );
  return rows.reverse(); // chronological order for the client
}

module.exports = { saveMessage, getRecentMessages };
