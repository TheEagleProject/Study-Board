import { useEffect, useState, useCallback } from 'react';

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function PomodoroTimer({ socket, roomId }) {
  const [state, setState] = useState({ status: 'idle', phase: 'focus', durationSecs: 1500 });
  const [displaySecs, setDisplaySecs] = useState(1500);

  useEffect(() => {
    if (!socket) return undefined;
    function handleState(newState) {
      setState(newState);
    }
    socket.on('timer:state', handleState);
    return () => socket.off('timer:state', handleState);
  }, [socket]);

  // Client-side ticking between server sync events. The server is the
  // source of truth (via startedAt), so this is purely a smooth visual
  // countdown -- if it drifts, the next server broadcast corrects it.
  useEffect(() => {
    if (state.status !== 'running' || !state.startedAt) {
      setDisplaySecs(state.durationSecs);
      return undefined;
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - new Date(state.startedAt).getTime()) / 1000;
      const remaining = Math.max(0, state.durationSecs - elapsed);
      setDisplaySecs(remaining);
    }, 250);

    return () => clearInterval(interval);
  }, [state]);

  const sendAction = useCallback(
    (action, durationSecs) => {
      socket.emit('timer:action', { roomId, action, durationSecs }, (response) => {
        if (response?.ok) setState(response.state);
      });
    },
    [socket, roomId]
  );

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Group Timer</h2>
      <div className="mb-4 text-center">
        <span className="text-4xl font-semibold tabular-nums text-slate-900">
          {formatTime(displaySecs)}
        </span>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
          {state.phase === 'focus' ? 'Focus session' : 'Break'}
        </p>
      </div>
      <div className="flex justify-center gap-2">
        {state.status !== 'running' ? (
          <button
            onClick={() => sendAction('start')}
            className="rounded-md bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            Start
          </button>
        ) : (
          <button
            onClick={() => sendAction('pause')}
            className="rounded-md bg-slate-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Pause
          </button>
        )}
        <button
          onClick={() => sendAction('reset', 1500)}
          className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
