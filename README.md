# PeerDrop

> Privacy-first peer-to-peer file transfer using WebRTC

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)

## Features

- 🔒 **Privacy-First**: Files never touch the server, direct peer-to-peer transfer
- ⚡ **Fast**: Achieves 80%+ of available bandwidth between peers
- 🌍 **Cross-Platform**: Works on any device with a modern browser
- 🎯 **Simple**: No sign-up, no installation, just share a room code
- 🔐 **Secure**: WebRTC encryption (DTLS) enabled by default
- 📱 **Responsive**: Optimized for mobile, tablet, and desktop

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Start development servers (frontend + signaling server)
pnpm dev

# Build for production
pnpm build
```

### Development

```bash
# Run all tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## Project Structure

```
2-peerdrop/
├── packages/
│   ├── frontend/          # React SPA (Vite)
│   └── signaling-server/  # Node.js WebSocket server
├── package.json           # Monorepo root
└── pnpm-workspace.yaml    # Workspace configuration
```

## How It Works

1. **Sender** creates a room and receives a unique 6-character code
2. **Receiver** joins using the room code
3. WebRTC connection established via signaling server
4. Files transferred directly between browsers (P2P)
5. No data stored on server

## Architecture

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand
- **Signaling**: Node.js, Express, Socket.IO
- **P2P Transfer**: WebRTC (RTCDataChannel)
- **Deployment**: Vercel (frontend) + Railway (signaling server)

## Compliance

- ✅ No server-side file storage (ephemeral processing only)
- ✅ WCAG 2.2 AA accessibility compliant
- ✅ GDPR principles (data minimization, zero PII)
- ✅ WebRTC encryption (DTLS) by default
- ✅ 24-hour room expiration

## License

[MIT](LICENSE)

## Acknowledgments

- Built with [WebRTC](https://webrtc.org/)
- Powered by [Socket.IO](https://socket.io/)
