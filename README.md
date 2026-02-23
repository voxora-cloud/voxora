<div id="top"></div>

<p align="center">⭐️ Help us grow - Star us on GitHub! ⭐️</p>

<p align="center">
  <a href="https://voxora.cloud">
    <img width="120" alt="Open Source Customer Support Automation" src="https://avatars.githubusercontent.com/u/222506196?s=200&v=4">
  </a>
</p>

<h3 align="center">Voxora</h3>

<p align="center">
  Open Source End-to-End Customer Support Automation
  <br />
  <a href="https://voxora.cloud/">Website</a> · 
  <a href="https://github.com/voxora-cloud/voxora/issues">Report Bug</a> · 
  <a href="https://github.com/voxora-cloud/voxora/issues">Request Feature</a>
</p>

---

## ✨ About Voxora

<img width="1895" height="969" alt="Voxora Customer Support Platform" src="https://github.com/user-attachments/assets/df60f5be-a44d-4b34-9ffc-960f05d7a636" />

**Voxora is an open-source platform designed to automate end-to-end customer support.** Our goal is to provide businesses with a complete solution that handles every aspect of customer interactions—from initial contact to resolution—all while remaining flexible, scalable, and easy to integrate.

### 🚀 Multiple Communication Interfaces

Voxora supports multiple channels to meet your customers wherever they are:

- 📱 **Web Widget** - Embeddable chat widget for your website
- 📞 **Voice Calls** - Phone support integration
- 🔌 **SDK** - Programmatic access for custom integrations
- 💬 **Microsoft Teams** - Direct support via Teams
- ✈️ **Telegram** - Customer support through Telegram bots
- 🌐 **REST API** - Full-featured API for custom workflows
- *...and more coming soon*

### 🛠️ Key Features

- ⚡ **Real-time messaging** with Socket.IO
- 🤖 **AI-powered automation** for intelligent routing and responses
- 👥 **Agent management** with role-based access control
- 📊 **Analytics & insights** to track support performance
- 🔄 **Multi-channel support** - unified inbox for all interfaces
- 🎨 **Customizable UI** to match your brand
- 🔐 **Enterprise-grade security** with JWT authentication
- 📈 **Horizontal scaling** with Redis and MongoDB
- 🌍 **Self-hosted** - full control over your data

---

## 🚀 Quick Start

Get Voxora running locally in minutes:

### Prerequisites

- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose**
- **Git**

### Installation

#### 1. **Fork the Repository**

Fork this repository to your GitHub account by clicking the "Fork" button at the top right.

#### 2. **Clone Your Fork**

```bash
git clone https://github.com/<your-username>/voxora.git
cd voxora
```

#### 3. **Set Up Environment Variables**

Copy the development environment templates:

```bash
# API environment
cp apps/api/.env.development apps/api/.env

# Web environment
cp apps/web/.env.development apps/web/.env
```

Adjust the `.env` files as needed for your local setup.

#### 4. **Run Everything**

We provide a simple command to start all services:

```bash
make all
```

This command will:
- Install all dependencies
- Start Docker containers (Redis, MongoDB, Mongo Express)
- Launch the web and API development servers via Turborepo


---

## 🌐 Access Your Local Instance

Once everything is running, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| **Web App** | http://localhost:3000 | Main customer support dashboard |
| **API** | http://localhost:3002 | REST API base endpoint |
| **API Health** | http://localhost:3002/ | Health check endpoint |
| **REST Routes** | http://localhost:3002/api/v1 | All REST API routes |
| **Mongo Express** | http://localhost:8081 | MongoDB admin interface |
| **MailHog** | http://localhost:8025 | Local email testing UI |
| **SMTP Server** | localhost:1025 | SMTP server for dev emails |

---

## 📚 Documentation

- **API Documentation**: Check `apps/api/README.md` for detailed API documentation
- **Architecture**: Learn about our tech stack and design decisions
- **Contributing**: See `CONTRIBUTION.md` for guidelines

---

## 🏗️ Project Structure

```
voxora/
├── apps/
│   ├── api/              # Express + Socket.IO backend
│   ├── web/              # Next.js frontend dashboard
│   └── widget/           # Embeddable chat widget
├── packages/             # Shared packages across the monorepo
├── docker/               # Docker configuration files
│   └── docker-compose.dev.yml
├── Makefile              # Convenient commands
└── turbo.json            # Turborepo configuration
```

---

## 🤝 Contributing

We welcome contributions from the community! Before contributing, please:

1. Read our [Contributing Guidelines](CONTRIBUTION.md)
2. Check out open [Issues](https://github.com/voxora-cloud/voxora/issues)
3. Fork the repository
4. Create a feature branch (`git checkout -b feature/amazing-feature`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## ❤️ Contributors

Thanks to these amazing people who are building Voxora! 🚀

<a href="https://github.com/voxora-cloud/voxora/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=voxora-cloud/voxora" />
</a>

---

## 📝 License

This project is licensed under the **Voxora Custom License v1.0**. See the [LICENSE](LICENSE) file for details.

---

## 🌟 Star Us!

If you find Voxora useful, please consider giving us a star on GitHub! It helps us grow and improve the project.

<p align="center">Made with ❤️ by the Voxora team</p>
