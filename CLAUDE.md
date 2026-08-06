# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start both backend and frontend together (from root)
npm run dev

# Start individually
npm run dev:backend   # Express on http://localhost:3001
npm run dev:frontend  # Vite on http://localhost:5173

# Seed the database (run once, or to reset questions)
npm run seed
```

### Backend (from `backend/`)
```bash
npm run dev      # nodemon watch mode (plain Node, no build step)
npm start        # node src/server.js
npm run seed     # node src/seed.js
npm test         # jest --runInBand
```

### Frontend (from `frontend/`)
```bash
npm run dev      # Vite dev server
npm run build    # tsc + vite build
npm run preview  # preview production build
```

The backend has a Jest + Supertest suite (`npm run test:backend` from root, or `npm test` from `backend/`). The frontend/root Playwright suites (`npm run test:ui`, `npm run test:a11y`) are separate.

## Architecture

### Overview
Monorepo with a React/TypeScript frontend (Vite) and an Express/JavaScript backend connected to MongoDB via Mongoose. No shared packages — the frontend defines its own types (`frontend/src/types/index.ts`) that mirror the shape of the backend's plain-JS Mongoose models.

### Backend (`backend/src/`) — plain JavaScript (CommonJS), no build step
- **`server.js`** — entry point; connects Mongoose, registers routes, starts Express on port 3001. `MONGODB_URI` defaults to `mongodb://localhost:27017/quizzicle`.
- **`app.js`** — Express app setup (CORS, JSON body parsing, route mounting, `/api/health`); exported separately from `server.js` so tests can import it without binding a port.
- **`routes/`** — three route files mounted at `/api/users`, `/api/questions`, `/api/sessions`
  - `users.js`: `POST /login` (upsert by name), `PATCH /:id/score` (increment totalScore, gamesPlayed; add to questionsAnswered set)
  - `questions.js`: `GET /random` — accepts `count` and `exclude` (comma-separated IDs) query params; returns random questions excluding already-seen IDs
  - `sessions.js`: `POST /` (save completed session), `GET /user/:userId` (last 10 sessions)
- **`models/`** — three Mongoose models: `User`, `Question`, `GameSession`
- **`seed.js`** — standalone script that populates the `questions` collection
- **`tests/`** — Jest + Supertest integration tests against `app.js`, backed by `mongodb-memory-server` (see `tests/db.js`)

### Frontend (`frontend/src/`)
- **`App.tsx`** — single top-level stateful component; owns all game state and drives phase transitions. No routing library — phase is managed with a `GamePhase` union type (`'name-entry' | 'loading' | 'playing' | 'feedback' | 'round-results'`).
- **`services/api.ts`** — all backend calls via axios. Axios is configured with `baseURL: '/api'`; Vite proxies `/api` → `http://localhost:3001` in dev.
- **`components/`** — presentational components (`NameEntry`, `QuestionCard`, `FeedbackModal`, `RoundResults`, `QuizzicleBackground`); they receive props and callbacks, hold no game logic.
- **`hooks/useAudio.ts`** — plays correct/incorrect audio cues.

### Game flow
1. User enters a name → `POST /api/users/login` (creates or retrieves user with prior `questionsAnswered` history)
2. `GET /api/questions/random?count=5&exclude=<ids>` loads a round, excluding previously seen questions; resets exclusions when all questions exhausted
3. Each answer triggers a `FeedbackModal` (correct/wrong message), then advances to the next question
4. After 5 questions → `RoundResults`; user can continue (load next round) or quit
5. On quit → `POST /api/sessions` saves the session, then `PATCH /api/users/:id/score` persists cumulative score and answered IDs

### WCAG patterns in use
- Skip-to-content link (`<a href="#main-content" class="skip-link">`) in `App.tsx`
- `role="alert"` + `aria-live="assertive"` on error banners
- `role="status"` + `aria-live="polite"` on loading indicators
- Maintain these patterns when adding new UI states.
