<div align="center">
  <h1><img src="https://avatars.githubusercontent.com/u/222506196?s=48&v=4"> Voxora</h1>
  <p><strong>Open-source, AI-powered live chat & voice support platform</strong></p>
  <p>Built for modern web applications with real-time communication</p>

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)](https://socket.io/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
  [![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
  [![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

  <p>
    <a href="#features">Features</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#documentation">Documentation</a> •
    <a href="#api-reference">API</a> •
    <a href="#contributing">Contributing</a>
  </p>
</div>

---

## 🌟 What is Voxora?

Voxora is a **modern, open-source customer support platform** that combines real-time chat, AI assistance, and voice communication. Built with performance and developer experience in mind, it's designed to be easily integrated into any web application.

### 🎯 **Why Choose Voxora?**

- 🚀 **Developer-First**: Easy integration with comprehensive APIs
- 🤖 **AI-Powered**: Smart responses and conversation routing
- 📱 **Real-time**: Instant messaging with WebSocket technology
- 🎙️ **Voice Support**: Integrated voice chat capabilities
- 🔧 **Customizable**: White-label solution with full customization
- 📊 **Analytics**: Built-in conversation analytics and insights
- 🔒 **Secure**: Enterprise-grade security and data protection
- 🌐 **Scalable**: Horizontally scalable architecture

---

## ✨ Features

### 💬 **Chat & Messaging**
- Real-time bidirectional messaging
- Rich text formatting and file sharing
- Typing indicators and read receipts
- Message reactions and emoji support
- Conversation threading and history

### 🤖 **AI Integration**
- Intelligent auto-responses
- Smart conversation routing
- Sentiment analysis
- Language detection and translation
- Automated FAQ responses

### 🎙️ **Voice Communication**
- High-quality voice calls
- Screen sharing capabilities
- Call recording and transcription
- Voice message support

### 👥 **Team Management**
- Agent dashboard and queue management
- Role-based permissions
- Performance analytics
- Workload distribution
- Team collaboration tools

### 🛠️ **Developer Tools**
- RESTful APIs and webhooks
- SDK for multiple platforms
- Comprehensive documentation
- Real-time event streaming
- Custom integrations

### 📊 **Analytics & Reporting**
- Conversation metrics
- Response time tracking
- Customer satisfaction scores
- Agent performance insights
- Custom reporting dashboards

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18.0.0 or higher)
- **MongoDB** (v5.0 or higher)
- **Redis** (v6.0 or higher)
- **Docker** (optional, recommended)

### 🐋 Docker Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/voxora.git
cd voxora

# Start with Docker Compose
docker-compose up -d

# The application will be available at:
# API: http://localhost:3001
# Dashboard: http://localhost:3000
```

### 🔧 Manual Setup

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the development servers
npm run dev

# Or start individual services
npm run dev:api     # Backend API (port 3001)
npm run dev:web     # Dashboard (port 3000)
npm run dev:widget  # Chat Widget (port 3002)
```

---

## 📁 Project Structure

```
voxora/
├── apps/
│   ├── api/              # Backend API server
│   ├── web/              # Admin dashboard (React)
│   ├── widget/           # Chat widget (React)
│   └── docs/             # Documentation site
├── packages/
│   ├── sdk/              # JavaScript SDK
│   ├── ui/               # Shared UI components
│   ├── types/            # TypeScript definitions
│   └── config/           # Shared configuration
├── docker-compose.yml    # Docker services
└── package.json          # Monorepo configuration
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-username/voxora.git
cd voxora

# Install dependencies
npm install

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes and commit
git commit -m "Add amazing feature"

# Push and create a pull request
git push origin feature/amazing-feature
```

### Code Style

- **TypeScript** for type safety
- **ESLint + Prettier** for code formatting
- **Conventional Commits** for commit messages
- **Jest** for testing

---

## 📚 Documentation

- 📖 [Full Documentation](https://docs.voxora.io)
- 🚀 [Getting Started Guide](https://docs.voxora.io/getting-started)
- 🔌 [API Reference](https://docs.voxora.io/api)
- 🛠️ [SDK Documentation](https://docs.voxora.io/sdk)
- 💡 [Examples & Tutorials](https://docs.voxora.io/examples)

---

## 🌍 Community & Support

- 💬 [Discord Community](https://discord.gg/voxora)
- 📧 [Email Support](mailto:ompharate31@gmail.com)
- 🐛 [Report Issues](https://github.com/voxora-io/voxora/issues)
- 💡 [Feature Requests](https://github.com/voxora-io/voxora/discussions)


---

## 📄 License

Voxora is open-source software licensed under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

Built with ❤️ by the Voxora team and our amazing contributors.



<div align="center">
  <p>⭐ Star us on GitHub if Voxora helps you build better customer support!</p>
  <p>Made with ❤️ for the developer community</p>
</div>