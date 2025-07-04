version: 2
updates:

# Frontend dependencies

- package-ecosystem: "npm"
  directory: "/frontend"
  schedule:
  interval: "weekly"
  open-pull-requests-limit: 5
  assignees:
  - "YOUR_GITHUB_USERNAME"
    commit-message:
    prefix: "frontend"
    include: "scope"

# Backend dependencies

- package-ecosystem: "npm"
  directory: "/backend"
  schedule:
  interval: "weekly"
  open-pull-requests-limit: 5
  assignees:
  - "YOUR_GITHUB_USERNAME"
    commit-message:
    prefix: "backend"
    include: "scope"

# GitHub Actions

- package-ecosystem: "github-actions"
  directory: "/"
  schedule:
  interval: "monthly"
  assignees:
  - "YOUR_GITHUB_USERNAME"
