# Developer Guide

This document explains how the Map_Practise application is structured, how to run it locally, and where to look when making changes.

## Architecture Overview
- **Frontend**: Vite-powered multi-page app under `frontend/`. Uses Axios for API calls, Turf/JSTS for geo helpers, and Capacitor shells for Android/iOS.
- **Backend**: Node/Express API under `backend/` with Sequelize + MySQL. Controllers drive business logic, routes expose endpoints, and middleware handles auth.
- **Data flow**: Browser/mobile → Axios → Express routes → controllers → Sequelize models → MySQL. Responses return JSON consumed by frontend pages and scripts.

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
- `migrations/*.sql` — Schema changes and notes (email verification, reset tokens, owner-driver relationship, payment fixes, etc.).
- `src/` — Graph/Dijkstra helpers for routing.
- `services/emailService.js` — Email sending.

## Prerequisites
- Node.js 18+ recommended.
- MySQL instance reachable with credentials in your `.env`.
- npm for dependency management.

## Environment Setup
1) **Backend env**: Copy `config/env.production.template` (or `config/env.docker.template`) to `.env` in `backend/`, then fill DB creds, JWT secrets, mail settings, etc.
2) **Install deps**:
   - Backend: `cd backend && npm install`
   - Frontend: `cd frontend && npm install`
3) **Database**: Ensure MySQL is running. Apply SQL in `backend/migrations/*.sql` as needed (manual apply; migrations are stored as SQL files).

## Running Locally
- **Backend**: `cd backend && node server.js` (or use `nodemon` if added). Default Express port is configured in env.
- **Frontend (web)**: `cd frontend && npm run dev` (Vite dev server). Access pages via the dev server URLs; entry points are defined in `vite.config.js`.
- **Frontend build**: `cd frontend && npm run build` (outputs to `frontend/dist`).
- **Capacitor sync (after build)**: `cd frontend && npx cap sync`.
  - Android: open `frontend/android` in Android Studio.
  - iOS: open `frontend/ios` in Xcode.

## Deployment Notes
- Docker + AWS: see `docs/DOCKER_DEPLOYMENT.md`, `docs/README_DOCKER.md`, `docker-compose.aws.yml`.
- Nginx: `nginx/nginx.aws.conf` (SSL placeholders in `nginx/ssl/`).
- Env templates: `config/env.docker.template`, `config/env.production.template`.

## Where to Start Reading Code
- **Frontend surface**: `frontend/vite.config.js` to see all pages; then check `frontend/js/...` for logic (e.g., `js/customer/booking-public.js`, `js/api/bookingApi.js`).
- **API surface**: `backend/routes/*.js` to see available endpoints; follow to corresponding controllers.
- **Auth**: `backend/routes/AuthRoutes.js`, `backend/controllers/AuthController.js`, `backend/Middleware/authenticateUser.js`.
- **Booking/Payments**: `backend/controllers/bookingController.js`, `backend/controllers/paymentController.js`.
- **Admin/Owner**: `backend/controllers/admin*.js`, `ownerController.js`, `driverController.js`, `vehicleController.js`.

## Common Tasks
- Add a new frontend page: create HTML under `frontend/pages/...`, JS/CSS as needed, and register the entry in `frontend/vite.config.js`.
- Add a new API endpoint: add route in `backend/routes/*.js`, implement handler in matching controller, update models if schema changes, and document in frontend API layer.
- DB schema change: add SQL to `backend/migrations/` and apply to the target DB.

## Current Build Warnings (FYI)
- Some static pages include `<script src="../js/script.js">` without `type="module"`; Vite emits warnings but builds.
- Several CSS files are referenced and expected to exist at runtime; build notes will flag missing-at-build-time CSS paths if absent.

## Testing (lightweight)
- Backend: add tests if needed (none provided yet). For now, manual API checks via Postman/Thunder Client.
- Frontend: run `npm run build` to ensure Vite bundles; spot-check key pages in dev server.

## Support Files
- Infrastructure/docs: `docs/` contains DB extension guides, AWS/RDS setup, Docker deploy notes, and WhatsApp bot integration references.


