---
description: Repository Information Overview
alwaysApply: true
---

# Repository Information Overview

## Repository Summary

A production-ready web application template featuring authentication, modern UI components, AI development assistance, and enterprise deployment capabilities. The project follows a monorepo structure with separate frontend and backend packages, and a shared Prisma database layer.

## Repository Structure

- **frontend/**: React application built with Vite, TypeScript, and Tailwind CSS
- **backend/**: Express.js API server with TypeScript
- **prisma/**: Database schema and migrations using Prisma ORM
- **scripts/**: Utility scripts for development setup
- **.github/**: CI/CD workflows
- **\_docs/**: Project documentation

### Main Repository Components

- **Frontend Application**: React SPA with authentication, dashboard, and chat interface
- **Backend API**: Express.js server with REST endpoints and WebSocket support
- **Database Layer**: Prisma ORM with SQLite for development and PostgreSQL for production
- **Deployment Configuration**: Render.yaml for one-click cloud deployment

## Projects

### Backend (Node.js API)

**Configuration File**: backend/package.json

#### Language & Runtime

**Language**: TypeScript
**Version**: TypeScript 5.9.x
**Build System**: tsc (TypeScript Compiler)
**Package Manager**: npm

#### Dependencies

**Main Dependencies**:

- express 5.1.0 (API framework)
- @prisma/client 6.14.0 (Database ORM)
- socket.io 4.8.1 (WebSocket server)
- jsonwebtoken 9.0.2 (Authentication)
- winston 3.17.0 (Logging)
- @anthropic-ai/sdk 0.60.0 (AI integration)

#### Build & Installation

```bash
cd backend
npm install
npm run build
```

#### Testing

**Framework**: Jest 29.7.0 with ts-jest
**Test Location**: src/**tests**/
**Naming Convention**: \*.test.ts
**Run Command**:

```bash
npm test
```

### Frontend (React SPA)

**Configuration File**: frontend/package.json

#### Language & Runtime

**Language**: TypeScript
**Version**: TypeScript 5.8.x
**Build System**: Vite 7.1.x
**Package Manager**: npm

#### Dependencies

**Main Dependencies**:

- react 19.1.1
- react-dom 19.1.1
- react-router-dom 7.8.0
- @tanstack/react-query 5.85.3
- tailwindcss 4.1.12
- socket.io-client 4.8.1
- zod 4.0.17 (Schema validation)

#### Build & Installation

```bash
cd frontend
npm install
npm run build
```

#### Testing

**Framework**: Vitest 2.1.x with @testing-library/react
**Test Location**: src/**tests**/
**Naming Convention**: \*.test.tsx
**Run Command**:

```bash
npm test
```

### Database (Prisma)

**Configuration File**: prisma/schema.prisma

#### Language & Runtime

**ORM**: Prisma 6.14.0
**Database**: SQLite (development), PostgreSQL (production)

#### Schema Models

- User (Authentication)
- Session (User sessions)
- LLMConversation (AI chat conversations)
- LLMMessage (Individual AI messages)
- UserConfiguration (User settings)
- DebugLog (System logging)
- SystemHealth (Monitoring)

#### Commands

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed
```

### Deployment

**Configuration File**: render.yaml

#### Services

- Web service: Backend API (Node.js)
- Web service: Frontend static site
- Database: PostgreSQL

#### Environment Variables

- NODE_ENV
- PORT
- DATABASE_URL
- JWT_SECRET
- SESSION_SECRET
- CORS_ORIGIN
- FRONTEND_URL
