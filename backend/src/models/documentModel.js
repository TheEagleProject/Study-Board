const db = require('../config/db');

/**
 * Yjs documents are stored as binary CRDT state snapshots. Loading this
 * blob into a fresh Y.Doc reconstructs the full document instantly and
 * deterministically -- there's no separate "replay all edits" step needed,
 * which is one of the reasons CRDTs are the industry-standard approach
 * for collaborative editors (Google Docs, Figma, Notion all use this class
 * of algorithm).
 */
async function loadDocState(roomId) {
  const { rows } = await db.query(
    `SELECT y_doc_state AS "state" FROM room_documents WHERE room_id = $1`,
    [roomId]
  );
  return rows[0]?.state || null;
}

async function saveDocState(roomId, stateBuffer) {
  await db.query(
    `INSERT INTO room_documents (room_id, y_doc_state, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (room_id)
     DO UPDATE SET y_doc_state = $2, updated_at = now()`,
    [roomId, stateBuffer]
  );
}

module.exports = { loadDocState, saveDocState };
