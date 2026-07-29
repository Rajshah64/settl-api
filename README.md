# Settl API

Backend service for **Settl** — a group expense splitter with UPI-native settlement.

## Tech Stack

- **NestJS** — API framework
- **PostgreSQL** — primary database (via TypeORM)
- **Redis** — session/cache (Docker ready, app wiring in progress)
- **Docker Compose** — local Postgres + Redis
- **GitHub Actions** — CI (typecheck + lint)

## Day 1 — What's Done

- NestJS project scaffolded with `Auth` and `User` modules
- **PostgreSQL connected** via TypeORM (`ConfigModule` + env-based connection)
- **`User` entity** with `firstName`, `lastName`, `email`, `password`, timestamps, and soft delete
- **User API** — create user, list users, get by id, get by email
- **`CreateUserDto`** with `class-validator` rules (email format, min 8-char password)
- **Docker Compose** for Postgres 15 and Redis 7
- **CI pipeline** on push/PR (`tsc --noEmit` + ESLint)


## Project Structure

```text
src/
├── app.module.ts          # ConfigModule, TypeORM, module imports
├── auth/                  # Auth module (scaffold)
├── users/
│   ├── dto/               # create-user, update-user DTOs
│   ├── entities/          # User TypeORM entity
│   ├── user.controller.ts
│   ├── user.service.ts
│   └── user.module.ts
```

## Local Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 20+
- npm

### Steps

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in values
3. Start infrastructure:
   ```bash
   docker compose up -d
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run the API in dev mode:
   ```bash
   npm run start:dev
   ```

The server runs on `http://localhost:3000` by default. See `.env.example` for required environment variables.

> **Note:** TypeORM `synchronize: true` is enabled for local development. Do not use this in production.

## API Endpoints (Day 1)

| Method | Route | Description | Status |
|--------|-------|-------------|--------|
| `GET` | `/` | Health/hello | Working |
| `POST` | `/user` | Create user | Working |
| `GET` | `/user` | List all users | Working |
| `GET` | `/user/:id` | Get user by id | Working |
| `GET` | `/user/email/:email` | Get user by email | Working |
| `PATCH` | `/user/:id` | Update user | Stub |
| `DELETE` | `/user/:id` | Delete user | Stub |
| `POST` | `/auth` | Register | Stub |
| `GET` | `/auth` | List auth | Stub |

### Example — create user

```bash
curl -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Raj",
    "lastName": "Shah",
    "email": "raj@example.com",
    "password": "password123"
  }'
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start with hot reload |
| `npm run build` | Compile for production |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run e2e tests |

## Architecture

```text
Client  →  Controller  →  Service  →  TypeORM Repository  →  PostgreSQL
```

Auth will follow the same pattern once register/login and JWT guards are implemented.

## Roadmap (next up)

- [ ] Enable global `ValidationPipe` in `main.ts`
- [ ] Hash passwords on user create
- [ ] Implement auth register + login
- [ ] JWT-protected routes
- [ ] Wire Redis for sessions/cache
- [ ] Complete user update/delete
