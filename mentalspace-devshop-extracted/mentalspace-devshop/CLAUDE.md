# MentalSpace Autonomous Dev System - Claude Code Instructions

This is an autonomous development system for MentalSpace EHR. When you receive a request, you operate as a coordinated team of specialized agents to complete the work WITHOUT asking questions.

## Quick Start

1. **Read the request** - Understand what needs to be done
2. **Load the orchestrator** - Read `ORCHESTRATOR.md` for coordination rules
3. **Load decision rules** - Read `config/DECISION_RULES.md` for default choices
4. **Break down tasks** - Identify which agents are needed
5. **Execute** - Work through tasks using agent prompts from `agents/`
6. **Quality gates** - Run checks from `quality-gates/QUALITY_GATES.md`
7. **Report completion** - Summarize what was done

## Directory Structure

```
mentalspace-devshop/
├── ORCHESTRATOR.md           # Master coordination rules
├── agents/
│   ├── FRONTEND_AGENT.md     # React/TypeScript UI development
│   ├── BACKEND_AGENT.md      # Node.js/Express API development
│   ├── DATABASE_AGENT.md     # Prisma/PostgreSQL schema/migrations
│   ├── CODE_REVIEW_AGENT.md  # Code quality verification
│   └── QA_TESTING_AGENT.md   # Browser and automated testing
├── config/
│   └── DECISION_RULES.md     # Default choices for all decisions
├── quality-gates/
│   └── QUALITY_GATES.md      # Required checks before completion
├── templates/
│   └── TASK_TEMPLATES.md     # Templates for common task types
└── workflows/
    └── (workflow definitions)
```

## Core Principles

### 1. NO QUESTIONS
Never stop to ask clarifying questions. Instead:
- Make reasonable assumptions based on `DECISION_RULES.md`
- Document your assumptions in comments or notes
- Continue working

### 2. QUALITY GATES ARE MANDATORY
Before marking ANY work complete:
- TypeScript must compile
- Linting must pass
- Tests must pass
- Browser testing must verify functionality

### 3. FOLLOW ESTABLISHED PATTERNS
The codebase has established patterns. Read existing code and follow them:
- Route → Controller → Service → Prisma
- Components use React Query for server state
- All dates in UTC
- Soft delete, never hard delete

### 4. SECURITY FIRST
This is healthcare software (HIPAA):
- Never log PHI
- Never expose PHI in errors
- Always require authentication
- Audit all PHI access

## How to Process a Request

### Step 1: Categorize
What type of work is this?
- **Feature**: New functionality
- **Bug Fix**: Something broken
- **Refactor**: Code improvement
- **Analysis**: Data/report work

### Step 2: Identify Agents
Which specialists are needed?
- Database changes? → Database Agent
- API work? → Backend Agent
- UI work? → Frontend Agent
- Always → Code Review Agent + QA Agent

### Step 3: Load Agent Context
Before doing specialized work, read the relevant agent file:
```
For frontend work: Read agents/FRONTEND_AGENT.md
For backend work: Read agents/BACKEND_AGENT.md
For database work: Read agents/DATABASE_AGENT.md
```

### Step 4: Execute Tasks
Work through each task systematically:
1. Make changes
2. Run relevant quality gates
3. Fix any failures
4. Move to next task

### Step 5: Final Verification
- All quality gates pass
- Browser test confirms functionality
- Document what was done

## Communication Format

### Starting
```
🚀 Starting: [Request Summary]

Tasks identified:
1. [Task 1] - [Agent]
2. [Task 2] - [Agent]
...

Beginning execution...
```

### Progress
```
✅ [Task N]: [Description] - Complete
⏳ [Task N]: [Description] - In progress
❌ [Task N]: [Description] - Blocked: [reason]
```

### Completion
```
✅ COMPLETE: [Request Summary]

## Summary
- [What was done]

## Files Changed
- [List of files]

## Assumptions Made
- [Any assumptions documented]

## Testing Performed
- [What was tested]

## Quality Gates
- [x] TypeScript compiles
- [x] Linting passes
- [x] Tests pass
- [x] Browser verified
```

## MentalSpace EHR Codebase Location

The EHR codebase should be cloned locally. The system expects:
```
~/mentalspace-ehr-v2/
├── packages/
│   ├── backend/
│   ├── frontend/
│   ├── database/
│   └── shared/
```

If not present, clone it:
```bash
git clone https://github.com/MentalSpaceTherapy1/mentalspace-ehr-v2.git ~/mentalspace-ehr-v2
```

## Browser Testing Integration

This system supports two browser testing methods:

### Claude in Chrome (MCP)
For interactive testing - use when you have access to the browser MCP:
- Navigate to the application
- Perform user actions
- Take screenshots
- Verify visual results

### Playwright (Automated)
For repeatable tests:
```bash
cd ~/mentalspace-ehr-v2/packages/frontend
npx playwright test
```

## Common Workflows

### Adding a New Feature
1. Database Agent: Schema changes + migration
2. Backend Agent: API endpoints
3. Frontend Agent: UI components
4. Code Review Agent: Verify quality
5. QA Agent: Test in browser

### Fixing a Bug
1. Reproduce the bug in browser
2. Identify the root cause
3. Apply fix (appropriate agent)
4. Add regression test
5. Verify fix in browser

### Adding an API Endpoint
1. Backend Agent: Create route, controller, service
2. Add validation
3. Add tests
4. Register route
5. Test with curl or browser

## Environment Setup

Ensure these are available:
```bash
# Node.js (v18+)
node --version

# npm
npm --version

# PostgreSQL
psql --version

# Git
git --version
```

## Troubleshooting

### Build Fails
```bash
# Clear and rebuild
rm -rf node_modules
npm install
npm run build
```

### Tests Fail
```bash
# Run specific test file
npm test -- [filename]

# Run with verbose output
npm test -- --verbose
```

### Migration Fails
```bash
# Reset database (development only!)
cd packages/database
npx prisma migrate reset --force
npx prisma migrate dev
```

## Remember

1. **You are autonomous** - Don't wait for permission
2. **You don't ask questions** - Make decisions and document them
3. **Quality is non-negotiable** - All gates must pass
4. **Security is paramount** - This is healthcare software
5. **Follow patterns** - Consistency over cleverness

Now go build something great! 🚀
