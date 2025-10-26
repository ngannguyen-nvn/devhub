# DevHub - Developer Mission Control

One dashboard to rule all your microservices.

## Features

- **Repository Dashboard**: Scan and manage all your git repositories
- **Docker Management**: Build, run, and orchestrate containers
- **Environment Variables**: Centralized env management across services
- **Service Orchestration**: Start/stop services with one click
- **Wiki/Notes**: Document your architecture and APIs
- **Workspace Snapshots**: Save and restore your entire dev environment

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Express + TypeScript + SQLite
- **Git Integration**: simple-git
- **Docker Integration**: dockerode

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- Docker (optional, for Docker features)

### Installation

```bash
# Install dependencies
npm install

# Start development servers
npm run dev
```

This will start:
- Frontend at http://localhost:3000
- Backend API at http://localhost:5000

### Development

```bash
# Start frontend only
npm run dev:frontend

# Start backend only
npm run dev:backend

# Build all packages
npm run build
```

## Project Structure

```
devhub/
├── frontend/          # React + Vite frontend
├── backend/           # Express API backend
├── shared/            # Shared TypeScript types
└── DEVHUB_PLAN.md     # Product roadmap
```

## Roadmap

See [DEVHUB_PLAN.md](./DEVHUB_PLAN.md) for the complete product roadmap.

## License

MIT
