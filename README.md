# ZoomVconnect

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-95.1%25-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-≥20-green?logo=node.js)](https://nodejs.org/)
[![PNPM](https://img.shields.io/badge/PNPM-≥8-orange?logo=pnpm)](https://pnpm.io/)

**Enterprise-grade video conferencing platform built with WebRTC and SFU architecture.**

[Features](#features) • [Quick Start](#quick-start) • [Architecture](#architecture) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## 🎯 Features

- **Real-time Video Conferencing** - High-quality, low-latency HD video calls with adaptive bitrate streaming
- **Scalable SFU Architecture** - Selective Forwarding Unit supporting 1-1000+ concurrent participants via LiveKit
- **Multi-platform Support** - Web, iOS, Android, and Desktop (Electron) clients
- **Screen Sharing** - Share entire screen, individual windows, or browser tabs with synchronized audio
- **In-Meeting Chat** - Real-time messaging, private DMs, and chat history
- **Cloud Recording** - Automatic recording with optional AI transcription and search
- **Breakout Rooms** - Dynamic participant assignment for group discussions
- **Enterprise Security** - DTLS-SRTP encryption, optional End-to-End Encryption (E2EE), waiting rooms, and host controls

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│  │   Web   │  │   iOS   │  │ Android │  │ Desktop │                 │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                 │
└───────┼────────────┼────────────┼────────────┼──────────────────────┘
        │            │            │            │
        └────────────┴─────┬──────┴────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │            EDGE LAYER               │
        │  ┌────────────────────────────┐     │
        │  │    Global Load Balancer    │     │
        │  └────────────┬───────────────┘     │
        └───────────────┼─────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │         CONTROL PLANE         │
        │  ┌─────────┐  ┌────────────┐  │
        │  │   API   │  │ Signaling  │  │
        │  │ Gateway │  │   Server   │  │
        │  └────┬────┘  └─────┬──────┘  │
        │       │             │         │
        │  ┌────┴─────────────┴────┐    │
        │  │        Redis          │    │
        │  └───────────────────────┘    │
        └───────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │          MEDIA PLANE          │
        │  ┌─────────────────────────┐  │
        │  │    LiveKit SFU Nodes    │  │
        │  │  (Auto-scaled cluster)  │  │
        │  └─────────────────────────┘  │
        └───────────────────────────────┘
```

**Architecture Overview:**
- **Clients Layer**: Multi-platform endpoints (Web, iOS, Android, Desktop)
- **Edge Layer**: Global load balancing for optimal regional routing
- **Control Plane**: API gateway, WebSocket signaling, and Redis state management
- **Media Plane**: LiveKit SFU nodes with auto-scaling capabilities

---

## 📦 Project Structure

```
ZoomVconnect/
├── apps/
│   ├── api/              # NestJS REST API Gateway
│   ├── web/              # Next.js Web Client (React)
│   ├── signaling/        # WebSocket Signaling Server
│   └── desktop/          # Electron Desktop Application (planned)
├── packages/
│   ├── database/         # Prisma ORM & Data Models
│   ├── shared/           # Shared TypeScript Types & Utilities
│   └── webrtc-client/    # WebRTC Client SDK
├── services/             # Microservices (Analytics, Notifications, etc.)
├── infra/                # Infrastructure & DevOps
│   ├── livekit/          # LiveKit SFU Configuration
│   ├── kubernetes/       # Kubernetes Manifests (K8s)
│   └── docker/           # Docker Compose files
├── docs/                 # Project Documentation
└── scripts/              # Build & Utility Scripts
```

---

## 🚀 Quick Start

### Prerequisites

Before starting, ensure you have:

| Requirement | Minimum Version | Purpose |
|-------------|-----------------|---------|
| Node.js | 20+ | JavaScript runtime |
| PNPM | 8+ | Package manager (faster than npm/yarn) |
| Docker | Latest | Container runtime |
| Docker Compose | Latest | Multi-container orchestration |
| Git | Latest | Version control |

### Installation & Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/KuthadiRaghav/zoomvconnect.git
cd zoomvconnect
```

#### 2. Install Dependencies

```bash
pnpm install
```

#### 3. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit with your configuration
nano .env  # or your preferred editor
```

**Essential Environment Variables:**

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/zoomvconnect

# Cache & Session
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# LiveKit SFU
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret

# Optional: SendGrid for emails
SENDGRID_API_KEY=your-sendgrid-key

# Optional: S3 for recording storage
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

#### 4. Start Infrastructure

```bash
# Start all services (PostgreSQL, Redis, LiveKit)
docker-compose up -d

# Verify services are running
docker-compose ps
```

#### 5. Initialize Database

```bash
# Generate Prisma client
pnpm db:generate

# Apply migrations
pnpm db:push
```

#### 6. Start Development Servers

```bash
# Start all apps in watch mode
pnpm dev

# Or start individual apps:
pnpm dev --filter api
pnpm dev --filter web
pnpm dev --filter signaling
```

**Access Points:**
- 🌐 Web Client: http://localhost:3000
- 🔌 API Server: http://localhost:4000
- 📚 API Documentation: http://localhost:4000/api/docs
- 💬 Signaling Server: ws://localhost:8080

---

## 🔧 Development Guide

### Available Commands

```bash
# Development
pnpm dev                # Start all apps in watch mode
pnpm dev:web            # Start only web app
pnpm dev:api            # Start only API
pnpm dev:signaling      # Start only signaling server

# Building
pnpm build              # Build all packages and apps
pnpm build --filter api # Build specific app

# Testing
pnpm test               # Run all tests
pnpm test:watch         # Run tests in watch mode
pnpm test:coverage      # Generate coverage report

# Code Quality
pnpm lint               # Run ESLint
pnpm lint:fix           # Fix linting issues
pnpm format             # Format code with Prettier
pnpm type-check         # Check TypeScript types

# Database
pnpm db:generate        # Generate Prisma client
pnpm db:push            # Sync schema to database
pnpm db:migrate         # Run migrations
pnpm db:migrate:dev     # Create and run new migration
pnpm db:studio          # Open Prisma Studio UI

# Docker
pnpm docker:build       # Build Docker images
pnpm docker:push        # Push to registry
```

---

## 📚 API Documentation

### Interactive API Docs

When the API server is running, access comprehensive Swagger documentation at:

```
http://localhost:4000/api/docs
```

### Core API Endpoints

#### 🔐 Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Create new account | ❌ |
| POST | `/api/v1/auth/login` | Authenticate user | ❌ |
| POST | `/api/v1/auth/refresh` | Refresh access token | ✅ |
| POST | `/api/v1/auth/logout` | Invalidate session | ✅ |
| GET | `/api/v1/auth/me` | Get current user | ✅ |

#### 📞 Meetings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/meetings` | Create new meeting | ✅ |
| GET | `/api/v1/meetings` | List user meetings | ✅ |
| GET | `/api/v1/meetings/:id` | Get meeting details | ✅ |
| PATCH | `/api/v1/meetings/:id` | Update meeting | ✅ |
| DELETE | `/api/v1/meetings/:id` | Cancel meeting | ✅ |
| POST | `/api/v1/meetings/:id/join` | Generate join token | ✅ |
| POST | `/api/v1/meetings/:id/end` | End active meeting | ✅ |

#### 🎥 Recordings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/recordings` | List recordings | ✅ |
| GET | `/api/v1/recordings/:id` | Get recording metadata | ✅ |
| GET | `/api/v1/recordings/:id/download` | Download recording | ✅ |
| DELETE | `/api/v1/recordings/:id` | Delete recording | ✅ |

---

## 🔐 Security Features

### Transport Security

- **Media**: DTLS 1.3 + SRTP encryption for all peer-to-peer connections
- **Signaling**: TLS 1.3 for all WebSocket and HTTP connections
- **Infrastructure**: All inter-service communication encrypted with mTLS

### Authentication & Authorization

- **JWT Tokens**: Access/refresh token pattern with configurable expiration
- **Role-Based Access Control (RBAC)**:
  - **Host**: Full meeting control (recording, participant management, breakout rooms)
  - **Co-host**: Participant management and recording control
  - **Attendee**: Basic video/audio participation
- **Multi-Factor Authentication**: Optional TOTP 2FA support

### Meeting Security

- **Passcodes**: Optional numeric or alphanumeric passwords per meeting
- **Waiting Rooms**: Host approval required before participant entry
- **Host Controls**: Mute/unmute, remove participants, end for all, lock meeting
- **Optional E2EE**: Insertable Streams API for additional encryption layer

### Data Protection

- **Encryption at Rest**: Database encryption with industry-standard ciphers
- **PII Redaction**: Automatic sensitive data masking in logs
- **GDPR Compliance**: Right to be forgotten, data portability support

---

## 📈 Scaling & Deployment

### Horizontal Scaling

- **API Gateway**: Stateless nodes behind load balancer
- **Signaling Servers**: Redis pub/sub for multi-instance coordination
- **LiveKit Nodes**: Auto-scaling based on participant count and resource utilization

### Regional Deployment

- **Global CDN**: Distribute recordings and static content
- **Regional SFU Nodes**: Deploy media servers close to users for optimal latency
- **Kubernetes**: Full K8s manifests included for cloud-native deployment

### Performance Optimization

- **Adaptive Bitrate**: Automatic quality adjustment based on network conditions
- **Connection Pooling**: Optimized database connection management
- **Redis Caching**: Session and state caching for reduced latency
- **Media Optimization**: VP8/VP9 codec selection and simulcast support

---

## 🗺️ Product Roadmap

### ✅ MVP (Current - Production Ready)
- [x] Core 1-on-1 and group meetings
- [x] Web client (React/Next.js)
- [x] Cloud recording (MP4)
- [x] Screen sharing with audio
- [x] In-meeting chat

### 📋 Phase 2 (Q3-Q4 2026)
- [ ] Native iOS app (Swift)
- [ ] Native Android app (Kotlin)
- [ ] Scheduled/recurring meetings
- [ ] Breakout rooms
- [ ] Waiting room improvements

### 🚀 Phase 3 (2027)
- [ ] Live captions & transcription
- [ ] AI meeting summaries
- [ ] Virtual backgrounds
- [ ] Hand raise feature
- [ ] Polls and Q&A

### 🏢 Enterprise Edition
- [ ] SSO/SAML integration
- [ ] Admin dashboard & analytics
- [ ] Custom branding & white-label
- [ ] On-premise deployment
- [ ] Dedicated support SLA

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** with clear messages (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request** with description of changes

### Development Workflow

```bash
# Create feature branch from main
git checkout -b feature/your-feature-name

# Install dependencies
pnpm install

# Make your changes and run tests
pnpm test

# Format and lint
pnpm format
pnpm lint:fix

# Push and create PR
git push origin feature/your-feature-name
```

### Code Style

- **Language**: TypeScript (strict mode)
- **Formatter**: Prettier (2-space indent)
- **Linter**: ESLint with recommended config
- **Testing**: Jest with >80% coverage target

---

## 📊 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js, React, TailwindCSS | Latest |
| **Backend** | NestJS, Node.js | 20+ |
| **Real-time** | LiveKit, WebRTC | Latest |
| **Database** | PostgreSQL, Prisma | 15+ |
| **Cache** | Redis | 7+ |
| **Messaging** | Socket.io | 4+ |
| **Container** | Docker, Kubernetes | Latest |
| **Language** | TypeScript | 5+ |

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support & Resources

- **Documentation**: [Comprehensive Docs](./docs/README.md)
- **API Reference**: http://localhost:4000/api/docs (when running)
- **LiveKit Docs**: https://docs.livekit.io
- **Report Issues**: [GitHub Issues](https://github.com/KuthadiRaghav/zoomvconnect/issues)

---

<div align="center">

**Made with ❤️ by Kuthadi Raghav**

[⬆ Back to Top](#zoomvconnect)

</div>
