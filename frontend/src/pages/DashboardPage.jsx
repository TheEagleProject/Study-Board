import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRoomName, setNewRoomName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  async function loadRooms() {
    const { data } = await api.get('/api/rooms');
    setRooms(data.data.rooms);
  }

  useEffect(() => {
    loadRooms().finally(() => setLoading(false));
  }, []);

  async function handleCreateRoom(e) {
    e.preventDefault();
    setError('');
    if (!newRoomName.trim()) return;
    try {
      const { data } = await api.post('/api/rooms', { name: newRoomName });
      setNewRoomName('');
      navigate(`/rooms/${data.data.room.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room');
    }
  }

  async function handleJoinRoom(e) {
    e.preventDefault();
    setError('');
    if (!inviteCode.trim()) return;
    try {
      const { data } = await api.post('/api/rooms/join', { inviteCode });
      navigate(`/rooms/${data.data.room.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid invite code');
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Hi, {user?.displayName} 👋
          </h1>
          <p className="text-sm text-slate-500">Your study rooms</p>
        </div>
        <button
          onClick={logout}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Log out
        </button>
      </header>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <form onSubmit={handleCreateRoom} className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Create a room</h2>
          <div className="flex gap-2">
            <input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="e.g. CS 341 Midterm Prep"
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Create
            </button>
          </div>
        </form>

        <form onSubmit={handleJoinRoom} className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Join with invite code</h2>
          <div className="flex gap-2">
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB3XQ9KZ"
              maxLength={8}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm uppercase tracking-wider focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
            >
              Join
            </button>
          </div>
        </form>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-700">Your rooms</h2>
      {loading ? (
        <p className="text-sm text-slate-400">Loading rooms...</p>
      ) : rooms.length === 0 ? (
        <p className="text-sm text-slate-400">
          No rooms yet — create one or join with an invite code above.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => navigate(`/rooms/${room.id}`)}
              className="rounded-xl bg-white p-4 text-left shadow-sm transition hover:shadow-md"
            >
              <p className="font-medium text-slate-900">{room.name}</p>
              <p className="mt-1 font-mono text-xs text-slate-400">{room.inviteCode}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
