# E2E Test Execution Workflow - MentalSpace EHR

This document provides step-by-step instructions for Claude Code to execute comprehensive end-to-end browser testing of the MentalSpace EHR application.

## Overview

When instructed to perform E2E testing, Claude Code must:
1. Start the application (if local)
2. Execute ALL test scenarios from `BROWSER_TESTING_AGENT.md`
3. Test EVERY user role completely
4. Document all results with screenshots
5. Report issues found

## Prerequisites

Before starting E2E tests, ensure:

```bash
# 1. Clone repository if not present
if [ ! -d ~/mentalspace-ehr-v2 ]; then
  git clone https://github.com/MentalSpaceTherapy1/mentalspace-ehr-v2.git ~/mentalspace-ehr-v2
fi

# 2. Install dependencies
cd ~/mentalspace-ehr-v2
npm install

# 3. Start services (if testing locally)
npm run dev

# 4. Verify services are running
curl http://localhost:3000/health
curl http://localhost:3001/health
```

## Test Execution Order

Execute tests in this order to ensure data dependencies are met:

```
Phase 1: Environment Setup
├── Verify application is accessible
├── Verify test accounts exist
└── Take baseline screenshots

Phase 2: Administrator Tests (A1-A11)
├── Create test users
├── Configure services
└── Set up test data

Phase 3: Client Portal Tests (C1-C18)
├── Client registration
├── Complete all intake forms
├── Complete all assessments
├── Submit appointment requests
└── Test messaging

Phase 4: Therapist Tests (T1-T20)
├── Login and dashboard
├── View/create clients
├── Scheduling
├── Clinical documentation
├── Notes and treatment plans
└── Document sharing

Phase 5: Supervisor Tests (S1-S10)
├── Note review
├── Co-signing
├── Unlocking notes
└── Caseload management

Phase 6: Billing Tests (B1-B10)
├── Claims creation
├── Payment posting
├── Reports
└── Statements

Phase 7: Cross-Role Workflow Tests (W1-W4)
├── Full onboarding flow
├── Appointment request flow
├── Note supervision flow
└── Billing complete flow

Phase 8: Error Scenario Tests (E1-E6)
├── Invalid inputs
├── Permission errors
└── Edge cases
```

## Execution Instructions for Claude Code

### Starting a Test Session

When beginning E2E testing, Claude Code should:

1. **Load the browser testing agent context**
```
Read file: agents/BROWSER_TESTING_AGENT.md
```

2. **Initialize browser session**
```
Use Claude in Chrome MCP:
- tabs_context_mcp to get/create tab
- navigate to application URL
- take initial screenshot
```

3. **Document test session start**
```markdown
# E2E Test Session Started
- Date: [current date/time]
- Environment: [URL being tested]
- Starting Phase: [phase number]
```

### Executing Individual Tests

For EACH test in BROWSER_TESTING_AGENT.md:

1. **Announce the test**
```
⏳ Starting Test [ID]: [Name]
```

2. **Execute the steps using Claude in Chrome MCP tools**
```
- navigate: Go to URLs
- read_page: Understand page structure
- find: Locate elements
- form_input: Fill form fields
- computer (click): Click buttons/links
- computer (screenshot): Capture states
```

3. **Document the result**
```
✅ Test [ID]: [Name] - PASSED
or
❌ Test [ID]: [Name] - FAILED: [reason]
```

4. **Take screenshot of final state**

### Test Data to Use

When filling forms, use this realistic test data:

#### Client Information
```
First Name: "Sarah" / "Michael" / "Jennifer"
Last Name: "TestClient_[timestamp]"
DOB: "1985-03-15" / "1990-07-22" / "1978-11-08"
Email: "testclient_[timestamp]@example.com"
Phone: "(404) 555-1234"
Address: "123 Peachtree St NE"
City: "Atlanta"
State: "Georgia"
ZIP: "30301"
Emergency Contact: "John Doe, (404) 555-5678, Spouse"
```

#### Clinical Note Content
```
Subjective: "Client reports moderate improvement in anxiety symptoms since last session. States they have been practicing the breathing exercises discussed and notices they help 'take the edge off' during stressful moments at work. Sleep remains disrupted, averaging 5-6 hours per night. Client denies any thoughts of self-harm or harm to others."

Objective: "Client arrived on time, appropriately dressed and groomed. Affect was slightly anxious but notably improved from intake. Client maintained good eye contact and was engaged throughout the session. Speech was normal in rate and volume. Thought process was logical and goal-directed."

Assessment: "Generalized Anxiety Disorder (F41.1) - Client is showing early progress with cognitive behavioral interventions. Anxiety symptoms have decreased from severe to moderate based on self-report and clinical observation. Treatment goals are being addressed appropriately."

Plan: "1. Continue weekly individual therapy sessions focusing on CBT for anxiety. 2. Introduce progressive muscle relaxation technique. 3. Client to continue daily breathing exercises and add 5-minute mindfulness practice. 4. Discuss sleep hygiene strategies next session. 5. Next appointment scheduled for [date]."
```

#### Assessment Responses (PHQ-9)
```
Q1 (Little interest): 1 (Several days)
Q2 (Feeling down): 2 (More than half the days)
Q3 (Sleep trouble): 2 (More than half the days)
Q4 (Tired): 1 (Several days)
Q5 (Appetite): 0 (Not at all)
Q6 (Feeling bad about self): 1 (Several days)
Q7 (Trouble concentrating): 1 (Several days)
Q8 (Moving slowly/fast): 0 (Not at all)
Q9 (Self-harm thoughts): 0 (Not at all)
Difficulty: Somewhat difficult
Total Score: 8 (Mild depression)
```

#### Assessment Responses (GAD-7)
```
Q1 (Nervous/anxious): 2 (More than half the days)
Q2 (Can't stop worrying): 2 (More than half the days)
Q3 (Worrying too much): 2 (More than half the days)
Q4 (Trouble relaxing): 1 (Several days)
Q5 (Restless): 1 (Several days)
Q6 (Easily annoyed): 1 (Several days)
Q7 (Feeling afraid): 1 (Several days)
Total Score: 10 (Moderate anxiety)
```

#### Messages Content
```
Client to Therapist:
"Hi [Therapist name], I wanted to reach out before our next session. I've been trying the coping techniques we discussed, and they seem to be helping. However, I had a particularly stressful day yesterday and found it hard to use them in the moment. Is there anything else I can try? Looking forward to our session on [date]. Thank you!"

Therapist to Client:
"Hi [Client name], Thank you for reaching out and for your dedication to practicing the techniques we discussed. It's completely normal to find them challenging to use in highly stressful moments - this is something we can work on together. I have a few ideas for 'in the moment' strategies that might be easier to access when stress is high. Let's make this a focus of our next session. See you on [date]!"
```

### Screenshot Requirements

Take screenshots at these moments:
- After login (dashboard view)
- Before form submission (filled form)
- After form submission (success/error message)
- After major actions (created client, scheduled appointment, etc.)
- Any error states
- Final state of each workflow

### Error Handling During Tests

If a test fails:

1. **Capture the error state**
```
- Screenshot the error
- Note the error message
- Document steps that led to error
```

2. **Log the failure**
```markdown
❌ Test [ID] FAILED
- Error: [error message]
- Steps to reproduce:
  1. [step 1]
  2. [step 2]
- Screenshot: [reference]
- Possible cause: [analysis]
```

3. **Continue with remaining tests** (unless blocked)

4. **Add to issues list for final report**

### Test Session Completion

After all tests are complete:

1. **Generate test summary**
```markdown
# E2E Test Session Complete

## Summary
- Total Tests: [count]
- Passed: [count]
- Failed: [count]
- Skipped: [count]

## Tests by Role
| Role | Total | Passed | Failed |
|------|-------|--------|--------|
| Admin | 11 | 10 | 1 |
| Therapist | 20 | 19 | 1 |
| Supervisor | 10 | 10 | 0 |
| Billing | 10 | 10 | 0 |
| Client | 18 | 17 | 1 |
| Cross-Role | 4 | 4 | 0 |

## Critical Issues Found
1. [Issue description and severity]
2. [Issue description and severity]

## Recommendations
1. [Recommendation]
2. [Recommendation]

## Screenshot Index
1. [Screenshot 1]: [Description]
2. [Screenshot 2]: [Description]
...
```

2. **Clean up test data** (if required and possible)

3. **Archive screenshots**

## Quick Reference: Claude in Chrome MCP Tools

```javascript
// Navigate to URL
navigate(tabId, url)

// Read page structure
read_page(tabId)

// Find elements
find(tabId, query) // e.g., "login button", "email input"

// Fill form fields
form_input(tabId, ref, value)

// Click elements
computer(action: "left_click", tabId, coordinate/ref)

// Take screenshot
computer(action: "screenshot", tabId)

// Type text
computer(action: "type", tabId, text)

// Press keys
computer(action: "key", tabId, text) // e.g., "Enter", "Tab"

// Wait
computer(action: "wait", tabId, duration)

// Scroll
computer(action: "scroll", tabId, scroll_direction, coordinate)
```

## Test Environment URLs

- **Production**: https://app.mentalspaceehr.com
- **Staging**: https://staging.mentalspaceehr.com
- **Local**: http://localhost:3000
- **Client Portal Prod**: https://portal.mentalspaceehr.com
- **Client Portal Staging**: https://portal-staging.mentalspaceehr.com
- **Client Portal Local**: http://localhost:3000/portal

## Test Accounts

See `BROWSER_TESTING_AGENT.md` for complete list of test credentials.

## Execution Commands

To start full E2E testing:
```
"Execute full E2E browser testing as defined in BROWSER_TESTING_AGENT.md"
```

To test specific role:
```
"Execute all Therapist tests from BROWSER_TESTING_AGENT.md"
```

To test specific workflow:
```
"Execute the Full Client Onboarding Flow (W1) from BROWSER_TESTING_AGENT.md"
```

---

Remember: **TEST EVERYTHING. DOCUMENT EVERYTHING. SCREENSHOT EVERYTHING.**
