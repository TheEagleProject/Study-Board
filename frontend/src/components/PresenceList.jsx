export default function PresenceList({ presence }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">
        Online now ({presence.length})
      </h2>
      <ul className="space-y-2">
        {presence.map((p) => (
          <li key={p.userId} className="flex items-center gap-2 text-sm text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {p.displayName}
          </li>
        ))}
        {presence.length === 0 && (
          <li className="text-sm text-slate-400">Just you so far...</li>
        )}
      </ul>
    </div>
  );
}
