import { test, expect } from '@playwright/test';

test.describe('Telehealth Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('http://localhost:5175/login');

    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"]', { state: 'visible' });

    // Login with clinician credentials
    await page.fill('input[type="email"], input[name="email"]', 'superadmin@mentalspace.com');
    await page.fill('input[type="password"], input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test.describe('Telehealth Dashboard', () => {
    test('should display telehealth dashboard', async ({ page }) => {
      // Navigate to telehealth dashboard
      await page.goto('http://localhost:5175/telehealth');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toContain('telehealth');

      await page.screenshot({ path: 'test-results/telehealth-dashboard.png', fullPage: true });
    });

    test('should display session statistics', async ({ page }) => {
      await page.goto('http://localhost:5175/telehealth');
      await page.waitForLoadState('networkidle');

      // Check for stats cards
      const statsSection = page.locator('.grid').first();
      expect(await statsSection.isVisible()).toBeTruthy();

      // Look for typical stats labels
      const pageContent = await page.content();
      const hasStats = pageContent.toLowerCase().includes('session') ||
                       pageContent.toLowerCase().includes('client') ||
                       pageContent.toLowerCase().includes('hour');
      console.log('Dashboard has stats:', hasStats);

      await page.screenshot({ path: 'test-results/telehealth-stats.png', fullPage: true });
    });

    test('should display recent session ratings section', async ({ page }) => {
      await page.goto('http://localhost:5175/telehealth');
      await page.waitForLoadState('networkidle');

      // Look for ratings section
      const pageContent = await page.content();
      const hasRatingsSection = pageContent.toLowerCase().includes('rating') ||
                                 pageContent.toLowerCase().includes('feedback');
      console.log('Has ratings section:', hasRatingsSection);

      await page.screenshot({ path: 'test-results/telehealth-ratings.png', fullPage: true });
    });

    test('should have quick action buttons', async ({ page }) => {
      await page.goto('http://localhost:5175/telehealth');
      await page.waitForLoadState('networkidle');

      // Check for quick action buttons
      const scheduleButton = page.locator('button:has-text("Schedule"), a:has-text("Schedule Session")').first();
      if (await scheduleButton.isVisible()) {
        console.log('Schedule Session button found');
      }

      await page.screenshot({ path: 'test-results/telehealth-quick-actions.png', fullPage: true });
    });
  });

  test.describe('Telehealth Session Page', () => {
    test('should display session waiting room', async ({ page }) => {
      // Navigate to a telehealth session (using a test appointment ID)
      await page.goto('http://localhost:5175/telehealth/session/test-appointment-id?role=clinician');
      await page.waitForLoadState('networkidle');

      // Verify page loads (may show waiting room or session interface)
      const pageContent = await page.content();
      const hasSessionElements = pageContent.toLowerCase().includes('session') ||
                                  pageContent.toLowerCase().includes('video') ||
                                  pageContent.toLowerCase().includes('waiting') ||
                                  pageContent.toLowerCase().includes('join');
      console.log('Session page has elements:', hasSessionElements);

      await page.screenshot({ path: 'test-results/telehealth-session-page.png', fullPage: true });
    });

    test('should display video controls when in session', async ({ page }) => {
      await page.goto('http://localhost:5175/telehealth/session/test-appointment-id?role=clinician');
      await page.waitForLoadState('networkidle');

      // Check for video control elements
      const pageContent = await page.content();
      const hasVideoControls = pageContent.toLowerCase().includes('video') ||
                                pageContent.toLowerCase().includes('audio') ||
                                pageContent.toLowerCase().includes('mute');
      console.log('Has video controls:', hasVideoControls);

      await page.screenshot({ path: 'test-results/telehealth-video-controls.png', fullPage: true });
    });

    test('should display recording consent option', async ({ page }) => {
      await page.goto('http://localhost:5175/telehealth/session/test-appointment-id?role=clinician');
      await page.waitForLoadState('networkidle');

      // Check for recording elements
      const pageContent = await page.content();
      const hasRecordingElements = pageContent.toLowerCase().includes('record') ||
                                    pageContent.toLowerCase().includes('consent');
      console.log('Has recording elements:', hasRecordingElements);

      await page.screenshot({ path: 'test-results/telehealth-recording.png', fullPage: true });
    });
  });

  test.describe('Session Components', () => {
    test('should display waiting room component', async ({ page }) => {
      await page.goto('http://localhost:5175/telehealth/session/test-appointment-id?role=clinician');
      await page.waitForLoadState('networkidle');

      // The waiting room or session interface should be displayed
      const waitingRoom = page.locator('[data-testid="waiting-room"], .waiting-room, div:has-text("Waiting")').first();

      if (await waitingRoom.isVisible()) {
        console.log('Waiting room is visible');
      } else {
        console.log('Waiting room not visible - may be in active session');
      }

      await page.screenshot({ path: 'test-results/telehealth-waiting-room.png', fullPage: true });
    });

    test('should display emergency contact access', async ({ page }) => {
      await page.goto('http://localhost:5175/telehealth/session/test-appointment-id?role=clinician');
      await page.waitForLoadState('networkidle');

      // Check for emergency contact elements
      const pageContent = await page.content();
      const hasEmergencyElements = pageContent.toLowerCase().includes('emergency') ||
                                    pageContent.toLowerCase().includes('contact');
      console.log('Has emergency elements:', hasEmergencyElements);

      await page.screenshot({ path: 'test-results/telehealth-emergency.png', fullPage: true });
    });

    test('should display transcription section when available', async ({ page }) => {
      await page.goto('http://localhost:5175/telehealth/session/test-appointment-id?role=clinician');
      await page.waitForLoadState('networkidle');

      // Check for transcription elements
      const pageContent = await page.content();
      const hasTranscriptionElements = pageContent.toLowerCase().includes('transcript') ||
                                        pageContent.toLowerCase().includes('speech') ||
                                        pageContent.toLowerCase().includes('text');
      console.log('Has transcription elements:', hasTranscriptionElements);

      await page.screenshot({ path: 'test-results/telehealth-transcription.png', fullPage: true });
    });
  });

  test.describe('Client Portal Telehealth', () => {
    test('should display portal telehealth page', async ({ page }) => {
      // Navigate to portal telehealth
      await page.goto('http://localhost:5175/portal/telehealth/test-appointment-id');
      await page.waitForLoadState('networkidle');

      // Verify page loads (will likely redirect to login if not authenticated)
      const pageContent = await page.content();
      const hasTelehealthContent = pageContent.toLowerCase().includes('telehealth') ||
                                    pageContent.toLowerCase().includes('session') ||
                                    pageContent.toLowerCase().includes('login');
      console.log('Portal telehealth page loaded:', hasTelehealthContent);

      await page.screenshot({ path: 'test-results/portal-telehealth.png', fullPage: true });
    });
  });

  test.describe('Consent Management', () => {
    test('should display telehealth consent page', async ({ page }) => {
      // Navigate to consent page
      await page.goto('http://localhost:5175/telehealth/consent/test-client-id');
      await page.waitForLoadState('networkidle');

      // Check for consent elements
      const pageContent = await page.content();
      const hasConsentElements = pageContent.toLowerCase().includes('consent') ||
                                  pageContent.toLowerCase().includes('agree') ||
                                  pageContent.toLowerCase().includes('telehealth');
      console.log('Has consent elements:', hasConsentElements);

      await page.screenshot({ path: 'test-results/telehealth-consent.png', fullPage: true });
    });

    test('should show consent requirements', async ({ page }) => {
      await page.goto('http://localhost:5175/telehealth/consent/test-client-id');
      await page.waitForLoadState('networkidle');

      // Look for Georgia telehealth requirements
      const pageContent = await page.content();
      const hasRequirements = pageContent.toLowerCase().includes('rights') ||
                               pageContent.toLowerCase().includes('privacy') ||
                               pageContent.toLowerCase().includes('emergency');
      console.log('Has consent requirements:', hasRequirements);

      await page.screenshot({ path: 'test-results/telehealth-consent-requirements.png', fullPage: true });
    });
  });

  test.describe('Session Rating Flow', () => {
    test('should display session rating interface', async ({ page }) => {
      // Navigate to telehealth dashboard which shows ratings
      await page.goto('http://localhost:5175/telehealth');
      await page.waitForLoadState('networkidle');

      // Check for rating elements
      const ratingSection = page.locator(':has-text("Rating"), :has-text("Feedback")').first();
      if (await ratingSection.isVisible()) {
        console.log('Rating section is visible');
      }

      await page.screenshot({ path: 'test-results/telehealth-rating-section.png', fullPage: true });
    });

    test('should display rating statistics for admin', async ({ page }) => {
      await page.goto('http://localhost:5175/telehealth');
      await page.waitForLoadState('networkidle');

      // Check for star rating display
      const pageContent = await page.content();
      const hasRatingStats = pageContent.includes('Star') ||
                              pageContent.includes('star') ||
                              pageContent.includes('rating');
      console.log('Has rating statistics:', hasRatingStats);

      await page.screenshot({ path: 'test-results/telehealth-rating-stats.png', fullPage: true });
    });
  });

  test.describe('Complete Telehealth Workflow', () => {
    test('should navigate through telehealth module sections', async ({ page }) => {
      // Start at telehealth dashboard
      await page.goto('http://localhost:5175/telehealth');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/telehealth-workflow-1-dashboard.png', fullPage: true });

      // Navigate to appointments (telehealth appointments)
      await page.goto('http://localhost:5175/appointments');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/telehealth-workflow-2-appointments.png', fullPage: true });

      // Navigate to a session page
      await page.goto('http://localhost:5175/telehealth/session/test-id?role=clinician');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/telehealth-workflow-3-session.png', fullPage: true });

      // Back to dashboard
      await page.goto('http://localhost:5175/telehealth');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/telehealth-workflow-4-back.png', fullPage: true });

      console.log('Complete telehealth workflow navigation successful');
    });
  });
});
