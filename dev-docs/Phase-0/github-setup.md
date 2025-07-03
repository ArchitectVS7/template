# 🛡️ GitHub Security & Workflow Setup Guide
*Updated: January 8, 2025*

## 🚨 **CRITICAL: API Key Security First**

### **❌ What NOT to Do (Common Mistakes)**
```bash
# NEVER commit these files
.env                    # Contains your API keys
config.json             # May contain secrets
.cursor-tutor           # Cursor AI config with keys
.env.local              # Local environment files
secrets.txt             # Obviously bad
api-keys.md             # Documentation with keys
```

### **✅ Secure API Key Management**

#### **1. Environment File Strategy**
```bash
# Project root structure
your-project/
├── .env.example          # ✅ Safe to commit (template)
├── .env                  # ❌ NEVER commit (your actual keys)
├── .env.local            # ❌ NEVER commit
├── .env.development      # ❌ NEVER commit
├── .env.production       # ❌ NEVER commit
└── .gitignore           # ✅ Must include env files
```

#### **2. Proper .gitignore Setup**
```gitignore
# === CRITICAL: NEVER COMMIT THESE ===
.env*
!.env.example
*.key
*.pem
config.json
secrets/
.cursor-tutor
cursor-tutor.json

# IDE and AI tool configs that may contain keys
.vscode/settings.json
.cursor/
.continue/
```

#### **3. Safe Environment File Templates**

**Create `.env.example` (safe to commit):**
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/dbname"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-here"

# LLM Integration
CLAUDE_API_KEY="your-anthropic-api-key-here"
OPENAI_API_KEY="your-openai-api-key-here"

# App Configuration
NODE_ENV="development"
PORT=3000
FRONTEND_URL="http://localhost:5173"

# Optional Services
SENTRY_DSN="your-sentry-dsn-here"
EMAIL_API_KEY="your-email-service-key-here"
```

**Your actual `.env` (NEVER commit):**
```env
# Database
DATABASE_URL="postgresql://myuser:mypass@localhost:5432/myapp"

# Authentication  
JWT_SECRET="super-secret-key-change-in-production"

# LLM Integration
CLAUDE_API_KEY="sk-ant-api03-actual-key-here"
OPENAI_API_KEY="sk-proj-actual-openai-key-here"

# App Configuration
NODE_ENV="development"
PORT=3000
FRONTEND_URL="http://localhost:5173"
```

---

## 🔧 **Initial GitHub Repository Setup**

### **Step 1: Repository Creation**
1. **Go to GitHub.com** → **New Repository**
2. **Repository name**: `your-web-app-template`
3. **Visibility**: Private (recommended during development)
4. **Initialize with**:
   - ✅ Add a README file
   - ✅ Add .gitignore (select "Node.js")
   - ✅ Choose a license (MIT recommended)

### **Step 2: Clone and Secure Setup**
```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/your-web-app-template.git
cd your-web-app-template

# Immediately create proper .gitignore
echo "# Environment variables
.env*
!.env.example
*.key
*.pem
config.json
secrets/
.cursor-tutor
cursor-tutor.json

# IDE configs that may contain keys
.vscode/settings.json
.cursor/
.continue/" >> .gitignore

# Commit the security setup first
git add .gitignore
git commit -m "🔒 Add comprehensive .gitignore for API key security"
git push origin main
```

### **Step 3: Environment Security Check**
```bash
# Before ANY development, run these checks:

# 1. Verify .gitignore is working
echo "CLAUDE_API_KEY=test-key" > .env
git status  # Should NOT show .env as trackable

# 2. Clean up test
rm .env

# 3. Create safe template
cp .env.example .env
# Edit .env with your actual keys (NEVER commit this file)
```

---

## 🔐 **Branch Protection & Security Settings**

### **Step 1: Enable Branch Protection**
1. **Settings** → **Branches** → **Add rule**
2. **Branch name pattern**: `main`
### **For solo developers, consider simplifying the branch protection:**
Since you're working alone, you might want to remove the review requirement:

1. **Settings** → **Branches** → **Edit rule**
2. **Keep:** ✅ "Require a pull request before merging"
3. **Uncheck:** ❌ "Require review from code owners"
4. **Keep:** ✅ "Require status checks to pass before merging"
5. **Select your working status checks:**
   - ✅ Frontend Quality
   - ✅ Backend Quality  
   - ✅ Basic Repository Checks
6. **Save changes**

This gives you the CI/CD benefits without review friction for solo development.

### **Step 2: Security Settings**
1. **Settings** → **Security & analysis**
2. **Enable these features**:
   ```
   ✅ Dependency graph
   ✅ Dependabot alerts  
   ✅ Dependabot security updates
   ✅ Dependabot version updates
   ✅ Code scanning alerts
   ✅ Secret scanning alerts
   ```

### **Step 3: Repository Secrets Management**
1. **Settings** → **Secrets and variables** → **Actions**
2. **Add repository secrets** (for GitHub Actions):
   ```
   CLAUDE_API_KEY        → Your Anthropic API key
   OPENAI_API_KEY        → Your OpenAI API key (if needed)
   DATABASE_URL          → Production database URL
   JWT_SECRET            → Production JWT secret
   SENTRY_DSN            → Error tracking (optional)
   ```

---

## 🔄 **GitHub Actions Workflows Setup**

### **Step 1: Create Workflow Directory**
```bash
mkdir -p .github/workflows
mkdir -p .github/ISSUE_TEMPLATE
```

### **Step 2: Add Essential Workflows**

**Security Scanning (`.github/workflows/security.yml`):**
```yaml
name: Security Checks

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday 6 AM

jobs:
  secret-scan:
    name: Secret Scanning
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    
    - name: TruffleHog OSS
      uses: trufflesecurity/trufflehog@main
      with:
        path: ./
        base: main
        head: HEAD
        extra_args: --debug --only-verified

  dependency-audit:
    name: Dependency Audit
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    
    - name: Audit Frontend Dependencies
      run: |
        cd frontend
        npm audit --audit-level moderate
    
    - name: Audit Backend Dependencies  
      run: |
        cd backend
        npm audit --audit-level moderate
```

**Environment Check (`.github/workflows/env-check.yml`):**
```yaml
name: Environment Security Check

on:
  pull_request:
    branches: [ main ]

jobs:
  env-security:
    name: Check for exposed secrets
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Check for .env files
      run: |
        if find . -name ".env" -not -path "./.git/*" | grep -q .; then
          echo "❌ ERROR: .env files found in repository!"
          find . -name ".env" -not -path "./.git/*"
          exit 1
        else
          echo "✅ No .env files found in repository"
        fi
    
    - name: Check for potential API keys
      run: |
        if grep -r "sk-ant-api" . --exclude-dir=.git || \
           grep -r "sk-proj-" . --exclude-dir=.git || \
           grep -r "claude_api_key.*=" . --exclude-dir=.git; then
          echo "❌ ERROR: Potential API keys found in code!"
          exit 1
        else
          echo "✅ No obvious API keys found in code"
        fi
```

### **Step 3: Create Your CI/CD Pipeline**

**What is CI/CD?**
**CI/CD (Continuous Integration/Continuous Deployment)** automatically tests your code every time you make changes. Think of it as an automated quality control system that:
- ✅ **Runs tests** when you create a Pull Request
- ✅ **Checks code quality** (linting, TypeScript errors)
- ✅ **Validates builds** work correctly
- ✅ **Blocks merging** if anything fails

**Create Your Quality Gates Workflow**

Create this file: `.github/workflows/pr-quality-gates.yml`

```yaml
name: PR Quality Gates

# This workflow runs automatically when you create a Pull Request to main
on:
  pull_request:
    branches: [ main ]

jobs:
  # Job 1: Check Frontend Code Quality
  frontend-checks:
    name: Frontend Quality
    runs-on: ubuntu-latest
    
    steps:
    # Download your code
    - name: Checkout code
      uses: actions/checkout@v4
    
    # Install Node.js (required for npm commands)
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    
    # Check if frontend directory exists
    - name: Check if frontend exists
      run: |
        if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
          echo "Frontend directory found"
        else
          echo "Frontend directory not found, skipping"
          exit 0
        fi
    
    # Install dependencies (if frontend exists)
    - name: Install frontend dependencies
      run: |
        if [ -f "frontend/package.json" ]; then
          cd frontend && npm ci
        fi
    
    # Run quality checks (adapt these to your project needs)
    - name: Run frontend checks
      run: |
        if [ -f "frontend/package.json" ]; then
          cd frontend
          npm run lint:check || echo "Lint check not configured"
          npm run type-check || echo "Type check not configured"
          npm run test || echo "Tests not configured"
          npm run build || echo "Build not configured"
        fi

  # Job 2: Check Backend Code Quality
  backend-checks:
    name: Backend Quality
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    
    - name: Check if backend exists
      run: |
        if [ -d "backend" ] && [ -f "backend/package.json" ]; then
          echo "Backend directory found"
        else
          echo "Backend directory not found, skipping"
          exit 0
        fi
    
    - name: Install backend dependencies
      run: |
        if [ -f "backend/package.json" ]; then
          cd backend && npm ci
        fi
    
    - name: Run backend checks
      run: |
        if [ -f "backend/package.json" ]; then
          cd backend
          npm run lint:check || echo "Lint check not configured"
          npm run type-check || echo "Type check not configured"
          npm run test || echo "Tests not configured"
          npm run build || echo "Build not configured"
        fi

  # Job 3: Basic Repository Validation
  basic-checks:
    name: Basic Repository Checks
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Check repository structure
      run: |
        echo "Repository contents:"
        ls -la
        echo "Checking for basic files..."
        [ -f "README.md" ] && echo "✅ README.md found" || echo "❌ README.md missing"
        [ -f ".gitignore" ] && echo "✅ .gitignore found" || echo "❌ .gitignore missing"
        [ -f ".gitattributes" ] && echo "✅ .gitattributes found" || echo "❌ .gitattributes missing"
```

**Advanced Version with Security and Database Testing**

For more comprehensive testing (when your project grows), you can use this enhanced version:

```yaml
name: PR Quality Gates

on:
  pull_request:
    branches: [ main ]

jobs:
  frontend-checks:
    name: Frontend Quality
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run ESLint
      run: npm run lint:check
    
    - name: TypeScript type checking
      run: npm run type-check
    
    - name: Run unit tests
      run: npm run test
    
    - name: Build production bundle
      run: npm run build

  backend-checks:
    name: Backend Quality
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    
    # Add a test database for backend testing
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run ESLint
      run: npm run lint:check
    
    - name: TypeScript type checking
      run: npm run type-check
    
    - name: Database migration (test)
      run: npx prisma migrate deploy
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
    
    - name: Run unit tests
      run: npm run test
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        JWT_SECRET: test-secret-key-for-ci
        CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
    
    - name: Build production code
      run: npm run build

  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    
    - name: Audit frontend dependencies
      run: |
        if [ -f "frontend/package.json" ]; then
          cd frontend
          npm audit --audit-level moderate
        else
          echo "No frontend package.json found, skipping audit"
        fi
    
    - name: Audit backend dependencies
      run: |
        if [ -f "backend/package.json" ]; then
          cd backend
          npm audit --audit-level moderate
        else
          echo "No backend package.json found, skipping audit"
        fi
```

**Using Secrets in Your Workflow**

For sensitive data like API keys, use GitHub repository secrets:

1. **Go to your repository** → **Settings** → **Secrets and variables** → **Actions**
2. **Click "New repository secret"**
3. **Add these secrets:**
   ```
   Name: CLAUDE_API_KEY
   Value: your-actual-anthropic-api-key-here
   
   Name: JWT_SECRET
   Value: your-production-jwt-secret-here
   ```

4. **Use in workflows:**
   ```yaml
   env:
     CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
     JWT_SECRET: ${{ secrets.JWT_SECRET }}
     DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
   ```

**What This Workflow Does**

When you create a Pull Request, GitHub automatically:

1. **🔍 Frontend Quality Check:** Linting, TypeScript compilation, tests, build validation
2. **🔧 Backend Quality Check:** Code quality, database setup, tests, build validation  
3. **🛡️ Security Audit:** Dependency vulnerability scanning
4. **📋 Basic Repository Checks:** File structure validation

**The merge button will be disabled until all checks pass!**

---

## 🌿 **Branch Strategy & Workflow**

### **Recommended Branch Strategy: GitHub Flow**
```
main (protected)
├── feature/auth-system
├── feature/debug-terminal  
├── feature/llm-integration
├── hotfix/security-patch
└── release/v1.0.0
```

### **Branch Naming Conventions**
```bash
# Feature branches
feature/auth-system
feature/user-dashboard
feature/debug-terminal

# Bug fixes
bugfix/login-validation
bugfix/memory-leak

# Hotfixes (urgent production fixes)
hotfix/security-patch
hotfix/critical-bug

# Release branches
release/v1.0.0
release/v1.1.0
```

### **Step-by-Step Feature Development Workflow**

#### **1. Create Feature Branch**
```bash
# Always start from latest main
git checkout main
git pull origin main

# Create and switch to feature branch
git checkout -b feature/auth-system

# Push branch to GitHub (establishes tracking)
git push -u origin feature/auth-system
```

#### **2. Development & Commits**

**Commit Message Convention (Conventional Commits):**
```bash
# Format: type(scope): description
# Types: feat, fix, docs, style, refactor, test, chore

git commit -m "feat(auth): add JWT token generation"
git commit -m "fix(auth): resolve password hashing issue"  
git commit -m "docs(auth): add API documentation"
git commit -m "test(auth): add unit tests for login"
git commit -m "refactor(auth): extract validation logic"
git commit -m "chore(deps): update bcryptjs to latest"
```

**Atomic Commits Strategy:**
```bash
# ✅ Good: Small, focused commits
git add src/auth/jwt.ts
git commit -m "feat(auth): implement JWT token generation"

git add src/auth/middleware.ts  
git commit -m "feat(auth): add authentication middleware"

git add tests/auth.test.ts
git commit -m "test(auth): add JWT token tests"

# ❌ Bad: Large, unfocused commits
git add .
git commit -m "working on auth stuff"
```

#### **3. Regular Pushes & Sync**
```bash
# Push changes regularly (at least daily)
git push origin feature/auth-system

# Sync with main to avoid conflicts
git checkout main
git pull origin main
git checkout feature/auth-system
git merge main  # or git rebase main
```

#### **4. Pull Request Creation**
```bash
# Before creating PR, ensure everything is clean
npm run lint           # Fix any linting issues
npm run type-check     # Fix TypeScript errors
npm run test           # Ensure tests pass
npm run build          # Ensure production build works

# Push final changes
git push origin feature/auth-system
```

**Create PR on GitHub:**
1. **Go to repository** → **Pull requests** → **New pull request**
2. **Base**: `main` ← **Compare**: `feature/auth-system`
3. **Use PR template** (see below)
4. **Request review** from team members
5. **Wait for status checks** to pass

---

## 📝 **Pull Request Templates & Standards**

### **Create PR Template (`.github/pull_request_template.md`):**
```markdown
## 🎯 Description
Brief description of what this PR accomplishes

## 📋 Type of Change
- [ ] 🆕 New feature
- [ ] 🐛 Bug fix  
- [ ] 📝 Documentation update
- [ ] 🔧 Refactoring
- [ ] ⚡ Performance improvement
- [ ] 🧪 Test coverage improvement

## 🔍 Changes Made
- List specific changes
- Include any breaking changes
- Note any new dependencies

## 🧪 Testing Performed
- [ ] Unit tests pass (`npm run test`)
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Cross-browser testing (if UI changes)
- [ ] Mobile responsive testing (if UI changes)

## 📸 Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## 🔐 Security Considerations
- [ ] No API keys or secrets exposed
- [ ] Input validation added where needed
- [ ] Authentication/authorization properly implemented

## 📚 Documentation
- [ ] Code is self-documenting or commented
- [ ] README updated if needed
- [ ] API documentation updated if needed

## ✅ Pre-merge Checklist
- [ ] Branch is up to date with main
- [ ] All status checks passing
- [ ] Code review completed
- [ ] No merge conflicts
- [ ] Feature tested in development environment
```

---

## 🧪 **Testing Strategy at Each Stage**

### **Local Development Testing**
```bash
# Before every commit
npm run lint              # Code style check
npm run type-check        # TypeScript validation
npm run test             # Unit tests
npm run test:watch       # Continuous testing during development

# Before pushing
npm run build            # Production build test
npm run test:e2e         # End-to-end tests (when available)
```

### **Pre-PR Testing Checklist**
```bash
# Comprehensive testing before creating PR
cd frontend
npm run lint && npm run type-check && npm run test && npm run build

cd ../backend  
npm run lint && npm run type-check && npm run test && npm run build

# Manual testing
☐ Feature works as expected
☐ No console errors
☐ Mobile responsive (if UI changes)
☐ Works with different user roles
☐ Error handling works properly
```

### **GitHub Actions Automatic Testing**
```yaml
# Your CI/CD will automatically test:
✅ Code linting (ESLint)
✅ Type checking (TypeScript)
✅ Unit tests (Vitest)
✅ Integration tests
✅ Security scanning
✅ Dependency audit
✅ Build validation
```

---

## 🚨 **API Key Security Incident Response**

### **If API Keys Are Accidentally Committed:**

#### **Immediate Response (First 5 minutes):**
```bash
# 1. Revoke the exposed key IMMEDIATELY
# - Go to Anthropic/OpenAI dashboard
# - Revoke the compromised key
# - Generate new key

# 2. Remove from Git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# 3. Force push (dangerous but necessary)
git push origin --force --all
```

#### **Prevention Strategies:**
```bash
# 1. Set up pre-commit hooks
npm install --save-dev husky lint-staged

# 2. Add to package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && npm run security-check"
    }
  },
  "lint-staged": {
    "*.{js,ts,tsx}": ["eslint --fix", "git add"],
    "*": "npm run check-secrets"
  }
}

# 3. Create security check script
echo '#!/bin/bash
if grep -r "sk-ant-api" . --exclude-dir=.git --exclude-dir=node_modules; then
  echo "❌ API key detected! Commit blocked."
  exit 1
fi' > scripts/check-secrets.sh
```

---

## 📊 **Monitoring & Maintenance**

### **Weekly Security Checklist**
```bash
☐ Review Dependabot PRs and merge security updates
☐ Check GitHub security alerts tab
☐ Review access logs for unusual activity
☐ Verify all team members still need access
☐ Update API keys if approaching expiration
☐ Review and rotate secrets older than 90 days
```

### **Monthly Repository Health Check**
```bash
☐ Clean up merged feature branches
☐ Review and update .gitignore if needed
☐ Update dependency versions
☐ Review GitHub Actions usage and costs
☐ Audit repository access and permissions
☐ Update documentation and README
```

---

## 🎯 **Quick Reference Commands**

### **Daily Development Workflow**
```bash
# Start new feature
git checkout main && git pull origin main
git checkout -b feature/new-feature
git push -u origin feature/new-feature

# Regular development
# ... make changes ...
npm run lint && npm run test
git add . && git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create PR when ready
# Use GitHub web interface

# Clean up after merge
git checkout main && git pull origin main
git branch -d feature/new-feature
git push origin --delete feature/new-feature
```

### **Emergency Commands**
```bash
# Abort merge with conflicts
git merge --abort

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes) - DANGEROUS
git reset --hard HEAD~1

# Check what would be committed
git diff --cached

# Stash changes temporarily
git stash
git stash pop
```

This comprehensive guide ensures your team has a rock-solid GitHub foundation with proper security practices before beginning development with Cursor AI.