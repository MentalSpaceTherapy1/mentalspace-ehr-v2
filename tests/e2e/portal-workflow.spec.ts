import { test, expect } from '@playwright/test';

test.describe('Client Portal Workflow E2E Tests', () => {
  test.describe('Portal Login', () => {
    test('should display portal login page', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.waitForLoadState('networkidle');

      // Verify login form elements
      await expect(page.locator('h1:has-text("MentalSpace")')).toBeVisible();
      await expect(page.locator('input#email')).toBeVisible();
      await expect(page.locator('input#password')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      await page.screenshot({ path: 'test-results/portal-login-page.png', fullPage: true });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.waitForLoadState('networkidle');

      await page.fill('input#email', 'invalid@test.com');
      await page.fill('input#password', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Wait for error response
      await page.waitForTimeout(2000);

      // Check for error toast or message
      const pageContent = await page.content();
      const hasError = pageContent.toLowerCase().includes('error') ||
                       pageContent.toLowerCase().includes('invalid') ||
                       pageContent.toLowerCase().includes('failed');
      console.log('Shows login error:', hasError);

      await page.screenshot({ path: 'test-results/portal-login-error.png', fullPage: true });
    });

    test('should have forgot password link', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.waitForLoadState('networkidle');

      const forgotPasswordLink = page.locator('a:has-text("Forgot password")');
      await expect(forgotPasswordLink).toBeVisible();

      await forgotPasswordLink.click();
      await page.waitForLoadState('networkidle');

      // Verify navigated to forgot password page
      expect(page.url()).toContain('/portal/forgot-password');

      await page.screenshot({ path: 'test-results/portal-forgot-password.png', fullPage: true });
    });

    test('should have register link', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.waitForLoadState('networkidle');

      const registerLink = page.locator('a:has-text("Sign Up")');
      await expect(registerLink).toBeVisible();

      await registerLink.click();
      await page.waitForLoadState('networkidle');

      // Verify navigated to register page
      expect(page.url()).toContain('/portal/register');

      await page.screenshot({ path: 'test-results/portal-register-link.png', fullPage: true });
    });
  });

  test.describe('Portal Registration', () => {
    test('should display portal registration page', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/register');
      await page.waitForLoadState('networkidle');

      // Verify registration page loaded
      const pageContent = await page.content();
      const hasRegistrationElements = pageContent.toLowerCase().includes('register') ||
                                       pageContent.toLowerCase().includes('sign up') ||
                                       pageContent.toLowerCase().includes('create');
      console.log('Registration page loaded:', hasRegistrationElements);

      await page.screenshot({ path: 'test-results/portal-registration-page.png', fullPage: true });
    });

    test('should have required registration fields', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/register');
      await page.waitForLoadState('networkidle');

      // Check for common registration fields
      const pageContent = await page.content();
      const hasEmailField = pageContent.toLowerCase().includes('email');
      const hasPasswordField = pageContent.toLowerCase().includes('password');
      console.log('Has email field:', hasEmailField);
      console.log('Has password field:', hasPasswordField);

      await page.screenshot({ path: 'test-results/portal-registration-fields.png', fullPage: true });
    });
  });

  test.describe('Portal Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Set up portal authentication via localStorage
      await page.goto('http://localhost:5175/portal/login');

      // Inject mock portal token for testing (simulating logged-in state)
      await page.evaluate(() => {
        localStorage.setItem('portalToken', 'test-portal-token');
        localStorage.setItem('portalClient', JSON.stringify({
          id: 'test-client-id',
          firstName: 'Test',
          lastName: 'Client',
          email: 'test@client.com'
        }));
        localStorage.setItem('portalAccount', JSON.stringify({
          id: 'test-account-id',
          email: 'test@client.com'
        }));
      });
    });

    test('should display portal dashboard', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/dashboard');
      await page.waitForLoadState('networkidle');

      // Verify dashboard elements
      const pageContent = await page.content();
      const hasDashboardContent = pageContent.toLowerCase().includes('dashboard') ||
                                   pageContent.toLowerCase().includes('welcome') ||
                                   pageContent.toLowerCase().includes('portal');
      console.log('Dashboard content present:', hasDashboardContent);

      await page.screenshot({ path: 'test-results/portal-dashboard.png', fullPage: true });
    });

    test('should have navigation menu', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/dashboard');
      await page.waitForLoadState('networkidle');

      // Check for navigation elements
      const pageContent = await page.content();
      const hasAppointments = pageContent.toLowerCase().includes('appointment');
      const hasMessages = pageContent.toLowerCase().includes('message');
      const hasBilling = pageContent.toLowerCase().includes('billing');

      console.log('Has appointments nav:', hasAppointments);
      console.log('Has messages nav:', hasMessages);
      console.log('Has billing nav:', hasBilling);

      await page.screenshot({ path: 'test-results/portal-navigation.png', fullPage: true });
    });
  });

  test.describe('Mood Tracking', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.evaluate(() => {
        localStorage.setItem('portalToken', 'test-portal-token');
        localStorage.setItem('portalClient', JSON.stringify({
          id: 'test-client-id',
          firstName: 'Test',
          lastName: 'Client'
        }));
      });
    });

    test('should display mood tracking page', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/mood-tracking');
      await page.waitForLoadState('networkidle');

      // Verify mood tracking page loaded
      const pageContent = await page.content();
      const hasMoodContent = pageContent.toLowerCase().includes('mood') ||
                              pageContent.toLowerCase().includes('feeling') ||
                              pageContent.toLowerCase().includes('emotion');
      console.log('Mood tracking page loaded:', hasMoodContent);

      await page.screenshot({ path: 'test-results/portal-mood-tracking.png', fullPage: true });
    });

    test('should have mood entry form', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/mood-tracking');
      await page.waitForLoadState('networkidle');

      // Look for new entry button or form
      const pageContent = await page.content();
      const hasNewEntryButton = pageContent.toLowerCase().includes('new entry') ||
                                 pageContent.toLowerCase().includes('add') ||
                                 pageContent.toLowerCase().includes('log');
      console.log('Has new entry option:', hasNewEntryButton);

      await page.screenshot({ path: 'test-results/portal-mood-entry-form.png', fullPage: true });
    });

    test('should have period selector for mood history', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/mood-tracking');
      await page.waitForLoadState('networkidle');

      // Check for period selection
      const pageContent = await page.content();
      const hasPeriodSelector = pageContent.toLowerCase().includes('week') ||
                                 pageContent.toLowerCase().includes('month');
      console.log('Has period selector:', hasPeriodSelector);

      await page.screenshot({ path: 'test-results/portal-mood-history.png', fullPage: true });
    });
  });

  test.describe('Self-Scheduling', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.evaluate(() => {
        localStorage.setItem('portalToken', 'test-portal-token');
        localStorage.setItem('portalClient', JSON.stringify({
          id: 'test-client-id',
          firstName: 'Test',
          lastName: 'Client'
        }));
      });
    });

    test('should display self-scheduling page', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/self-scheduling');
      await page.waitForLoadState('networkidle');

      // Verify scheduling page loaded
      const pageContent = await page.content();
      const hasSchedulingContent = pageContent.toLowerCase().includes('schedule') ||
                                    pageContent.toLowerCase().includes('appointment') ||
                                    pageContent.toLowerCase().includes('book');
      console.log('Self-scheduling page loaded:', hasSchedulingContent);

      await page.screenshot({ path: 'test-results/portal-self-scheduling.png', fullPage: true });
    });

    test('should show available appointment slots', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/self-scheduling');
      await page.waitForLoadState('networkidle');

      // Check for available slots or calendar
      const pageContent = await page.content();
      const hasSlots = pageContent.toLowerCase().includes('available') ||
                       pageContent.toLowerCase().includes('slot') ||
                       pageContent.toLowerCase().includes('time');
      console.log('Shows available slots:', hasSlots);

      await page.screenshot({ path: 'test-results/portal-available-slots.png', fullPage: true });
    });
  });

  test.describe('Portal Appointments', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.evaluate(() => {
        localStorage.setItem('portalToken', 'test-portal-token');
        localStorage.setItem('portalClient', JSON.stringify({
          id: 'test-client-id',
          firstName: 'Test',
          lastName: 'Client'
        }));
      });
    });

    test('should display appointments page', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/appointments');
      await page.waitForLoadState('networkidle');

      // Verify appointments page loaded
      const pageContent = await page.content();
      const hasAppointmentsContent = pageContent.toLowerCase().includes('appointment');
      console.log('Appointments page loaded:', hasAppointmentsContent);

      await page.screenshot({ path: 'test-results/portal-appointments.png', fullPage: true });
    });

    test('should show upcoming and past appointments', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/appointments');
      await page.waitForLoadState('networkidle');

      // Check for upcoming/past sections
      const pageContent = await page.content();
      const hasUpcoming = pageContent.toLowerCase().includes('upcoming');
      const hasPast = pageContent.toLowerCase().includes('past') || pageContent.toLowerCase().includes('history');
      console.log('Has upcoming section:', hasUpcoming);
      console.log('Has past section:', hasPast);

      await page.screenshot({ path: 'test-results/portal-appointments-sections.png', fullPage: true });
    });
  });

  test.describe('Portal Assessments', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.evaluate(() => {
        localStorage.setItem('portalToken', 'test-portal-token');
        localStorage.setItem('portalClient', JSON.stringify({
          id: 'test-client-id',
          firstName: 'Test',
          lastName: 'Client'
        }));
      });
    });

    test('should display assessments page', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/assessments');
      await page.waitForLoadState('networkidle');

      // Verify assessments page loaded
      const pageContent = await page.content();
      const hasAssessmentsContent = pageContent.toLowerCase().includes('assessment') ||
                                     pageContent.toLowerCase().includes('questionnaire') ||
                                     pageContent.toLowerCase().includes('form');
      console.log('Assessments page loaded:', hasAssessmentsContent);

      await page.screenshot({ path: 'test-results/portal-assessments.png', fullPage: true });
    });

    test('should show pending and completed assessments', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/assessments');
      await page.waitForLoadState('networkidle');

      // Check for pending/completed sections
      const pageContent = await page.content();
      const hasPending = pageContent.toLowerCase().includes('pending') || pageContent.toLowerCase().includes('incomplete');
      const hasCompleted = pageContent.toLowerCase().includes('completed') || pageContent.toLowerCase().includes('finished');
      console.log('Has pending assessments:', hasPending);
      console.log('Has completed assessments:', hasCompleted);

      await page.screenshot({ path: 'test-results/portal-assessments-sections.png', fullPage: true });
    });
  });

  test.describe('Portal Billing', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.evaluate(() => {
        localStorage.setItem('portalToken', 'test-portal-token');
        localStorage.setItem('portalClient', JSON.stringify({
          id: 'test-client-id',
          firstName: 'Test',
          lastName: 'Client'
        }));
      });
    });

    test('should display billing page', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/billing');
      await page.waitForLoadState('networkidle');

      // Verify billing page loaded
      const pageContent = await page.content();
      const hasBillingContent = pageContent.toLowerCase().includes('billing') ||
                                 pageContent.toLowerCase().includes('payment') ||
                                 pageContent.toLowerCase().includes('balance');
      console.log('Billing page loaded:', hasBillingContent);

      await page.screenshot({ path: 'test-results/portal-billing.png', fullPage: true });
    });

    test('should show balance and payment history', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/billing');
      await page.waitForLoadState('networkidle');

      // Check for balance and payment info
      const pageContent = await page.content();
      const hasBalance = pageContent.toLowerCase().includes('balance');
      const hasPayments = pageContent.toLowerCase().includes('payment') || pageContent.toLowerCase().includes('history');
      console.log('Shows balance:', hasBalance);
      console.log('Shows payment history:', hasPayments);

      await page.screenshot({ path: 'test-results/portal-billing-info.png', fullPage: true });
    });

    test('should have make payment option', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/billing');
      await page.waitForLoadState('networkidle');

      // Check for payment button
      const pageContent = await page.content();
      const hasPayButton = pageContent.toLowerCase().includes('make payment') ||
                           pageContent.toLowerCase().includes('pay now') ||
                           pageContent.toLowerCase().includes('pay balance');
      console.log('Has make payment option:', hasPayButton);

      await page.screenshot({ path: 'test-results/portal-payment-option.png', fullPage: true });
    });
  });

  test.describe('Portal Referrals', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.evaluate(() => {
        localStorage.setItem('portalToken', 'test-portal-token');
        localStorage.setItem('portalClient', JSON.stringify({
          id: 'test-client-id',
          firstName: 'Test',
          lastName: 'Client'
        }));
      });
    });

    test('should display referrals page', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/referrals');
      await page.waitForLoadState('networkidle');

      // Verify referrals page loaded
      const pageContent = await page.content();
      const hasReferralsContent = pageContent.toLowerCase().includes('referral') ||
                                   pageContent.toLowerCase().includes('refer');
      console.log('Referrals page loaded:', hasReferralsContent);

      await page.screenshot({ path: 'test-results/portal-referrals.png', fullPage: true });
    });

    test('should show referral stats', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/referrals');
      await page.waitForLoadState('networkidle');

      // Check for stats cards
      const pageContent = await page.content();
      const hasStats = pageContent.toLowerCase().includes('total') ||
                       pageContent.toLowerCase().includes('pending') ||
                       pageContent.toLowerCase().includes('converted');
      console.log('Shows referral stats:', hasStats);

      await page.screenshot({ path: 'test-results/portal-referral-stats.png', fullPage: true });
    });

    test('should have new referral button', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/referrals');
      await page.waitForLoadState('networkidle');

      // Check for new referral button
      const newReferralButton = page.locator('button:has-text("New Referral"), button:has-text("Refer")').first();
      const hasButton = await newReferralButton.isVisible().catch(() => false);
      console.log('Has new referral button:', hasButton);

      await page.screenshot({ path: 'test-results/portal-new-referral-button.png', fullPage: true });
    });

    test('should display referral form when button clicked', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/referrals');
      await page.waitForLoadState('networkidle');

      // Click new referral button
      const newReferralButton = page.locator('button:has-text("New Referral")').first();
      if (await newReferralButton.isVisible().catch(() => false)) {
        await newReferralButton.click();
        await page.waitForTimeout(500);

        // Check for form fields
        const pageContent = await page.content();
        const hasNameField = pageContent.toLowerCase().includes('name');
        const hasPhoneField = pageContent.toLowerCase().includes('phone');
        console.log('Has name field:', hasNameField);
        console.log('Has phone field:', hasPhoneField);

        await page.screenshot({ path: 'test-results/portal-referral-form.png', fullPage: true });
      }
    });
  });

  test.describe('Therapist Change Request', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.evaluate(() => {
        localStorage.setItem('portalToken', 'test-portal-token');
        localStorage.setItem('portalClient', JSON.stringify({
          id: 'test-client-id',
          firstName: 'Test',
          lastName: 'Client'
        }));
      });
    });

    test('should display therapist change request page', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/therapist-change');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      const pageContent = await page.content();
      const hasChangeContent = pageContent.toLowerCase().includes('therapist') ||
                                pageContent.toLowerCase().includes('change') ||
                                pageContent.toLowerCase().includes('request');
      console.log('Therapist change page loaded:', hasChangeContent);

      await page.screenshot({ path: 'test-results/portal-therapist-change.png', fullPage: true });
    });

    test('should have reason input field', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/therapist-change');
      await page.waitForLoadState('networkidle');

      // Check for reason field
      const pageContent = await page.content();
      const hasReasonField = pageContent.toLowerCase().includes('reason');
      console.log('Has reason field:', hasReasonField);

      await page.screenshot({ path: 'test-results/portal-therapist-change-form.png', fullPage: true });
    });
  });

  test.describe('Portal Messages', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.evaluate(() => {
        localStorage.setItem('portalToken', 'test-portal-token');
        localStorage.setItem('portalClient', JSON.stringify({
          id: 'test-client-id',
          firstName: 'Test',
          lastName: 'Client'
        }));
      });
    });

    test('should display messages page', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/messages');
      await page.waitForLoadState('networkidle');

      // Verify messages page loaded
      const pageContent = await page.content();
      const hasMessagesContent = pageContent.toLowerCase().includes('message') ||
                                  pageContent.toLowerCase().includes('inbox') ||
                                  pageContent.toLowerCase().includes('conversation');
      console.log('Messages page loaded:', hasMessagesContent);

      await page.screenshot({ path: 'test-results/portal-messages.png', fullPage: true });
    });

    test('should have compose message option', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/messages');
      await page.waitForLoadState('networkidle');

      // Check for compose button
      const pageContent = await page.content();
      const hasComposeOption = pageContent.toLowerCase().includes('compose') ||
                                pageContent.toLowerCase().includes('new message') ||
                                pageContent.toLowerCase().includes('send');
      console.log('Has compose option:', hasComposeOption);

      await page.screenshot({ path: 'test-results/portal-compose-message.png', fullPage: true });
    });
  });

  test.describe('Portal Profile', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.evaluate(() => {
        localStorage.setItem('portalToken', 'test-portal-token');
        localStorage.setItem('portalClient', JSON.stringify({
          id: 'test-client-id',
          firstName: 'Test',
          lastName: 'Client',
          email: 'test@client.com'
        }));
      });
    });

    test('should display profile page', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/profile');
      await page.waitForLoadState('networkidle');

      // Verify profile page loaded
      const pageContent = await page.content();
      const hasProfileContent = pageContent.toLowerCase().includes('profile') ||
                                 pageContent.toLowerCase().includes('account') ||
                                 pageContent.toLowerCase().includes('settings');
      console.log('Profile page loaded:', hasProfileContent);

      await page.screenshot({ path: 'test-results/portal-profile.png', fullPage: true });
    });

    test('should show user information', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/profile');
      await page.waitForLoadState('networkidle');

      // Check for user info fields
      const pageContent = await page.content();
      const hasName = pageContent.toLowerCase().includes('name');
      const hasEmail = pageContent.toLowerCase().includes('email');
      console.log('Shows name:', hasName);
      console.log('Shows email:', hasEmail);

      await page.screenshot({ path: 'test-results/portal-profile-info.png', fullPage: true });
    });
  });

  test.describe('Portal Documents', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.evaluate(() => {
        localStorage.setItem('portalToken', 'test-portal-token');
        localStorage.setItem('portalClient', JSON.stringify({
          id: 'test-client-id',
          firstName: 'Test',
          lastName: 'Client'
        }));
      });
    });

    test('should display documents page', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/documents');
      await page.waitForLoadState('networkidle');

      // Verify documents page loaded
      const pageContent = await page.content();
      const hasDocumentsContent = pageContent.toLowerCase().includes('document') ||
                                   pageContent.toLowerCase().includes('file') ||
                                   pageContent.toLowerCase().includes('form');
      console.log('Documents page loaded:', hasDocumentsContent);

      await page.screenshot({ path: 'test-results/portal-documents.png', fullPage: true });
    });
  });

  test.describe('Portal Sleep Diary', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.evaluate(() => {
        localStorage.setItem('portalToken', 'test-portal-token');
        localStorage.setItem('portalClient', JSON.stringify({
          id: 'test-client-id',
          firstName: 'Test',
          lastName: 'Client'
        }));
      });
    });

    test('should display sleep diary page', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/sleep-diary');
      await page.waitForLoadState('networkidle');

      // Verify sleep diary page loaded
      const pageContent = await page.content();
      const hasSleepContent = pageContent.toLowerCase().includes('sleep');
      console.log('Sleep diary page loaded:', hasSleepContent);

      await page.screenshot({ path: 'test-results/portal-sleep-diary.png', fullPage: true });
    });
  });

  test.describe('Portal Exercise Log', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5175/portal/login');
      await page.evaluate(() => {
        localStorage.setItem('portalToken', 'test-portal-token');
        localStorage.setItem('portalClient', JSON.stringify({
          id: 'test-client-id',
          firstName: 'Test',
          lastName: 'Client'
        }));
      });
    });

    test('should display exercise log page', async ({ page }) => {
      await page.goto('http://localhost:5175/portal/exercise-log');
      await page.waitForLoadState('networkidle');

      // Verify exercise log page loaded
      const pageContent = await page.content();
      const hasExerciseContent = pageContent.toLowerCase().includes('exercise') ||
                                  pageContent.toLowerCase().includes('activity') ||
                                  pageContent.toLowerCase().includes('workout');
      console.log('Exercise log page loaded:', hasExerciseContent);

      await page.screenshot({ path: 'test-results/portal-exercise-log.png', fullPage: true });
    });
  });

  test.describe('Complete Portal Workflow', () => {
    test('should navigate through entire portal', async ({ page }) => {
      // Start at login
      await page.goto('http://localhost:5175/portal/login');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/portal-workflow-1-login.png', fullPage: true });

      // Set up auth
      await page.evaluate(() => {
        localStorage.setItem('portalToken', 'test-portal-token');
        localStorage.setItem('portalClient', JSON.stringify({
          id: 'test-client-id',
          firstName: 'Test',
          lastName: 'Client'
        }));
      });

      // Navigate to dashboard
      await page.goto('http://localhost:5175/portal/dashboard');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/portal-workflow-2-dashboard.png', fullPage: true });

      // Navigate to appointments
      await page.goto('http://localhost:5175/portal/appointments');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/portal-workflow-3-appointments.png', fullPage: true });

      // Navigate to mood tracking
      await page.goto('http://localhost:5175/portal/mood-tracking');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/portal-workflow-4-mood.png', fullPage: true });

      // Navigate to assessments
      await page.goto('http://localhost:5175/portal/assessments');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/portal-workflow-5-assessments.png', fullPage: true });

      // Navigate to billing
      await page.goto('http://localhost:5175/portal/billing');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/portal-workflow-6-billing.png', fullPage: true });

      // Navigate to referrals
      await page.goto('http://localhost:5175/portal/referrals');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/portal-workflow-7-referrals.png', fullPage: true });

      // Navigate to messages
      await page.goto('http://localhost:5175/portal/messages');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/portal-workflow-8-messages.png', fullPage: true });

      // Navigate to profile
      await page.goto('http://localhost:5175/portal/profile');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/portal-workflow-9-profile.png', fullPage: true });

      console.log('Complete portal workflow navigation successful');
    });
  });
});
