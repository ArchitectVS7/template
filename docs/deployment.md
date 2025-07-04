# Deployment Guide

This application is configured for automatic deployment on Render using Infrastructure as Code.

## Render Configuration

The `render.yaml` file defines the complete infrastructure:

### Services

- **Frontend**: Static site hosting the React application
- **Backend**: Node.js web service running the Express API
- **Database**: PostgreSQL database with automatic backups
- **Worker**: Background job processing (optional)
- **Cron Jobs**: Scheduled tasks for maintenance

### Environment Variables

The following environment variables are automatically configured:

#### Backend

- `DATABASE_URL` - Auto-generated from database service
- `JWT_SECRET` - Auto-generated secure token
- `FRONTEND_URL` - Auto-linked to frontend service
- `NODE_ENV` - Set to "production"

#### Frontend

- `VITE_API_URL` - Auto-linked to backend service
- `VITE_APP_NAME` - Application display name

## Deployment Steps

1. **Connect Repository**
   - Go to [render.com](https://render.com)
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml`

2. **Deploy Infrastructure**
   - Click "Apply" to deploy all services
   - Database, backend, and frontend will be created
   - Environment variables will be auto-configured

3. **Domain Configuration**
   - Update domains in `render.yaml` with your actual domains
   - Configure DNS to point to Render

4. **API Keys (Optional)**
   - Add LLM API keys through Render dashboard:
     - `ANTHROPIC_API_KEY`
     - `OPENAI_API_KEY`
     - `PERPLEXITY_API_KEY`

## Monitoring

- Health checks are configured at `/api/health`
- Automatic restarts on failure
- Database connection monitoring
- Scheduled cleanup tasks

## Security Features

- Security headers automatically applied
- Environment variable encryption
- Database connection SSL by default
- CORS properly configured

## Cost

All services are configured for the free tier:

- Frontend: Free static site hosting
- Backend: Free web service (sleeps after 15 min inactivity)
- Database: Free PostgreSQL (1GB storage)
- Cron jobs: Included in free tier

## Scaling

To scale beyond free tier:

1. Upgrade plans in `render.yaml`
2. Commit and push changes
3. Render will automatically apply updates
