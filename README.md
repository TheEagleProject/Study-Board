# StudyBoard

A real-time collaborative study platform. Students create a room, share a live-editing
notes document, chat, and run a synchronized Pomodoro timer together — think
*Google Docs meets Discord*, scoped for study groups.

## Why this project

Most portfolio projects are CRUD apps. This one is built around **state that
multiple people mutate concurrently**, which is a fundamentally harder problem:
naive "last write wins" sync loses data the moment two people type at once.
This project solves that properly using **CRDTs (Conflict-free Replicated Data
Types)** via [Yjs](https://github.com/yjs/yjs) — the same class of algorithm
behind Google Docs, Figma, and Linear.

## Architecture

```
┌─────────────┐        WebSocket (Socket.io)        ┌──────────────┐
│   React     │◄───────────────────────────────────►│  Node.js /   │
│  Frontend   │        REST (axios + JWT)            │  Express API │
│  (Vite)     │◄───────────────────────────────────►│              │
└─────────────┘                                      └──────┬───────┘
                                                              │
                                    ┌─────────────────────────┼─────────────────────────┐
                                    │                          │                          │
                              ┌─────▼─────┐            ┌──────▼──────┐          ┌────────▼────────┐
                              │ PostgreSQL │            │    Redis    │          │  Yjs CRDT docs   │
                              │ (durable   │            │ (presence,  │          │  (in-memory,     │
                              │  storage)  │            │  rate-limit,│          │  periodically    │
                              │            │            │  socket.io  │          │  snapshotted to  │
                              │            │            │  pub/sub)   │          │  Postgres)       │
                              └────────────┘            └─────────────┘          └──────────────────┘
```

### Backend (`/backend`)
- **Express** REST API for auth and room management
- **Socket.io** for everything real-time: collaborative editing, chat, presence, shared timer
- **PostgreSQL** for durable storage (users, rooms, messages, CRDT snapshots)
- **Redis** for three separate jobs: distributed rate limiting, cross-instance presence
  tracking, and the Socket.io adapter that lets events broadcast correctly once this is
  scaled to more than one container
- **Yjs** for the collaborative document — CRDT updates are applied server-side too (not
  just relayed blindly) so the server can persist a canonical snapshot

### Frontend (`/frontend`)
- **React 18** + **Vite** + **Tailwind**
- A custom `useCollaborativeText` hook binds a `Y.Text` CRDT to a plain textarea via
  minimal diffing (insert/delete deltas, not whole-string replacement), so concurrent
  edits from multiple tabs merge correctly
- Axios client with **automatic access-token refresh** on 401, with request queuing so
  concurrent requests don't each trigger their own refresh race

## Security decisions (and why)

| Decision | Reason |
|---|---|
| Short-lived (15 min) access tokens + rotating refresh tokens | Limits the blast radius of a leaked access token; refresh token rotation means a stolen-but-unused refresh token becomes invalid the moment the real user refreshes |
| Refresh tokens hashed (SHA-256) and stored server-side | Lets us revoke a specific session or *all* sessions instantly (e.g. "log out everywhere"), which a stateless JWT alone can't do |
| bcrypt with cost factor 12 | Industry-standard adaptive hashing; cost factor is configurable via env as hardware gets faster |
| Identical error message for "no such user" vs "wrong password" | Prevents account enumeration via the login endpoint |
| Zod validation on every request body | Rejects malformed/oversized/unexpected input before it reaches business logic or the database |
| Parameterized queries everywhere (`pg` with `$1, $2...`) | Eliminates SQL injection by construction — no string concatenation into SQL, ever |
| Redis-backed rate limiting (not in-memory) | Limits hold correctly across multiple horizontally-scaled API containers, not just per-process |
| Room membership re-checked on every socket event | A room ID is just a UUID a client could guess or reuse from another tab — every read/write re-verifies the requesting user is actually a member |
| Helmet + CORS allowlist + HPP + 100kb body limit | Standard defense-in-depth HTTP hardening |
| Non-root Docker user + multi-stage builds | Smaller attack surface and smaller images |

## Local development

```bash
# 1. Copy env files and adjust as needed
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Bring up the full stack (Postgres, Redis, backend, frontend)
docker-compose up --build

# 3. Apply the database schema (first run only)
docker-compose exec backend npm run migrate
```

Frontend: http://localhost:5173
Backend health check: http://localhost:4000/health

### Running without Docker
```bash
# Backend
cd backend
npm install
npm run migrate   # requires local Postgres + Redis running
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Testing

```bash
cd backend
npm test              # unit tests with coverage
```

CI (`.github/workflows/ci.yml`) runs lint + tests against real Postgres/Redis service
containers on every push and PR, then verifies both Docker images actually build —
catching integration issues that pure unit tests would miss.

## Deployment notes

Both services are containerized and ready for ECS/EKS/any container platform:
- `backend/Dockerfile` — multi-stage build, non-root user, built-in health check
- `frontend/Dockerfile` — static build served via nginx with SPA fallback routing and
  long-cache headers on hashed assets

Environment-specific config is entirely via env vars (see `.env.example` in each
folder) — nothing is hardcoded, so the same image can be promoted from staging to
production without a rebuild.

## Tech stack summary

**Backend:** Node.js, Express, Socket.io, PostgreSQL, Redis, Yjs, JWT, bcrypt, Zod, Winston, Jest
**Frontend:** React, Vite, Tailwind CSS, Socket.io-client, Yjs, React Router, Axios
**Infra:** Docker, Docker Compose, GitHub Actions CI, designed for AWS (ECS/EC2 + RDS + ElastiCache)
