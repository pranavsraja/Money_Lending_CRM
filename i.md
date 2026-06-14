# Backend Implementation Plan

The objective of this phase is to build a real backend server and database based on our `database_design.md` schema, replacing the browser's `localStorage`. This will turn the Frontend MVP into a fully functioning full-stack application.

## User Review Required
> [!IMPORTANT]
> To keep the backend robust but easy to run locally on your machine without requiring complex database installations, I propose using **Node.js with Express** for the API, and **SQLite** for the database. SQLite acts as a real relational database but stores everything in a local file, making it perfect for this stage.
> 
> I will also rewrite the React frontend's data layer to make actual HTTP API calls (GET, POST, PUT, DELETE) to this new server.
> 
> Please review and approve this stack so I can begin!

## Architecture & Tech Stack
- **Backend Framework:** Node.js with Express.
- **Database:** SQLite (using `better-sqlite3` or Prisma ORM for schema management).
- **API Architecture:** RESTful API with distinct routes for `/leads`, `/borrowers`, `/applications`, `/loans`, `/installments`, and `/interactions`.
- **Frontend Updates:** The `dataStore.js` in our React app will be rewritten to use `fetch()` or `axios` to communicate with the backend on a different port (e.g., `localhost:3000`).

## Proposed Implementation Phases

### Phase 1: Backend Setup & Schema
- Initialize a new Node.js project alongside the frontend (e.g., in a `backend` folder).
- Install Express, SQLite drivers, and CORS (to allow the frontend to talk to the backend).
- Translate `database_design.md` into SQL tables and initialize the database.

### Phase 2: RESTful API Development
- Create Express routes (CRUD operations) for:
  - Leads & Borrowers
  - Applications & Loans
  - Installments (including the 'Mark Paid' logic)
  - Interactions
- Seed the SQLite database with the mock data we previously used so the dashboard still looks populated.

### Phase 3: Frontend Integration
- Modify the Vite configuration to proxy API requests to the backend server.
- Refactor `dataStore.js` into an API service class that makes HTTP calls.
- Update React components to use asynchronous data fetching (`async/await`) instead of synchronous local storage reads.

## Verification Plan
### Manual Verification
- We will run both the Backend API server and the Frontend Vite server concurrently.
- Test that adding a new Lead through the React UI successfully writes to the SQLite database.
- Verify that refreshing the browser fetches the data seamlessly from the real backend.
