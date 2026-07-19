const Y = require('yjs');
const documentModel = require('../models/documentModel');
const logger = require('../config/logger');

// In-memory registry of "live" Yjs documents for rooms that currently have
// at least one connected client. Kept in memory (not reloaded from Postgres
// on every edit) because Yjs updates are designed to be applied to a live
// in-process document -- persistence is a periodic snapshot, not the
// source of truth for every keystroke.
const liveDocs = new Map(); // roomId -> { doc: Y.Doc, refCount: number, saveTimer: Timeout }

const PERSIST_DEBOUNCE_MS = 3000;

async function getOrCreateDoc(roomId) {
  if (liveDocs.has(roomId)) {
    const entry = liveDocs.get(roomId);
    entry.refCount += 1;
    return entry.doc;
  }

  const doc = new Y.Doc();
  const savedState = await documentModel.loadDocState(roomId);
  if (savedState) {
    Y.applyUpdate(doc, new Uint8Array(savedState));
  }

  liveDocs.set(roomId, { doc, refCount: 1, saveTimer: null });
  return doc;
}

function schedulePersist(roomId) {
  const entry = liveDocs.get(roomId);
  if (!entry) return;

  // Debounce so a burst of keystrokes results in one DB write, not one
  // write per keystroke.
  if (entry.saveTimer) clearTimeout(entry.saveTimer);

  entry.saveTimer = setTimeout(async () => {
    try {
      const update = Y.encodeStateAsUpdate(entry.doc);
      await documentModel.saveDocState(roomId, Buffer.from(update));
    } catch (err) {
      logger.error('Failed to persist document state', { roomId, error: err.message });
    }
  }, PERSIST_DEBOUNCE_MS);
}

function releaseDoc(roomId) {
  const entry = liveDocs.get(roomId);
  if (!entry) return;

  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    // Final synchronous-ish save on last-client-leaves, then free memory.
    Y.encodeStateAsUpdate(entry.doc);
    schedulePersist(roomId);
    setTimeout(() => {
      // give the debounced save a chance to complete before dropping the doc
      if (liveDocs.get(roomId)?.refCount <= 0) {
        liveDocs.delete(roomId);
      }
    }, PERSIST_DEBOUNCE_MS + 500);
  }
}

function registerDocHandlers(io, socket) {
  socket.on('doc:sync-request', async ({ roomId }, callback) => {
    try {
      const doc = await getOrCreateDoc(roomId);
      const state = Y.encodeStateAsUpdate(doc);
      callback({ ok: true, state: Array.from(state) });
    } catch (err) {
      callback({ ok: false, error: 'Failed to sync document' });
    }
  });

  socket.on('doc:update', async ({ roomId, update }) => {
    if (!socket.rooms.has(roomId)) return; // must have joined via join-room first
    const entry = liveDocs.get(roomId);
    if (!entry) return;

    try {
      Y.applyUpdate(entry.doc, new Uint8Array(update));
      // Broadcast the raw update to everyone else -- each client applies
      // it to their own local Y.Doc, which is what makes this conflict-free
      // regardless of network order or timing.
      socket.to(roomId).emit('doc:update', { update });
      schedulePersist(roomId);
    } catch (err) {
      logger.warn('Rejected malformed doc update', { roomId, error: err.message });
    }
  });
}

module.exports = { getOrCreateDoc, releaseDoc, registerDocHandlers };
