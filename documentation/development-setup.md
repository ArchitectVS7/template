# Development Workflow Setup Guide

*Complete guide to the automated development workflow tools and practices*

## Overview

This project implements a comprehensive development workflow automation suite including:

- **Continuous Integration/Continuous Deployment (CI/CD)** with GitHub Actions
- **Automated Testing** with Jest (backend) and Vitest (frontend)
- **Code Quality Enforcement** with ESLint and Prettier
- **Pre-commit Hooks** with Husky and lint-staged
- **Security Scanning** with npm audit and audit-ci
- **Dependency Management** with automated vulnerability detection

## Getting Started

### Prerequisites

Before contributing to this project, ensure you have:

- Node.js 20+ and npm 10+
- Git with proper configuration
- IDE with ESLint and Prettier extensions

### Initial Setup

1. **Clone the repository and install dependencies:**
   ```bash
   git clone <repository-url>
   cd template
   npm install
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

2. **Setup the database:**
   ```bash
   npm run setup:db
   npm run db:migrate
   npm run db:seed
   ```

3. **Initialize Husky pre-commit hooks:**
   ```bash
   npm run prepare
   ```

## Development Workflow Tools

### Code Quality Automation

#### ESLint Configuration
- **Backend**: Configured with TypeScript, Node.js, and Jest rules
- **Frontend**: Configured with React, TypeScript, and Vitest rules
- **Security**: Includes security-focused linting rules
- **Run**: `npm run lint` (both projects) or `npm run lint --prefix backend`

#### Prettier Formatting
- **Consistent**: Unified formatting rules across frontend and backend
- **Automatic**: Formats on save when IDE extensions are configured
- **Run**: `npm run format` (both projects) or `npm run format --prefix backend`

#### Pre-commit Hooks (Husky)
Automatically runs before each commit:
1. **Lint-staged**: Formats and lints only changed files
2. **Tests**: Runs test suites to prevent broken commits
3. **Security**: Basic dependency vulnerability checks

To bypass pre-commit hooks (emergency only):
```bash
git commit --no-verify -m "Emergency commit message"
```

### Testing Framework

#### Backend Testing (Jest)
- **Unit Tests**: Individual function and service testing
- **Integration Tests**: API endpoint testing with test database
- **Coverage**: Comprehensive code coverage reporting
- **Run**: `npm test --prefix backend`
- **Watch**: `npm run test:watch --prefix backend`

#### Frontend Testing (Vitest)
- **Component Tests**: React component testing with Testing Library
- **Unit Tests**: Business logic and utility function testing
- **Coverage**: Code coverage with V8 provider
- **Run**: `npm test --prefix frontend`
- **UI**: `npm run test:ui --prefix frontend` (interactive test runner)

#### End-to-End Testing (Playwright)
- **User Workflows**: Complete user journey testing
- **Cross-browser**: Automated testing across different browsers
- **Run**: `npm run test:e2e --prefix frontend`

### Security and Dependency Management

#### Vulnerability Scanning
- **npm audit**: Built-in dependency vulnerability scanning
- **audit-ci**: Automated security checks in CI pipeline
- **Configuration**: `audit-ci.json` controls severity thresholds
- **Run**: `npm run security:check`

#### Dependency Updates
- **Manual**: Regular dependency updates as part of maintenance
- **Automated**: Dependabot configuration for security updates
- **Testing**: All updates trigger full test suite

## Continuous Integration Pipeline

### GitHub Actions Workflow

The CI/CD pipeline (`/.github/workflows/ci.yml`) includes:

1. **Setup Phase**
   - Node.js environment preparation
   - Dependency caching and installation
   - Parallel setup for backend and frontend

2. **Code Quality Phase**
   - ESLint checks for both projects
   - Prettier formatting verification
   - TypeScript compilation validation

3. **Testing Phase**
   - Backend unit and integration tests
   - Frontend component and unit tests
   - Coverage report generation

4. **Security Phase**
   - Dependency vulnerability scanning
   - Secret detection (prevents credential commits)
   - Security audit reporting

5. **Build Phase**
   - Backend TypeScript compilation
   - Frontend production build
   - Artifact generation for deployment

6. **End-to-End Testing** (main branch only)
   - Full application testing
   - User workflow validation
   - Cross-browser compatibility

7. **Deployment Readiness**
   - Configuration validation
   - Environment check
   - Deployment preparation

### Branch Strategy

- **main**: Production-ready code, requires all checks to pass
- **develop**: Integration branch for feature development
- **feature/***: Individual feature development branches
- **hotfix/***: Emergency fixes for production issues

### Pull Request Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Pre-commit hooks ensure code quality
4. Push triggers CI pipeline
5. Code review process
6. Merge to `develop` after approval
7. Deploy to production via `main` branch

## Local Development Scripts

### Root Level Commands
```bash
# Start both frontend and backend
npm run dev

# Run all tests
npm test

# Build both projects
npm run build

# Format all code
npm run format

# Check formatting
npm run format:check

# Lint all code
npm run lint

# Security audit
npm run security:audit
```

### Backend Commands
```bash
cd backend

# Development server with hot reload
npm run dev

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Code quality
npm run lint
npm run format

# Database operations
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
```

### Frontend Commands
```bash
cd frontend

# Development server
npm run dev

# Testing
npm test
npm run test:ui
npm run test:coverage
npm run test:e2e

# Code quality
npm run lint
npm run format

# Build
npm run build
npm run preview
```

## IDE Configuration

### VSCode Extensions (Recommended)
- ESLint
- Prettier - Code formatter
- TypeScript Importer
- Jest
- GitLens

### Settings (`.vscode/settings.json`)
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.format.enable": true,
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Troubleshooting

### Common Issues

#### Pre-commit Hook Failures
```bash
# Fix formatting issues
npm run format

# Fix linting issues
npm run lint

# Run tests locally
npm test
```

#### Test Failures
```bash
# Clear test cache
npm test -- --clearCache --prefix backend
npm test -- --run --prefix frontend

# Reset test database
npm run db:reset
```

#### Build Issues
```bash
# Clear dist folders
rm -rf backend/dist frontend/dist

# Reinstall dependencies
rm -rf node_modules backend/node_modules frontend/node_modules
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

#### ESLint/Prettier Conflicts
```bash
# Check for conflicts
npm run format:check

# Fix automatically
npm run format
```

### CI Pipeline Debugging

#### Failed Checks
1. Review GitHub Actions logs
2. Run failing commands locally
3. Check environment variable configuration
4. Verify dependency versions

#### Security Scan Failures
1. Review vulnerability report
2. Update affected dependencies
3. Add exceptions to `audit-ci.json` if necessary
4. Re-run security checks

## Best Practices

### Code Quality
- Write tests for new features
- Maintain test coverage above 80%
- Follow established code style
- Use meaningful commit messages

### Git Workflow
- Keep feature branches focused
- Rebase before merging
- Use conventional commit messages
- Squash commits when appropriate

### Security
- Never commit sensitive information
- Regularly update dependencies
- Review security scan results
- Use environment variables for configuration

### Performance
- Monitor bundle sizes
- Optimize database queries
- Use appropriate caching strategies
- Profile performance regularly

This workflow automation ensures code quality, security, and reliability while maintaining developer productivity and project maintainability.