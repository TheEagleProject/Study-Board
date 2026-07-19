# StudyBoard 

A real time collaborative study platform for students. Create a study room, take shared notes together live, chat, and run a synced Pomodoro timer with your group.

## Features

- Live collaborative notes - everyone in a room sees edits instantly, with no lost changes even when multiple people type at once
- Real time group chat
- Shared Pomodoro timer that stays in sync for everyone in the room
- See who's currently online
- Join a room instantly with an invite code

## Tech Stack

**Backend:** Node.js, Express, Socket.io, PostgreSQL, Redis, JWT auth
**Frontend:** React, Vite, Tailwind CSS
**Infra:** Docker, Docker Compose

## Getting Started

Requirements: Docker Desktop installed and running

```bash
# 1. Clone the repo
git clone https://github.com/TheEagleProject/Study-Board.git
cd Study-Board

# 2. Set up environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Start everything
docker compose up --build

# 4. In a new terminal, set up the database
docker compose exec backend npm run migrate
```

Then open **http://localhost:5173**

## Testing

```bash
cd backend
npm test
```

## License

MIT