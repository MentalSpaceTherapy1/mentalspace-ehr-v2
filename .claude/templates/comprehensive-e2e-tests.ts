// ============================================
// MentalSpace EHR - Comprehensive E2E Tests
// ============================================
// 
// This file contains automated E2E tests for all user roles.
// Place in packages/frontend/tests/e2e/
//
// To run: npx playwright test
// To run specific file: npx playwright test comprehensive.spec.ts
// To run headed: npx playwright test --headed
// ============================================

import { test, expect, Page } from '@playwright/test';

// ============================================
// Test Configuration
// ============================================

const TEST_URLS = {
  local: 'http://localhost:3000',
  staging: 'https://staging.mentalspaceehr.com',
  production: 'https://app.mentalspaceehr.com',
};

const BASE_URL = process.env.TEST_URL || TEST_URLS.local;

const TEST_CREDENTIALS = {
  superAdmin: {
    email: process.env.TEST_SUPERADMIN_EMAIL || 'superadmin@test.mentalspaceehr.com',
    password: process.env.TEST_SUPERADMIN_PASSWORD || 'TestAdmin123!',
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.mentalspaceehr.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!',
  },
  supervisor: {
    email: process.env.TEST_SUPERVISOR_EMAIL || 'supervisor@test.mentalspaceehr.com',
    password: process.env.TEST_SUPERVISOR_PASSWORD || 'TestSuper123!',
  },
  therapist: {
    email: process.env.TEST_THERAPIST_EMAIL || 'therapist@test.mentalspaceehr.com',
    password: process.env.TEST_THERAPIST_PASSWORD || 'TestTherapist123!',
  },
  billing: {
    email: process.env.TEST_BILLING_EMAIL || 'billing@test.mentalspaceehr.com',
    password: process.env.TEST_BILLING_PASSWORD || 'TestBilling123!',
  },
  client: {
    email: process.env.TEST_CLIENT_EMAIL || 'client1@test.example.com',
    password: process.env.TEST_CLIENT_PASSWORD || 'TestClient123!',
  },
};

// ============================================
// Helper Functions
// ============================================

async function login(page: Page, email: string, password: string, isPortal = false) {
  const loginUrl = isPortal ? '/portal/login' : '/login';
  await page.goto(loginUrl);
  await page.fill('[name="email"], [type="email"]', email);
  await page.fill('[name="password"], [type="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for redirect
  const expectedUrl = isPortal ? '/portal' : '/dashboard';
  await expect(page).toHaveURL(new RegExp(expectedUrl), { timeout: 10000 });
}

async function logout(page: Page) {
  // Try common logout patterns
  const userMenu = page.locator('[data-testid="user-menu"], .user-menu, #user-menu').first();
  if (await userMenu.isVisible()) {
    await userMenu.click();
  }
  
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  }
  
  await expect(page).toHaveURL(/login/);
}

function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// ============================================
// AUTHENTICATION TESTS
// ============================================

test.describe('Authentication', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="email"], [type="email"]', 'invalid@example.com');
    await page.fill('[name="password"], [type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await expect(page.locator('text=/invalid|incorrect|error/i')).toBeVisible({ timeout: 5000 });
  });

  test('should login successfully as therapist', async ({ page }) => {
    await login(page, TEST_CREDENTIALS.therapist.email, TEST_CREDENTIALS.therapist.password);
    
    // Verify dashboard elements
    await expect(page.locator('[data-testid="dashboard"], .dashboard, #dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('should login successfully as supervisor', async ({ page }) => {
    await login(page, TEST_CREDENTIALS.supervisor.email, TEST_CREDENTIALS.supervisor.password);
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should login successfully as admin', async ({ page }) => {
    await login(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should logout successfully', async ({ page }) => {
    await login(page, TEST_CREDENTIALS.therapist.email, TEST_CREDENTIALS.therapist.password);
    await logout(page);
    await expect(page).toHaveURL(/login/);
  });
});

// ============================================
// THERAPIST TESTS
// ============================================

test.describe('Therapist - Client Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_CREDENTIALS.therapist.email, TEST_CREDENTIALS.therapist.password);
  });

  test('should display client list', async ({ page }) => {
    await page.click('text=/clients/i');
    await expect(page.locator('table, [data-testid="client-list"]')).toBeVisible({ timeout: 10000 });
  });

  test('should create new client', async ({ page }) => {
    const uniqueId = generateUniqueId();
    
    await page.click('text=/clients/i');
    await page.click('button:has-text("Add"), button:has-text("New Client"), button:has-text("Create")');
    
    // Fill required fields
    await page.fill('[name="firstName"]', 'Test');
    await page.fill('[name="lastName"]', `Client${uniqueId}`);
    await page.fill('[name="email"]', `test.client.${uniqueId}@example.com`);
    await page.fill('[name="dateOfBirth"], [name="dob"]', '1990-05-15');
    await page.fill('[name="phone"]', '5551234567');
    
    // Submit
    await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
    
    // Verify success
    await expect(page.locator('text=/created|success/i')).toBeVisible({ timeout: 5000 });
  });

  test('should search for clients', async ({ page }) => {
    await page.click('text=/clients/i');
    
    const searchInput = page.locator('input[placeholder*="Search"], [data-testid="search"]').first();
    await searchInput.fill('test');
    
    // Wait for results
    await page.waitForTimeout(500);
    
    // Verify results filtered
    const rows = page.locator('table tbody tr, [data-testid="client-row"]');
    await expect(rows.first()).toBeVisible();
  });
});

test.describe('Therapist - Scheduling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_CREDENTIALS.therapist.email, TEST_CREDENTIALS.therapist.password);
  });

  test('should display calendar/schedule view', async ({ page }) => {
    await page.click('text=/schedule|calendar/i');
    await expect(page.locator('.calendar, [data-testid="calendar"], .fc-view')).toBeVisible({ timeout: 10000 });
  });

  test('should open new appointment form', async ({ page }) => {
    await page.click('text=/schedule|calendar/i');
    await page.click('button:has-text("New"), button:has-text("Add"), button:has-text("Create Appointment")');
    
    await expect(page.locator('[role="dialog"], .modal, [data-testid="appointment-form"]')).toBeVisible();
  });

  test('should create appointment', async ({ page }) => {
    await page.click('text=/schedule|calendar/i');
    await page.click('button:has-text("New"), button:has-text("Add")');
    
    // Select client (first available)
    const clientSelect = page.locator('[name="clientId"], [name="client"]').first();
    await clientSelect.click();
    await page.locator('.option, [role="option"]').first().click();
    
    // Set date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await page.fill('[name="date"]', dateStr);
    
    // Set time
    await page.fill('[name="startTime"]', '10:00');
    await page.fill('[name="endTime"]', '11:00');
    
    // Submit
    await page.click('button[type="submit"], button:has-text("Schedule"), button:has-text("Save")');
    
    // Verify success
    await expect(page.locator('text=/scheduled|created|success/i')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Therapist - Clinical Notes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_CREDENTIALS.therapist.email, TEST_CREDENTIALS.therapist.password);
  });

  test('should navigate to clinical notes', async ({ page }) => {
    await page.click('text=/clients/i');
    await page.locator('table tbody tr, [data-testid="client-row"]').first().click();
    await page.click('text=/notes/i');
    
    await expect(page.locator('text=/clinical notes|progress notes/i')).toBeVisible();
  });

  test('should create progress note', async ({ page }) => {
    await page.click('text=/clients/i');
    await page.locator('table tbody tr, [data-testid="client-row"]').first().click();
    await page.click('text=/notes/i');
    await page.click('button:has-text("New"), button:has-text("Add Note"), button:has-text("Create")');
    
    // Select progress note type
    const noteTypeSelector = page.locator('[name="noteType"], [data-testid="note-type"]');
    if (await noteTypeSelector.isVisible()) {
      await noteTypeSelector.click();
      await page.click('text=/progress/i');
    }
    
    // Fill SOAP sections
    await page.fill('[name="subjective"], [data-testid="subjective"]', 
      'Client reports feeling better this week. Sleep has improved to 6-7 hours per night.');
    
    await page.fill('[name="objective"], [data-testid="objective"]', 
      'Client appeared well-rested and engaged. Maintained good eye contact throughout session.');
    
    await page.fill('[name="assessment"], [data-testid="assessment"]', 
      'Progress toward treatment goals is evident. Anxiety symptoms are reduced.');
    
    await page.fill('[name="plan"], [data-testid="plan"]', 
      'Continue current treatment plan. Next session scheduled for next week.');
    
    // Save draft
    await page.click('button:has-text("Save"), button:has-text("Draft")');
    
    // Verify saved
    await expect(page.locator('text=/saved|draft/i')).toBeVisible({ timeout: 5000 });
  });

  test('should sign clinical note', async ({ page }) => {
    await page.click('text=/clients/i');
    await page.locator('table tbody tr, [data-testid="client-row"]').first().click();
    await page.click('text=/notes/i');
    
    // Find a draft note
    const draftNote = page.locator('tr:has-text("DRAFT"), [data-status="draft"]').first();
    if (await draftNote.isVisible()) {
      await draftNote.click();
      
      // Sign note
      await page.click('button:has-text("Sign")');
      
      // Enter PIN if required
      const pinInput = page.locator('[name="pin"], [name="signaturePin"]');
      if (await pinInput.isVisible()) {
        await pinInput.fill('1234');
        await page.click('button:has-text("Confirm")');
      }
      
      // Verify signed
      await expect(page.locator('text=/signed|finalized/i')).toBeVisible({ timeout: 5000 });
    }
  });
});

// ============================================
// SUPERVISOR TESTS
// ============================================

test.describe('Supervisor - Note Review', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_CREDENTIALS.supervisor.email, TEST_CREDENTIALS.supervisor.password);
  });

  test('should access supervision dashboard', async ({ page }) => {
    await page.click('text=/supervision|review/i');
    await expect(page.locator('text=/pending|review|supervisees/i')).toBeVisible({ timeout: 10000 });
  });

  test('should view supervisee notes', async ({ page }) => {
    await page.click('text=/supervision|review/i');
    
    // Select supervisee
    const superviseeRow = page.locator('table tbody tr, [data-testid="supervisee-row"]').first();
    if (await superviseeRow.isVisible()) {
      await superviseeRow.click();
      
      // Verify notes visible
      await expect(page.locator('text=/notes|clinical/i')).toBeVisible();
    }
  });

  test('should co-sign note', async ({ page }) => {
    await page.click('text=/supervision|review/i');
    
    // Find note pending co-signature
    const pendingNote = page.locator('tr:has-text("Pending"), [data-status="pending"]').first();
    if (await pendingNote.isVisible()) {
      await pendingNote.click();
      
      // Co-sign
      await page.click('button:has-text("Approve"), button:has-text("Co-Sign")');
      
      // Enter PIN if required
      const pinInput = page.locator('[name="pin"]');
      if (await pinInput.isVisible()) {
        await pinInput.fill('1234');
        await page.click('button:has-text("Confirm")');
      }
      
      // Verify co-signed
      await expect(page.locator('text=/approved|co-signed|signed/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should send note back for revision', async ({ page }) => {
    await page.click('text=/supervision|review/i');
    
    const pendingNote = page.locator('tr:has-text("Pending"), [data-status="pending"]').first();
    if (await pendingNote.isVisible()) {
      await pendingNote.click();
      
      // Send back
      await page.click('button:has-text("Return"), button:has-text("Revise"), button:has-text("Send Back")');
      
      // Add feedback
      const feedbackInput = page.locator('textarea, [name="feedback"]');
      if (await feedbackInput.isVisible()) {
        await feedbackInput.fill('Please expand the Assessment section with more detail about symptom severity.');
        await page.click('button:has-text("Submit"), button:has-text("Send")');
      }
      
      // Verify returned
      await expect(page.locator('text=/returned|revision/i')).toBeVisible({ timeout: 5000 });
    }
  });
});

// ============================================
// ADMINISTRATOR TESTS
// ============================================

test.describe('Administrator - User Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
  });

  test('should access settings/admin area', async ({ page }) => {
    await page.click('text=/settings|admin/i');
    await expect(page.locator('text=/settings|configuration|admin/i')).toBeVisible({ timeout: 10000 });
  });

  test('should view user list', async ({ page }) => {
    await page.click('text=/settings|admin/i');
    await page.click('text=/users/i');
    
    await expect(page.locator('table, [data-testid="user-list"]')).toBeVisible();
  });

  test('should create new staff user', async ({ page }) => {
    const uniqueId = generateUniqueId();
    
    await page.click('text=/settings|admin/i');
    await page.click('text=/users/i');
    await page.click('button:has-text("Add"), button:has-text("Invite"), button:has-text("Create")');
    
    // Fill user details
    await page.fill('[name="firstName"]', 'New');
    await page.fill('[name="lastName"]', `Therapist${uniqueId}`);
    await page.fill('[name="email"]', `newtherapist.${uniqueId}@practice.com`);
    
    // Select role
    const roleSelect = page.locator('[name="role"]');
    if (await roleSelect.isVisible()) {
      await roleSelect.click();
      await page.click('text=/therapist|clinician/i');
    }
    
    // Submit
    await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Invite")');
    
    // Verify success
    await expect(page.locator('text=/created|invited|success/i')).toBeVisible({ timeout: 5000 });
  });

  test('should access practice settings', async ({ page }) => {
    await page.click('text=/settings|admin/i');
    await page.click('text=/practice|general/i');
    
    await expect(page.locator('[name="practiceName"], input[placeholder*="Practice"]')).toBeVisible();
  });
});

// ============================================
// BILLING TESTS
// ============================================

test.describe('Billing Staff - Claims', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_CREDENTIALS.billing.email, TEST_CREDENTIALS.billing.password);
  });

  test('should access billing dashboard', async ({ page }) => {
    await page.click('text=/billing/i');
    await expect(page.locator('text=/billing|claims|payments/i')).toBeVisible({ timeout: 10000 });
  });

  test('should view unbilled sessions', async ({ page }) => {
    await page.click('text=/billing/i');
    await page.click('text=/unbilled|ready to bill/i');
    
    await expect(page.locator('table, [data-testid="unbilled-list"]')).toBeVisible();
  });

  test('should create claim', async ({ page }) => {
    await page.click('text=/billing/i');
    await page.click('text=/unbilled|ready to bill/i');
    
    // Select session(s)
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.click();
      
      // Create claim
      await page.click('button:has-text("Create Claim"), button:has-text("Bill")');
      
      // Verify claim created
      await expect(page.locator('text=/created|generated|success/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should view aging report', async ({ page }) => {
    await page.click('text=/billing/i');
    await page.click('text=/reports|aging/i');
    
    await expect(page.locator('text=/aging|receivables|30|60|90/i')).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// CLIENT PORTAL TESTS
// ============================================

test.describe('Client Portal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_CREDENTIALS.client.email, TEST_CREDENTIALS.client.password, true);
  });

  test('should display client dashboard', async ({ page }) => {
    await expect(page.locator('text=/welcome|dashboard|appointments/i')).toBeVisible({ timeout: 10000 });
  });

  test('should view appointments', async ({ page }) => {
    await page.click('text=/appointments/i');
    await expect(page.locator('text=/upcoming|scheduled|appointments/i')).toBeVisible();
  });

  test('should access messages', async ({ page }) => {
    await page.click('text=/messages/i');
    await expect(page.locator('text=/messages|inbox|conversations/i')).toBeVisible();
  });

  test('should send message to therapist', async ({ page }) => {
    await page.click('text=/messages/i');
    await page.click('button:has-text("New"), button:has-text("Compose")');
    
    // Fill message
    const subjectInput = page.locator('[name="subject"]');
    if (await subjectInput.isVisible()) {
      await subjectInput.fill('Question about next session');
    }
    
    await page.fill('textarea, [name="message"], [name="body"]', 
      'Hi, I wanted to confirm our appointment time for next week. Thank you!');
    
    // Send
    await page.click('button:has-text("Send")');
    
    // Verify sent
    await expect(page.locator('text=/sent|success/i')).toBeVisible({ timeout: 5000 });
  });

  test('should view documents', async ({ page }) => {
    await page.click('text=/documents/i');
    await expect(page.locator('text=/documents|files/i')).toBeVisible();
  });

  test('should access forms/intake', async ({ page }) => {
    await page.click('text=/forms|intake/i');
    await expect(page.locator('text=/forms|intake|questionnaires/i')).toBeVisible();
  });

  test('should complete PHQ-9 assessment', async ({ page }) => {
    await page.click('text=/forms|assessments/i');
    
    // Find PHQ-9
    const phq9 = page.locator('text=/PHQ-9|depression/i').first();
    if (await phq9.isVisible()) {
      await phq9.click();
      
      // Answer questions (9 questions, scale 0-3)
      for (let i = 1; i <= 9; i++) {
        const question = page.locator(`[name="q${i}"], [data-question="${i}"]`);
        if (await question.isVisible()) {
          await question.click();
          await page.locator('[value="1"], text="Several days"').first().click();
        }
      }
      
      // Submit
      await page.click('button[type="submit"], button:has-text("Submit")');
      
      // Verify submitted
      await expect(page.locator('text=/submitted|complete|success/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should request appointment', async ({ page }) => {
    await page.click('text=/appointments/i');
    await page.click('button:has-text("Request"), button:has-text("New")');
    
    // Fill request
    const reasonInput = page.locator('[name="reason"], textarea').first();
    if (await reasonInput.isVisible()) {
      await reasonInput.fill('Would like to schedule a regular weekly session');
    }
    
    // Submit
    await page.click('button[type="submit"], button:has-text("Submit"), button:has-text("Request")');
    
    // Verify submitted
    await expect(page.locator('text=/submitted|requested|success/i')).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// CROSS-ROLE WORKFLOW TESTS
// ============================================

test.describe('Cross-Role Workflows', () => {
  test('should complete full client onboarding flow', async ({ page }) => {
    // Step 1: Admin creates client
    await login(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
    
    const uniqueId = generateUniqueId();
    const clientEmail = `onboarding.${uniqueId}@example.com`;
    
    await page.click('text=/clients/i');
    await page.click('button:has-text("Add"), button:has-text("New")');
    
    await page.fill('[name="firstName"]', 'Onboarding');
    await page.fill('[name="lastName"]', `Test${uniqueId}`);
    await page.fill('[name="email"]', clientEmail);
    await page.fill('[name="dateOfBirth"]', '1985-03-15');
    
    await page.click('button[type="submit"], button:has-text("Create")');
    await expect(page.locator('text=/created|success/i')).toBeVisible({ timeout: 5000 });
    
    // Step 2: Send intake forms
    await page.click('text=/forms|intake/i');
    await page.click('button:has-text("Send")');
    await page.click('button:has-text("Confirm"), button:has-text("Send")');
    
    await logout(page);
    
    // Note: In a real test, would verify client can access forms via portal
    // This would require setting up client credentials dynamically
  });

  test('should complete note supervision flow', async ({ page }) => {
    // Step 1: Therapist creates and signs note
    await login(page, TEST_CREDENTIALS.therapist.email, TEST_CREDENTIALS.therapist.password);
    
    await page.click('text=/clients/i');
    await page.locator('table tbody tr').first().click();
    await page.click('text=/notes/i');
    await page.click('button:has-text("New"), button:has-text("Add")');
    
    // Fill minimal note
    await page.fill('[name="subjective"], textarea').first().fill('Test note for supervision flow');
    await page.click('button:has-text("Save")');
    
    // Sign note
    await page.click('button:has-text("Sign")');
    const pinInput = page.locator('[name="pin"]');
    if (await pinInput.isVisible()) {
      await pinInput.fill('1234');
      await page.click('button:has-text("Confirm")');
    }
    
    await logout(page);
    
    // Step 2: Supervisor reviews and co-signs
    await login(page, TEST_CREDENTIALS.supervisor.email, TEST_CREDENTIALS.supervisor.password);
    
    await page.click('text=/supervision|review/i');
    
    const pendingNote = page.locator('tr:has-text("Pending")').first();
    if (await pendingNote.isVisible()) {
      await pendingNote.click();
      await page.click('button:has-text("Approve"), button:has-text("Co-Sign")');
      
      const supervisorPin = page.locator('[name="pin"]');
      if (await supervisorPin.isVisible()) {
        await supervisorPin.fill('1234');
        await page.click('button:has-text("Confirm")');
      }
      
      await expect(page.locator('text=/approved|co-signed/i')).toBeVisible({ timeout: 5000 });
    }
  });
});

// ============================================
// ERROR HANDLING TESTS
// ============================================

test.describe('Error Handling', () => {
  test('should handle invalid login gracefully', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[type="email"], [name="email"]', 'invalid@example.com');
    await page.fill('[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/error|invalid|incorrect/i')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/login/);
  });

  test('should show validation errors for empty required fields', async ({ page }) => {
    await login(page, TEST_CREDENTIALS.therapist.email, TEST_CREDENTIALS.therapist.password);
    
    await page.click('text=/clients/i');
    await page.click('button:has-text("Add"), button:has-text("New")');
    
    // Submit empty form
    await page.click('button[type="submit"], button:has-text("Create")');
    
    // Should show validation errors
    await expect(page.locator('text=/required|invalid/i')).toBeVisible({ timeout: 5000 });
  });

  test('should handle unauthorized access', async ({ page }) => {
    // Try to access admin page without admin role
    await login(page, TEST_CREDENTIALS.therapist.email, TEST_CREDENTIALS.therapist.password);
    
    // Try to navigate to admin-only settings
    await page.goto('/settings/users');
    
    // Should redirect or show error
    const errorOrRedirect = await Promise.race([
      page.waitForURL(/dashboard|forbidden|unauthorized|login/, { timeout: 5000 }).then(() => true),
      page.locator('text=/access denied|unauthorized|forbidden/i').waitFor({ timeout: 5000 }).then(() => true),
    ]).catch(() => false);
    
    expect(errorOrRedirect).toBeTruthy();
  });
});

// Export for use in other test files
export { login, logout, generateUniqueId, TEST_CREDENTIALS, BASE_URL };
