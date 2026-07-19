import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/apiClient';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import CollaborativeEditor from '../components/CollaborativeEditor';
import ChatPanel from '../components/ChatPanel';
import PresenceList from '../components/PresenceList';
import PomodoroTimer from '../components/PomodoroTimer';

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { getSocket, connected } = useSocket();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [presence, setPresence] = useState([]);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/api/rooms/${roomId}`)
      .then(({ data }) => {
        if (!cancelled) setRoom(data.data.room);
      })
      .catch(() => {
        if (!cancelled) setJoinError('You do not have access to this room.');
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Join the socket-level room once connected, and clean up (leave +
  // remove listeners) on unmount so navigating away doesn't leak presence.
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !connected) return undefined;

    socket.emit('room:join', { roomId }, (response) => {
      if (response?.ok) {
        setPresence(response.presence.filter((p) => p.userId !== user.id));
      } else {
        setJoinError(response?.error || 'Failed to join room');
      }
    });

    function handleJoined(p) {
      setPresence((prev) => [...prev.filter((x) => x.userId !== p.userId), p]);
    }
    function handleLeft({ userId }) {
      setPresence((prev) => prev.filter((p) => p.userId !== userId));
    }

    socket.on('presence:joined', handleJoined);
    socket.on('presence:left', handleLeft);

    return () => {
      socket.emit('room:leave');
      socket.off('presence:joined', handleJoined);
      socket.off('presence:left', handleLeft);
    };
  }, [getSocket, connected, roomId, user.id]);

  if (joinError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-slate-600">{joinError}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const socket = getSocket();

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="mb-1 text-xs text-slate-400 hover:text-slate-600"
          >
            ← Back to dashboard
          </button>
          <h1 className="text-xl font-semibold text-slate-900">{room?.name || 'Loading...'}</h1>
        </div>
        {room && (
          <div className="rounded-md bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-500">
            Invite code: {room.inviteCode}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-h-[400px]">
          <CollaborativeEditor socket={socket} roomId={roomId} />
        </div>

        <div className="flex flex-col gap-4">
          <PomodoroTimer socket={socket} roomId={roomId} />
          <PresenceList presence={presence} />
          <div className="h-80">
            <ChatPanel socket={socket} roomId={roomId} />
          </div>
        </div>
      </div>
    </div>
  );
}
