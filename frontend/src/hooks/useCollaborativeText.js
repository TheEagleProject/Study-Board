import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';

/**
 * Binds a Y.Doc's shared text type to a room over the existing socket
 * connection. Using a CRDT (Yjs) rather than naive "last write wins"
 * broadcasting means two people typing in different parts of the document
 * at the same time merge correctly with no lost keystrokes -- this is the
 * same class of algorithm used by Google Docs and Figma.
 */
export function useCollaborativeText(socket, roomId) {
  const docRef = useRef(new Y.Doc());
  const yTextRef = useRef(docRef.current.getText('shared-notes'));
  const [text, setText] = useState('');
  const [synced, setSynced] = useState(false);
  const applyingRemote = useRef(false);

  useEffect(() => {
    if (!socket || !roomId) return undefined;

    const yText = yTextRef.current;

    function handleYTextChange() {
      // Guard against feedback loops: don't re-broadcast an update we
      // just applied because it arrived from the network.
      setText(yText.toString());
    }
    yText.observe(handleYTextChange);

    function handleRemoteUpdate({ update }) {
      applyingRemote.current = true;
      Y.applyUpdate(docRef.current, new Uint8Array(update));
      applyingRemote.current = false;
    }
    socket.on('doc:update', handleRemoteUpdate);

    // Local edits get broadcast to the rest of the room as a compact
    // binary diff (not the whole document), which keeps bandwidth low
    // even for large shared notes.
    function handleLocalUpdate(update, origin) {
      if (applyingRemote.current) return;
      socket.emit('doc:update', { roomId, update: Array.from(update) });
    }
    docRef.current.on('update', handleLocalUpdate);

    // On joining, pull the current document state so a late joiner sees
    // everything that's already been written, not just future edits.
    socket.emit('doc:sync-request', { roomId }, (response) => {
      if (response?.ok) {
        Y.applyUpdate(docRef.current, new Uint8Array(response.state));
        setText(yText.toString());
      }
      setSynced(true);
    });

    return () => {
      yText.unobserve(handleYTextChange);
      socket.off('doc:update', handleRemoteUpdate);
      docRef.current.off('update', handleLocalUpdate);
    };
  }, [socket, roomId]);

  // Called from the textarea's onChange. Diffs the new value against the
  // current Y.Text content and applies a minimal insert/delete rather than
  // replacing the whole string, which keeps concurrent edits mergeable.
  const updateText = useCallback((newValue) => {
    const yText = yTextRef.current;
    const oldValue = yText.toString();
    if (newValue === oldValue) return;

    let start = 0;
    while (
      start < oldValue.length &&
      start < newValue.length &&
      oldValue[start] === newValue[start]
    ) {
      start += 1;
    }

    let oldEnd = oldValue.length;
    let newEnd = newValue.length;
    while (oldEnd > start && newEnd > start && oldValue[oldEnd - 1] === newValue[newEnd - 1]) {
      oldEnd -= 1;
      newEnd -= 1;
    }

    docRef.current.transact(() => {
      if (oldEnd > start) yText.delete(start, oldEnd - start);
      if (newEnd > start) yText.insert(start, newValue.slice(start, newEnd));
    });
  }, []);

  return { text, updateText, synced };
}
