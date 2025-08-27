# Web Application MVP Template

A production-ready web application template featuring authentication, modern UI components, AI development assistance, and enterprise deployment capabilities.

## Technology Stack

**Frontend:** Vite + React + TypeScript + Tailwind CSS + shadcn/ui  
**Backend:** Node.js + Express + TypeScript + Prisma  
**Database:** PostgreSQL  
**Deployment:** Render (primary) with multi-platform support  

## Core Features

- **Complete Authentication System** - JWT-based security with role-based access control
- **Modern UI Component Library** - Professional interface with light/dark theme support
- **Debug Terminal** - Real-time monitoring tool designed for AI-assisted development
- **LLM Integration** - Built-in Claude AI chat with conversation management
- **Configuration Management** - Dual persistence with export/import capabilities
- **One-Click Deployment** - Automated infrastructure provisioning and deployment

## Quick Start

1. Fork this repository
2. Deploy to Render using the included blueprint
3. Access your live application in under 30 minutes

What you need to do locally
Ensure PostgreSQL is running and the database exists.

Example DATABASE_URL: postgresql://username:password@localhost:5432/ai_dev_mvp
Create DB if needed: createdb ai_dev_mvp
Set env variables

backend/.env: ensure DATABASE_URL is Postgres, PORT=3001, FRONTEND_URL=http://localhost:5174, and optionally ENABLE_REQUEST_LOGGING=true.
prisma/.env: ensure DATABASE_URL matches backend/.env.
Generate client and run migrations

From repo root:
npm run db:migrate
npm run db:seed
Run locally

npm run dev
Backend should be at http://localhost:3001, frontend at http://localhost:5174.
Render deployment readiness
render.yaml is already set to provision Postgres and wire env vars.
With Prisma set to Postgres and migrations prepared, deployment should work:
Backend build: cd backend && npm install && npm run build
Start: cd backend && npm start
Static frontend served from frontend/dist.
Optional small polish
If you want less log noise in prod: set ENABLE_REQUEST_LOGGING=false on Render.
Verify CORS and WebSocket origins via FRONTEND_URL/CORS_ORIGIN envs (already wired in render.yaml).

For detailed instructions, see the [Quick Start Guide](/user-docs/quick-start-guide.md).

## Documentation

### User Documentation

#### [Quick Start Guide](/user-docs/quick-start-guide.md)
Get from repository fork to deployed MVP in 30 minutes. Includes deployment and initial setup instructions.

#### [User Manual](/user-docs/user-manual.md)
Comprehensive guide to application features, customization, and usage.

### Developer Documentation

#### [Development Workflow](/design-docs/03-development-workflow.md)
Professional development practices including Git workflow, security protocols, CI/CD pipeline, and team collaboration standards.

#### [Production Deployment Guide](/design-docs/04-production-guide.md)
Enterprise deployment strategies, monitoring implementation, performance optimization, and scaling considerations.

## Target Audience

Mid-level developers (2-4 years experience) seeking to establish professional development standards with rapid deployment capabilities. The template balances comprehensive features with practical implementation for MVP development.

## Debug Terminal for AI Development

The included debug terminal provides real-time system monitoring specifically designed to support AI-assisted development. This tool captures the detailed logs and system insights that AI coding assistants need for effective debugging and optimization suggestions.

## License

MIT License - see LICENSE file for details.

## Support

Refer to the troubleshooting sections in each documentation guide for common issues and solutions. The debug terminal provides real-time diagnostics for development and production environments.
