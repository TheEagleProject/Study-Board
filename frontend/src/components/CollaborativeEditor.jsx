import { useRef } from 'react';
import { useCollaborativeText } from '../hooks/useCollaborativeText';

export default function CollaborativeEditor({ socket, roomId }) {
  const { text, updateText, synced } = useCollaborativeText(socket, roomId);
  const textareaRef = useRef(null);

  function handleChange(e) {
    const cursorPos = e.target.selectionStart;
    updateText(e.target.value);
    // Restore cursor position after React re-renders with the new value,
    // since naive re-render would otherwise jump the cursor to the end.
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = cursorPos;
        textareaRef.current.selectionEnd = cursorPos;
      }
    });
  }

  return (
    <div className="flex h-full flex-col rounded-xl bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <h2 className="text-sm font-semibold text-slate-700">Shared Notes</h2>
        <span className="text-xs text-slate-400">
          {synced ? 'Synced' : 'Syncing...'}
        </span>
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        placeholder="Start typing — everyone in the room sees your changes live..."
        className="min-h-[300px] flex-1 resize-none rounded-b-xl p-4 text-sm text-slate-800 focus:outline-none"
      />
    </div>
  );
}
