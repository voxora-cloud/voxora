# Voxora

Voxora is a monorepo for a modern, realtime customer support platform. It includes a Next.js web app and an Express + Socket.IO API with MongoDB and Redis. Teams can manage agents, converse with users in realtime, and embed a lightweight chat widget.

## What’s inside

- apps/web: Next.js 15 React 19 app (App Router, Tailwind)
- apps/api: Express 5 + Socket.IO backend, MongoDB (Mongoose), Redis
- packages/\*: shared ESLint and TypeScript config
- docker/: local dev services (MongoDB, Redis, Mongo Express, MailHog)

## Current implementation

- Realtime chat
  - Socket.IO with Redis adapter for horizontal scalability
  - Conversations and messages stored in MongoDB (Mongoose models)
  - Chat widget served from API at /widget and /widget-loader.js
- Auth and teams
  - JWT auth flows, registration, login, invite acceptance, forgot password UI
  - Admin and Agent dashboards/pages in the web app
- API foundation
  - Express 5, validation (express-validator/Joi), Helmet, CORS, rate limiting
  - Centralized error handling and structured logging (winston)
  - REST routes under /api/v1, plus a simple root health at /
- Email and assets
  - MailHog for local email testing (SMTP: 1025, UI: 8025)
  - Static uploads served from /uploads

## Future implementation (roadmap)

1. AI agent will talk
   - LLM-powered automated replies with intent detection and context memory
   - Escalation handoff to human agent with full conversation context
2. AI voice
   - Text-to-speech for agent responses and speech-to-text for user input
   - Realtime voice calls in the widget with streaming transcription

## Quick start (developer)

Prerequisites

- Docker Desktop
- Node.js >= 18 and npm 10+
- VS Code extensions (recommended)
  - Better Comments (aaron-bond.better-comments)
  - Prettier – Code formatter (esbenp.prettier-vscode)

1. Fork

- Fork this repository on GitHub to your account.

2. Clone

```bash
git clone <your-fork-url>
cd voxora
```

3. Environment files

- Ensure both apps have .env files. You can copy development templates:
  - apps/api: copy .env.development to .env (adjust if needed)
  - apps/web: copy .env.development to .env (adjust if needed)

4. Install dependencies

```bash
npm i
```

5. Start everything (Docker + dev servers)

```bash
npm run dev:full
```

This will:

- Start Redis, MongoDB, and Mongo Express in Docker
- Run the web and API dev servers via Turborepo

6. Open the apps

- Web app: http://localhost:3000
- API base: http://localhost:3002
  - REST routes live under http://localhost:3002/api/v1
  - Root health: http://localhost:3002/
- Mongo Express: http://localhost:8081
  - Note: Port 8081 is defined in docker/docker-compose.dev.yml
- MailHog (Mail UI): http://localhost:8025
  - SMTP server (for local email): localhost:1025

Optional widget endpoints during development (served by API):

- Widget HTML: http://localhost:3002/widget
- Loader script: http://localhost:3002/widget-loader.js

## Common scripts

From the repository root:

```bash
# Start Docker services (Redis, MongoDB, Mongo Express) only
npm run docker:start

# Stop Docker services
npm run docker:stop

# Run all dev servers without starting Docker
npm run dev

# Build all packages/apps
npm run build

# Lint and format
npm run lint
npm run format
```

## Notes

- If ports are already in use, stop conflicting services or change ports in docker/docker-compose.dev.yml and env files.
- For MongoDB auth locally, credentials are seeded in the .env files and docker-compose; see apps/api/.env.\* and docker/docker-compose.dev.yml.
- The web app uses Next.js with Turbopack in dev; if you hit issues, you can switch to the classic dev server by adjusting the script.

## Contributing

Before contributing, please read our contribution guidelines: CONTRIBUTION.md

## License

This project is licensed under the Voxora Custom License v1.0. See LICENSE for details.
