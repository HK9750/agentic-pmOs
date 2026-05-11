# Agentic PM OS

Agentic project management platform for engineering teams.

The current build is Phase 1 foundation:

- Go API server.
- Go worker entrypoint.
- Go migration runner.
- PostgreSQL and Redis local infrastructure.
- Next.js frontend shell.
- Planning docs in `plan/`.

## Local Services

```sh
make compose-up
make migrate
make api
```

In another terminal:

```sh
make worker
```

For the frontend, install dependencies first:

```sh
npm install
make web-dev
```

## Health Checks

- API liveness: `GET http://localhost:8080/healthz`
- API readiness: `GET http://localhost:8080/readyz`
- SSE foundation: `GET http://localhost:8080/realtime/events`

PostgreSQL is exposed on local port `5432`. Redis is exposed on local port `6380` to avoid colliding with a system Redis on `6379`.

## Auth Endpoints

- Register: `POST /api/v1/auth/register`
- Login: `POST /api/v1/auth/login`
- Current user: `GET /api/v1/auth/me`
- Logout: `POST /api/v1/auth/logout`
- Logout other/all sessions: `POST /api/v1/auth/logout-all`
- Change password: `PATCH /api/v1/auth/password`
- List sessions: `GET /api/v1/auth/sessions`
- Revoke session: `POST /api/v1/auth/sessions/revoke`
- Update profile: `PATCH /api/v1/profile`

Auth uses Argon2id password hashes, server-side sessions, HTTP-only cookies, and Redis-backed login attempt limiting.

## Frontend Base Flows

- `/register` creates an account and redirects to account setup.
- `/login` signs in and redirects to account setup.
- `/account` manages profile, password, active sessions, and logout.
- `/setup` creates/selects workspaces, creates projects, lists projects, and shows setup progress.

## Workspace And Project Endpoints

- Create workspace: `POST /api/v1/workspaces`
- List workspaces: `GET /api/v1/workspaces`
- Create project: `POST /api/v1/projects`
- List projects: `GET /api/v1/projects?workspace_id=<id>`

Workspace creators become `owner` members automatically. Projects are scoped to workspaces and create audit events.
