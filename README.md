# Voxora
<img width="1895" height="969" alt="Screenshot 2026-02-13 at 11 03 21 PM" src="https://github.com/user-attachments/assets/9f1fbeeb-3b7f-4b4d-8a5f-1fe835b6ddca" />

Voxora is a monorepo for a modern, realtime customer support platform. It includes a Next.js web app and an Express + Socket.IO API with MongoDB and Redis. Teams can manage agents, converse with users in realtime, and embed a lightweight chat widget.


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


## Contributing

Before contributing, please read our contribution guidelines: `CONTRIBUTION.md`

## ❤️ Contributors

Thanks to these amazing people who built Voxora 🚀

<a href="https://github.com/voxora-cloud/voxora/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=voxora-cloud/voxora" />
</a>


## License

This project is licensed under the Voxora Custom License v1.0. See LICENSE for details.
