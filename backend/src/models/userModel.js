const db = require('../config/db');

const PUBLIC_COLUMNS = 'id, email, display_name AS "displayName", created_at AS "createdAt"';

async function createUser({ email, displayName, passwordHash }) {
  const { rows } = await db.query(
    `INSERT INTO users (email, display_name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${PUBLIC_COLUMNS}`,
    [email, displayName, passwordHash]
  );
  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

module.exports = { createUser, findByEmail, findById };
