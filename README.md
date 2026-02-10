# ZoomVconnect

Enterprise-grade video conferencing platform built with WebRTC and SFU architecture.

## 🎯 Features

- **Real-time Video Conferencing** - High-quality, low-latency video calls
- **Scalable SFU Architecture** - Support for 1-1000+ participants via LiveKit
- **Multi-platform** - Web, iOS, Android, Desktop
- **Screen Sharing** - Share screen, window, or tab with audio
- **Chat** - In-meeting messaging with private DMs
- **Recording** - Cloud recording with transcription
- **Breakout Rooms** - Dynamic participant assignment
- **Enterprise Security** - DTLS-SRTP, optional E2EE, waiting rooms

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │   Web   │  │   iOS   │  │ Android │  │ Desktop │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
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

## 📦 Monorepo Structure

```
ZoomVconnect/
├── apps/
│   ├── api/          # NestJS API Gateway
│   ├── web/          # Next.js Web Client
│   ├── signaling/    # WebSocket Signaling Server
│   └── desktop/      # Electron App (planned)
├── packages/
│   ├── database/     # Prisma Schema & Client
│   ├── shared/       # Shared Types & Utilities
│   └── webrtc-client # WebRTC Client SDK
├── services/         # Microservices (planned)
├── infra/            # Infrastructure configs
│   ├── livekit/      # SFU Configuration
│   └── kubernetes/   # K8s Manifests (planned)
└── docs/             # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20
- PNPM >= 8
- Docker & Docker Compose

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/zoomvconnect.git
cd zoomvconnect

# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, Redis, LiveKit)
docker-compose up -d

# Generate Prisma client
pnpm db:generate

# Push database schema
pnpm db:push

# Start all services in development mode
pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `LIVEKIT_API_KEY` - LiveKit API key
- `LIVEKIT_API_SECRET` - LiveKit API secret

## 🔧 Development

### Available Scripts

```bash
# Run all apps in dev mode
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint codebase
pnpm lint

# Format code
pnpm format

# Database operations
pnpm db:generate   # Generate Prisma client
pnpm db:push       # Push schema changes
pnpm db:migrate    # Run migrations
pnpm db:studio     # Open Prisma Studio
```

### API Documentation

When running the API, Swagger docs are available at:
- http://localhost:4000/api/docs

## 📚 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh token |
| POST | `/api/v1/auth/logout` | Logout |

### Meetings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/meetings` | Create meeting |
| GET | `/api/v1/meetings` | List meetings |
| GET | `/api/v1/meetings/:id` | Get meeting |
| PATCH | `/api/v1/meetings/:id` | Update meeting |
| DELETE | `/api/v1/meetings/:id` | Cancel meeting |
| POST | `/api/v1/meetings/:id/join` | Join meeting |
| POST | `/api/v1/meetings/:id/end` | End meeting |

### Recordings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/recordings` | List recordings |
| GET | `/api/v1/recordings/:id` | Get recording |
| DELETE | `/api/v1/recordings/:id` | Delete recording |

## 🔐 Security

- **Transport Security**: DTLS 1.3 + SRTP for media, TLS 1.3 for signaling
- **Authentication**: JWT with access/refresh token pattern
- **Authorization**: Role-based access control (Host, Co-host, Attendee)
- **Meeting Security**: Passcodes, waiting rooms, host controls
- **Optional E2EE**: Insertable Streams API for end-to-end encryption

## 📈 Scaling

- **API**: Horizontal scaling behind load balancer
- **Signaling**: Redis pub/sub for multi-instance support
- **SFU**: Auto-scaling based on participant count
- **Regional**: Deploy media nodes close to users
- **CDN**: Recordings served via CDN

## 🗺️ Roadmap

### MVP (Current)
- [x] Core meeting functionality
- [x] Web client
- [x] Recording

### Phase 2
- [ ] Mobile apps (iOS/Android)
- [ ] Scheduled meetings
- [ ] Breakout rooms
- [ ] Waiting rooms

### Phase 3
- [ ] Live captions
- [ ] AI transcription
- [ ] Meeting summaries
- [ ] Virtual backgrounds

### Enterprise
- [ ] SSO/SAML
- [ ] Admin dashboard
- [ ] Custom branding
- [ ] On-premise deployment

## 📄 License

MIT
