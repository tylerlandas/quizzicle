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
npm run dev      # ts-node + nodemon watch mode
npm run build    # tsc compile to dist/
npm start        # run compiled dist/server.js
npm run seed     # ts-node src/seed.ts
```

### Frontend (from `frontend/`)
```bash
npm run dev      # Vite dev server
npm run build    # tsc + vite build
npm run preview  # preview production build
```

There are no test scripts configured in this project.

## Architecture

### Overview
Monorepo with a React/TypeScript frontend (Vite) and an Express/TypeScript backend connected to MongoDB via Mongoose. No shared packages — types are duplicated between frontend (`frontend/src/types/index.ts`) and backend models.

### Backend (`backend/src/`)
- **`server.ts`** — entry point; connects Mongoose, registers routes, starts Express on port 3001. `MONGODB_URI` defaults to `mongodb://localhost:27017/quizzicle`.
- **`routes/`** — three route files mounted at `/api/users`, `/api/questions`, `/api/sessions`
  - `users.ts`: `POST /login` (upsert by name), `PATCH /:id/score` (increment totalScore, gamesPlayed; add to questionsAnswered set)
  - `questions.ts`: `GET /random` — accepts `count` and `exclude` (comma-separated IDs) query params; returns random questions excluding already-seen IDs
  - `sessions.ts`: `POST /` (save completed session), `GET /user/:userId` (last 10 sessions)
- **`models/`** — three Mongoose models: `User`, `Question`, `GameSession`
- **`seed.ts`** — standalone script that populates the `questions` collection

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
