# Quizzicle – Setup Guide

## Prerequisites

1. **Node.js 18+** – https://nodejs.org  
2. **MongoDB Community Server** – https://www.mongodb.com/try/download/community  
   - Install and start the MongoDB service (it runs on `localhost:27017` by default)  
   - On Windows: the installer can configure it as a Windows service automatically  

## Quick Start

Open **two** terminals in `C:\DEV\quizzicle`.

### Terminal 1 – Backend

```bash
cd backend
npm install          # already done
npm run seed         # loads 30 trivia questions into MongoDB
npm run dev          # starts Express on http://localhost:3001
```

### Terminal 2 – Frontend

```bash
cd frontend
npm install          # already done
npm run dev          # starts Vite on http://localhost:5173
```

Then open **http://localhost:5173** in your browser.

---

### One-command dev start (root)

```bash
npm run dev          # starts both backend and frontend concurrently
```

Seed only needs to be run once (or again to reset questions).
