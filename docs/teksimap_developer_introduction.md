# Teksimap – Developer Introduction

Welcome to **Teksimap**.

This codebase is early-stage, fast-moving, and intentionally lightweight. The goal is to ship usable features quickly while the product and business model are still being validated. Expect some rough edges. That is normal at this stage.

---

## What is Teksimap?

Teksimap is a platform aimed at making **minibus taxi transportation** easier for commuters and more beneficial for taxi owners and drivers.

At its core, Teksimap is a **marketplace** where long-distance minibus taxi drivers can connect with:
- Passengers looking for transport
- Parcels that need to be delivered between locations

In addition, Teksimap provides a **map and direction feature** built around existing taxi routes. Its primary goal is to help commuters understand **how to travel from one point to another using the existing minibus taxi system** as it operates on the ground today.

The feature:
- Uses known and existing taxi routes
- Provides directional guidance and estimated travel costs
- Helps users navigate the taxi network as it already functions

Teksimap is designed to **formalize, inform, and enhance** an already widely used transportation system, not disrupt it blindly.

## Project Philosophy (Important)

- This is an **early-stage startup**, not a finished enterprise system
- Speed and clarity matter more than perfection
- Code should be readable and practical
- Refactors are expected
- Documentation grows as pain appears

If something feels incomplete, it probably is — and that’s okay.

---

## Tech Stack

The project uses a simple, proven stack:

- **Node.js** – Backend runtime
- **Vanilla JavaScript** – No heavy frameworks
- **MySQL** – Relational database
- **Docker & Docker Compose** – Local development and environment consistency
- **Git** – Version control with feature-branch workflow

---

## Architecture Overview
- **Frontend**: Vite-powered multi-page app under `frontend/`. Uses Axios for API calls, Turf/JSTS for geo helpers, and Capacitor shells for Android/iOS.
- **Backend**: Node/Express API under `backend/` with Sequelize + MySQL. Controllers drive business logic, routes expose endpoints, and middleware handles auth.
- **Data flow**: Browser/mobile → Axios → Express routes → controllers → Sequelize models → MySQL. Responses return JSON consumed by frontend pages and scripts

## Repo Layout (key paths)
- `frontend/` — Vite project (pages, scripts, styles, assets, Capacitor shells).
- `backend/` — Express app (routes, controllers, models, middleware, SQL migrations).
- `config/` — Environment templates (`env.docker.template`, `env.production.template`).
- `docs/` — Deployment and infrastructure guides (AWS, Docker, DB extensions, etc.).
- `nginx/` — Reverse-proxy config and SSL placeholders.

### Frontend Structure
- `vite.config.js` — Lists HTML entry points under `pages/**` plus `index.html`.
- `pages/` — Static HTML per feature (auth, customer, admin, owner, popup, etc.).
- `js/` — Domain scripts (e.g., `js/customer/booking-public.js`, `js/api/bookingApi.js`).
- `css/` — Styles per page/domain (e.g., `booking-*.css`, `client*.css`, `popup.css`).
- `assets/` — Images/icons.
- `android/`, `ios/` — Capacitor native wrappers.

### Backend Structure
- `server.js` — Express bootstrap.
- `routes/*.js` — Route definitions (auth, booking, payment, owner, admin, driver, vehicle, feedback, contact, help, documents).
- `controllers/*.js` — Business logic per domain (e.g., `bookingController.js`, `paymentController.js`).
- `models/*.js` — Sequelize models (users, routes, feedback, contributors, FAQs, user questions).
- `Middleware/authenticateUser.js` — Auth guard.
- `config/db.js` — Sequelize initialization; `config/configurations.js` for env; `config/sync.js` for sync helper.
- `migrations/*.sql` — Schema changes and notes (database setup information).
- `src/` — Graph/Dijkstra helpers for routing.
- `services/emailService.js` — Email sending.

## Running the Project Locally

### Prerequisites
- Node.js 18+ recommended.
- MySQL instance reachable with credentials in your `.env`.
- npm for dependency management.
- Docker
- Docker Compose

## Environment Setup
1) **Backend env**: Copy `config/.env.deveplemnt` 
2) **Install deps**:
   - Backend: `cd backend && npm install`
   - Frontend: `cd frontend && npm install`
3) **Database**: Ensure MySQL is running. Apply SQL in `backend/migrations/*.sql` as needed (manual apply; migrations are stored as SQL files).

## Running Locally
- **Backend**: `cd backend && nodemon server.js ; $env:NODE_ENV="development` (or use `nodemon` if added). Default Express port is configured in env.
- **Frontend (web)**: `cd frontend && npm run dev` (Vite dev server). Access pages via the dev server URLs; entry points are defined in `vite.config.js`.
- **Frontend build**: `cd frontend && npm run build` (outputs to `frontend/dist`).
- **Capacitor sync (after build)**: `cd frontend && npx cap sync`.
  - Android: open `frontend/android` in Android Studio.
  - iOS: open `frontend/ios` in Xcode.


---

## Common Tasks
- Add a new frontend page: create HTML under `frontend/pages/...`, JS/CSS as needed, and register the entry in `frontend/vite.config.js`.
- Add a new API endpoint: add route in `backend/routes/*.js`, implement handler in matching controller, update models if schema changes, and document in frontend API layer.
- DB schema change: add SQL to `backend/migrations/` and apply to the target DB.

## Database

- Database: **MySQL**
- Managed via Docker
- Schema is evolving
- Migrations may be manual at this stage

If you add or modify tables:
- Keep naming consistent
- Avoid destructive changes without discussion

---

## Git Workflow

We use a **feature-branch workflow**.

Rules:
- `main` is always stable
- No direct pushes to `main`
- One feature per branch

Branch naming examples:
```text
feature/signup
feature/booking
fix/login-bug
```

All changes go through a Pull Request and review.

---

## How to Contribute

1. Create a feature branch from `main`
2. Work only on the assigned feature
3. Commit small, meaningful changes
4. Open a Pull Request
5. Explain *why* changes were made

If something feels unclear, ask before changing core logic.

---

## Security & Access

- Repo is private
- Do not share code or credentials
- Do not reuse code outside this project
- Production credentials are restricted

Legal and IP agreements apply even at this stage.

---

## Expectations

- This codebase will change
- Some decisions will be reversed
- Cleanups are part of the job
- Communication matters more than clever code

We are building momentum, not perfection.

---

## Final Note

If you are here, you are trusted to help build something real.
Write clear code. Ask questions early. Optimize later.

Welcome to Teksimap.

