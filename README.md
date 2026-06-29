<p align="center">
  <a href="https://interaone.app">
    <img width="120" alt="InteraOne" src="https://avatars.githubusercontent.com/u/222506196?s=200&v=4">
  </a>
</p>

<h2 align="center">InteraOne</h2>

<p align="center">
  <b>Open source alternative to Intercom & Zendesk — with a Single AI Brain</b>
  <br/>
  <sub>Stop paying $74/month. Self-host for free, forever.</sub>
</p>

<p align="center">
  <a href="https://interaone.app">Website</a> ·
  <a href="https://doc.interaone.app">Docs</a> ·
  <a href="https://discord.gg/interaone">Discord</a> ·
  <a href="https://github.com/InteraOne/InteraOne/issues">Report Bug</a> ·
  <a href="https://github.com/InteraOne/InteraOne/issues">Request Feature</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/InteraOne/InteraOne?style=social" alt="GitHub Stars">
  <img src="https://img.shields.io/github/forks/InteraOne/InteraOne?style=social" alt="GitHub Forks">
  <img src="https://img.shields.io/github/license/InteraOne/InteraOne" alt="License">
  <img src="https://img.shields.io/badge/latency-500ms-brightgreen" alt="500ms latency">
  <img src="https://img.shields.io/badge/self--hosted-one%20click-blue" alt="Self Hosted">
</p>

<br/>

<img width="1536" height="1024" alt="InteraOne Dashboard" src="https://github.com/user-attachments/assets/671150cc-bb07-4e53-8d8b-12fced32559b" />

<hr/>

## Why InteraOne?

| | InteraOne | Intercom | Zendesk | Chatwoot |
|---|---|---|---|---|
| **Price** | Free & Open Source | $74/month | $55/month | Limited free |
| **Self-hosted** | ✅ One click | ❌ | ❌ | ✅ |
| **Single AI Brain** | ✅ | ❌ | ❌ | ❌ |
| **WhatsApp + Email + Telegram + Widget** | ✅ | Partial | Partial | ✅ |
| **Agent Latency** | ⚡ 500ms | Slow | Slow | No AI |
| **4 LLM Providers** | ✅ | ❌ | ❌ | ❌ |
| **RAG Knowledge Base** | ✅ | Limited | Limited | ❌ |
| **Ticket + Inbox + Contacts AI** | ✅ | Partial | ✅ | ❌ |
| **QR Code Offline→Online** | ✅ | ❌ | ❌ | ❌ |

<hr/>


<img width="1536" height="1024" alt="tech-poster" src="https://github.com/user-attachments/assets/fd53d983-e9f6-4677-83f6-83df4a3b5f5f" />


## 🚀 Quick One Click Dev Setup

### 1. Fork the Repository

Fork this repository to your GitHub account.

### 2. Clone Your Fork

```bash
git clone https://github.com/<your-username>/interaOne.git
cd interaOne
```

---

### 3. Configure Environment Variables

Copy all environment templates:

```bash
cp apps/gateway/.env.example apps/gateway/.env
cp apps/console/.env.example apps/console/.env
cp apps/agent/.env.example apps/agent/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/launcher/.env.example apps/launcher/.env
```

Update the `.env` files as needed for your local setup.

---

### 4. Start the Development Environment

```bash
make all
```

## ❤️ Contributors

Thanks to these amazing people who are building InteraOne! 🚀

<a href="https://github.com/interaone/interaone/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=interaone/interaone" />
</a>


## 🌟 Star Us!

If you find InteraOne useful, please consider giving us a star on GitHub! It helps us grow and improve the project.
