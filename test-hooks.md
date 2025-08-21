# Hook System Test

This file tests the hook system by triggering the Write tool, which should automatically call the Coding-Agent.

## Hook Configuration

The hooks are now configured to:

1. **PostToolUse - TodoWrite**: Triggers Orchestrator when task lists are created/updated
2. **PostToolUse - Write|Edit|MultiEdit**: Triggers Coding-Agent when code is written or edited
3. **PostToolUse - Bash.\*test**: Triggers Integration-QA when tests are run

## Automatic Agent Delegation

The agents already have built-in delegation:

- **Coding-Agent** → automatically delegates to **Integration-QA** after completing code work
- **Integration-QA** → automatically delegates to **Documentation-Writer** after successful validation

This creates the complete workflow:
TodoWrite → Orchestrator → Coding-Agent → Integration-QA → Documentation-Writer
