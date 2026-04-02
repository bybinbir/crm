/**
 * ISS Manager Browser Client
 * Task 079 - Chromium-based automation for ISS Manager export
 *
 * Uses Playwright to:
 * 1. Login to ISS Manager panel
 * 2. Navigate to export page
 * 3. Download customer CSV/XLSX
 * 4. Feed to existing CSV import pipeline
 */

import * as fs from 'fs';
import * as path from 'path';

import { Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import type { Browser, Page, BrowserContext } from 'playwright';

import type {
  BrowserConfig,
  LoginResult,
  ExportResult,
} from './issmanager.browser.types';

export class ISSManagerBrowserClient {
  private logger = new Logger(ISSManagerBrowserClient.name);
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private eventLog: Array<{ time: number; type: string; data: unknown }> = [];
  private requestLog: Array<{
    time: number;
    url: string;
    method: string;
    type: string;
  }> = [];
  private responseLog: Array<{
    time: number;
    url: string;
    status: number;
    size: number;
  }> = [];

  constructor(private config: BrowserConfig) {
    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure download and screenshot directories exist
   */
  private ensureDirectories(): void {
    if (!fs.existsSync(this.config.downloadDir)) {
      fs.mkdirSync(this.config.downloadDir, { recursive: true });
    }
    if (!fs.existsSync(this.config.screenshotDir)) {
      fs.mkdirSync(this.config.screenshotDir, { recursive: true });
    }

    // Ensure video and logs directories
    const videoDir = path.join(this.config.screenshotDir, 'videos');
    const logsDir = path.join(this.config.screenshotDir, 'logs');
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  /**
   * Setup comprehensive event listeners for debugging
   * Task 080 - Event-level instrumentation
   */
  private setupEventListeners(): void {
    if (!this.page) return;

    const logEvent = (type: string, data: unknown) => {
      this.eventLog.push({ time: Date.now(), type, data });
      this.logger.debug(
        `[EVENT] ${type}: ${JSON.stringify(data).substring(0, 200)}`
      );
    };

    // Console messages from the page
    this.page.on('console', (msg) => {
      logEvent('console', {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
      });
    });

    // Page errors
    this.page.on('pageerror', (error) => {
      logEvent('pageerror', {
        message: error.message,
        stack: error.stack,
      });
      this.logger.error(`[PAGE ERROR] ${error.message}`);
    });

    // Requests
    this.page.on('request', (request) => {
      this.requestLog.push({
        time: Date.now(),
        url: request.url(),
        method: request.method(),
        type: request.resourceType(),
      });
      if (
        request.resourceType() === 'xhr' ||
        request.resourceType() === 'fetch'
      ) {
        logEvent('request', {
          url: request.url(),
          method: request.method(),
          type: request.resourceType(),
        });
      }
    });

    // Responses
    this.page.on('response', async (response) => {
      const size = parseInt(response.headers()['content-length'] || '0', 10);
      this.responseLog.push({
        time: Date.now(),
        url: response.url(),
        status: response.status(),
        size,
      });

      // Log important responses
      if (
        response.url().includes('excel') ||
        response.url().includes('export') ||
        response.url().includes('rapor') ||
        response.url().includes('indir') ||
        response.status() >= 400
      ) {
        logEvent('response', {
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          contentType: response.headers()['content-type'],
          size,
        });
      }
    });

    // Failed requests
    this.page.on('requestfailed', (request) => {
      logEvent('requestfailed', {
        url: request.url(),
        failure: request.failure()?.errorText,
      });
      this.logger.warn(
        `[REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText}`
      );
    });

    // Frame navigation
    this.page.on('framenavigated', (frame) => {
      if (frame === this.page?.mainFrame()) {
        logEvent('framenavigated', {
          url: frame.url(),
          name: frame.name(),
        });
        this.logger.log(`[NAVIGATION] ${frame.url()}`);
      }
    });

    // Popups
    this.page.on('popup', async (popup) => {
      logEvent('popup', {
        url: popup.url(),
      });
      this.logger.log(`[POPUP] ${popup.url()}`);
    });

    // Dialogs (alert, confirm, prompt)
    this.page.on('dialog', async (dialog) => {
      logEvent('dialog', {
        type: dialog.type(),
        message: dialog.message(),
      });
      this.logger.log(`[DIALOG] ${dialog.type()}: ${dialog.message()}`);
      await dialog.dismiss(); // Auto-dismiss
    });

    // Downloads
    this.page.on('download', (download) => {
      logEvent('download', {
        url: download.url(),
        suggestedFilename: download.suggestedFilename(),
      });
      this.logger.log(`[DOWNLOAD EVENT] ${download.suggestedFilename()}`);
    });

    this.logger.log('Event listeners setup complete');
  }

  /**
   * Save event logs to file for analysis
   */
  private async saveEventLogs(prefix: string): Promise<string> {
    const logFile = path.join(
      this.config.screenshotDir,
      'logs',
      `${prefix}-events-${Date.now()}.json`
    );

    const logData = {
      eventLog: this.eventLog,
      requestLog: this.requestLog.slice(-50), // Last 50 requests
      responseLog: this.responseLog.slice(-50), // Last 50 responses
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
    this.logger.log(`Event logs saved: ${logFile}`);
    return logFile;
  }

  /**
   * Initialize browser instance
   */
  async initialize(): Promise<void> {
    this.logger.log('Initializing Chromium browser...');

    this.browser = await chromium.launch({
      headless: this.config.headless,
      timeout: this.config.timeout,
    });

    this.context = await this.browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: path.join(this.config.screenshotDir, 'videos'),
        size: { width: 1920, height: 1080 },
      },
    });

    this.page = await this.context.newPage();

    // Set default timeout
    this.page.setDefaultTimeout(this.config.timeout);

    // Enable comprehensive event instrumentation
    this.setupEventListeners();

    this.logger.log('Browser initialized successfully');
  }

  /**
   * Login to ISS Manager panel
   */
  async login(): Promise<LoginResult> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    this.logger.log(`Navigating to login page: ${this.config.baseUrl}/login`);

    try {
      // Navigate to login page
      await this.page.goto(`${this.config.baseUrl}/login`, {
        waitUntil: 'networkidle',
      });

      // Take screenshot before login
      const beforeLoginScreenshot = path.join(
        this.config.screenshotDir,
        `before-login-${Date.now()}.png`
      );
      await this.page.screenshot({ path: beforeLoginScreenshot });
      this.logger.log(`Screenshot saved: ${beforeLoginScreenshot}`);

      // Find login form fields (resilient selectors with fallbacks)
      const usernameSelector = await this.findUsernameField();
      const passwordSelector = await this.findPasswordField();
      const submitSelector = await this.findSubmitButton();

      if (!usernameSelector || !passwordSelector || !submitSelector) {
        throw new Error('Could not find login form elements');
      }

      this.logger.log('Filling login form...');

      // Fill credentials (masked logging)
      await this.page.fill(usernameSelector, this.config.username);
      this.logger.log(
        `Username filled: ${this.maskString(this.config.username)}`
      );

      await this.page.fill(passwordSelector, this.config.password);
      this.logger.log('Password filled: ********');

      // Submit form
      await Promise.all([
        this.page.waitForNavigation({ timeout: this.config.timeout }),
        this.page.click(submitSelector),
      ]);

      // Take screenshot after login
      const afterLoginScreenshot = path.join(
        this.config.screenshotDir,
        `after-login-${Date.now()}.png`
      );
      await this.page.screenshot({ path: afterLoginScreenshot });
      this.logger.log(`Screenshot saved: ${afterLoginScreenshot}`);

      // Get current URL after login
      const landingUrl = this.page.url();
      this.logger.log(`Landed on: ${landingUrl}`);

      // Check if login was successful (heuristics)
      const loginSuccess = await this.detectLoginSuccess();

      if (!loginSuccess) {
        throw new Error('Login failed - still on login page or error detected');
      }

      // Get session cookies
      const cookies = await this.context?.cookies();

      const duration = Date.now() - startTime;
      this.logger.log(`Login successful in ${duration}ms`);

      return {
        success: true,
        message: 'Login successful',
        sessionCookies: cookies,
        landingUrl,
        screenshot: afterLoginScreenshot,
      };
    } catch (error) {
      const errorScreenshot = path.join(
        this.config.screenshotDir,
        `login-error-${Date.now()}.png`
      );

      if (this.page) {
        await this.page.screenshot({ path: errorScreenshot });
      }

      this.logger.error(
        `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      return {
        success: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        screenshot: errorScreenshot,
      };
    }
  }

  /**
   * Export customer data (CSV/XLSX)
   * Real implementation: Click "Müşteriler" sidebar link, then click "Excel" button
   */
  async exportCustomers(): Promise<ExportResult> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    this.logger.log('Starting customer export...');

    try {
      // Step 1: Click "Müşteriler" link in sidebar
      this.logger.log('Navigating to customer list via sidebar...');

      const musteriLink = await this.page
        .locator('a:has-text("Müşteriler")')
        .first();

      if (!(await musteriLink.count())) {
        throw new Error('Could not find "Müşteriler" link in sidebar');
      }

      await musteriLink.click();
      await this.page.waitForLoadState('networkidle');

      this.logger.log(`Navigated to: ${this.page.url()}`);

      // Take screenshot before export
      const beforeExportScreenshot = path.join(
        this.config.screenshotDir,
        `before-export-${Date.now()}.png`
      );
      await this.page.screenshot({ path: beforeExportScreenshot });

      // Step 2: Find and click Excel dropdown button
      const exportButton = await this.findExportButton();

      if (!exportButton) {
        throw new Error('Could not find Excel export button');
      }

      this.logger.log('Clicking Excel dropdown button...');

      // Click to open dropdown
      await this.page.click(exportButton);
      await this.page.waitForTimeout(1000); // Wait for dropdown to appear

      // Debug: Inspect dropdown menu structure
      this.logger.log('Inspecting dropdown menu structure...');

      const dropdownLinks = await this.page
        .locator('ul.dropdown-menu a, div.dropdown-menu a, .dropdown a')
        .all();
      this.logger.log(`Found ${dropdownLinks.length} dropdown links`);

      for (let i = 0; i < dropdownLinks.length; i++) {
        try {
          const text = await dropdownLinks[i].innerText();
          const href = await dropdownLinks[i].getAttribute('href');
          const classes = await dropdownLinks[i].getAttribute('class');
          this.logger.log(
            `  [${i}] "${text.trim()}" | href="${href}" | class="${classes}"`
          );
        } catch (e) {
          this.logger.log(`  [${i}] Error inspecting link: ${e}`);
        }
      }

      // Step 3: Click "Excel" option in dropdown (first option with green icon)
      this.logger.log('Selecting Excel format from dropdown...');

      // Try to find Excel link with more specific selector
      const excelSelectors = [
        'a:has-text("Excel"):not(:has-text("2003")):not(:has-text("2007")):not(:has-text("365"))',
        'ul.dropdown-menu a:has-text("Excel")',
        'div.dropdown-menu a:has-text("Excel")',
        '.dropdown-menu a[href*="excel"]',
        'a:text-is("Excel")',
      ];

      let excelOption = null;
      for (const selector of excelSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if ((await element.count()) > 0) {
            this.logger.log(`Excel link found with selector: ${selector}`);
            excelOption = element;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!excelOption || !(await excelOption.count())) {
        throw new Error('Could not find Excel option in dropdown');
      }

      // Get link href for debugging
      const excelHref = await excelOption.getAttribute('href');
      this.logger.log(`Excel link href: ${excelHref}`);

      // Strategy: Excel link goes to a URL, not direct download
      // Navigate to URL and wait for download to start
      if (!excelHref || excelHref === 'javascript:void(0)') {
        throw new Error('Excel link has no valid href');
      }

      this.logger.log(`Navigating to Excel export URL: ${excelHref}`);

      // Navigate to export page (this is a report generation page, not direct download)
      await this.page.goto(excelHref, { waitUntil: 'networkidle' });

      // Take screenshot of export page
      const exportPageScreenshot = path.join(
        this.config.screenshotDir,
        `export-page-${Date.now()}.png`
      );
      await this.page.screenshot({ path: exportPageScreenshot });
      this.logger.log(`Export page screenshot: ${exportPageScreenshot}`);

      // Step 4: Click "Excel Oluştur" (Create Excel) button on the export page
      this.logger.log('Looking for "Excel Oluştur" button...');

      const createExcelButton = await this.page
        .locator(
          'button:has-text("Excel Oluştur"), a:has-text("Excel Oluştur")'
        )
        .first();

      if (!(await createExcelButton.count())) {
        throw new Error('Could not find "Excel Oluştur" button on export page');
      }

      this.logger.log('Clicking "Excel Oluştur" button...');

      // Task 080 - Deterministic export flow with table monitoring and polling

      // Step 1: Capture current state BEFORE click
      const beforeClickUrl = this.page.url();
      let beforeClickHtml = '';
      try {
        beforeClickHtml = await this.page.content();
      } catch (e) {
        this.logger.warn(
          `Failed to get page content before click: ${(e as Error).message}`
        );
      }
      const beforeClickRowCount = await this.page
        .locator('table tbody tr')
        .count();

      this.logger.log(
        `Before click - URL: ${beforeClickUrl}, Rows: ${beforeClickRowCount}`
      );

      // Save HTML snapshot before click
      if (beforeClickHtml) {
        const beforeClickHtmlFile = path.join(
          this.config.screenshotDir,
          `before-click-${Date.now()}.html`
        );
        fs.writeFileSync(beforeClickHtmlFile, beforeClickHtml);
        this.logger.log(`HTML snapshot before click: ${beforeClickHtmlFile}`);
      }

      // Step 2: Setup event listeners with Promise.race strategy
      let download = null;
      const eventPromises: Promise<{ type: string; data: unknown }>[] = [];

      // Listen for download event
      eventPromises.push(
        this.page
          .waitForEvent('download', { timeout: 10000 })
          .then((d) => ({ type: 'download', data: d }))
          .catch(() => ({ type: 'download_timeout', data: null }))
      );

      // Listen for popup
      eventPromises.push(
        this.page
          .waitForEvent('popup', { timeout: 10000 })
          .then((p) => ({ type: 'popup', data: p }))
          .catch(() => ({ type: 'popup_timeout', data: null }))
      );

      // Listen for navigation
      eventPromises.push(
        this.page
          .waitForNavigation({ timeout: 10000, waitUntil: 'networkidle' })
          .then(() => ({ type: 'navigation', data: this.page!.url() }))
          .catch(() => ({ type: 'navigation_timeout', data: null }))
      );

      // Step 3: Click button with noWaitAfter
      this.logger.log('Clicking button and monitoring events...');
      const clickTime = Date.now();
      await createExcelButton.click({ noWaitAfter: true });

      // Step 4: Race between multiple event types
      const firstEvent = await Promise.race(eventPromises);
      this.logger.log(
        `First event after click: ${firstEvent.type} (${Date.now() - clickTime}ms)`
      );

      // Step 5: Handle based on event type
      if (firstEvent.type === 'download' && firstEvent.data) {
        // Direct download started
        download = firstEvent.data;
        this.logger.log(
          `Download started immediately: ${download.suggestedFilename()}`
        );
      } else {
        // No direct download - navigation or timeout occurred
        if (firstEvent.type === 'navigation') {
          // Page navigated (302 redirect) - wait for page to fully load
          this.logger.log(
            `Page navigated to: ${firstEvent.data}, waiting for load...`
          );
          await this.page
            .waitForLoadState('networkidle', { timeout: 15000 })
            .catch(() => {
              this.logger.warn('Network idle timeout, continuing anyway');
            });
        } else {
          // No navigation, just wait
          this.logger.log(
            'No immediate download or navigation, waiting for page to settle...'
          );
        }

        await this.page.waitForTimeout(2000);

        // Save after-click snapshot
        const afterClickScreenshot = path.join(
          this.config.screenshotDir,
          `after-excel-click-${Date.now()}.png`
        );
        await this.page
          .screenshot({
            path: afterClickScreenshot,
            fullPage: false,
            timeout: 10000,
          })
          .catch((e) => {
            this.logger.warn(`Screenshot failed: ${e.message}`);
          });
        this.logger.log(`After click screenshot: ${afterClickScreenshot}`);

        const afterClickUrl = this.page.url();
        let afterClickHtml = '';
        try {
          afterClickHtml = await this.page.content();
        } catch (e) {
          this.logger.warn(
            `Failed to get page content after click: ${(e as Error).message}`
          );
        }
        const afterClickRowCount = await this.page
          .locator('table tbody tr')
          .count();

        this.logger.log(
          `After click - URL: ${afterClickUrl}, Rows: ${afterClickRowCount}`
        );

        // Save HTML snapshot after click
        if (afterClickHtml) {
          const afterClickHtmlFile = path.join(
            this.config.screenshotDir,
            `after-click-${Date.now()}.html`
          );
          fs.writeFileSync(afterClickHtmlFile, afterClickHtml);
          this.logger.log(`HTML snapshot after click: ${afterClickHtmlFile}`);
        }

        // Step 6: Poll for new row in table (file generation might be async)
        this.logger.log('Polling for new file in table...');
        const pollStartTime = Date.now();
        const maxPollTime = 60000; // 60 seconds max polling

        while (Date.now() - pollStartTime < maxPollTime) {
          await this.page.waitForTimeout(2000); // Poll every 2 seconds

          // Reload page to check for new rows (export might be async server job)
          await this.page.reload({ waitUntil: 'networkidle' });

          const newRowCount = await this.page.locator('table tbody tr').count();
          this.logger.log(
            `Polling... Rows: ${newRowCount} (elapsed: ${Date.now() - pollStartTime}ms)`
          );

          if (newRowCount > beforeClickRowCount) {
            this.logger.log(
              `New row detected! Before: ${beforeClickRowCount}, After: ${newRowCount}`
            );
            break;
          }

          // Check if İndir button already exists (might have been there before)
          const indirCount = await this.page
            .locator('a:has-text("İndir"), button:has-text("İndir")')
            .count();
          if (indirCount > 0) {
            this.logger.log(
              `Found ${indirCount} İndir buttons (no new row, but buttons exist)`
            );
            break;
          }
        }

        // Take screenshot after polling
        const afterPollingScreenshot = path.join(
          this.config.screenshotDir,
          `after-polling-${Date.now()}.png`
        );
        await this.page
          .screenshot({
            path: afterPollingScreenshot,
            fullPage: false,
            timeout: 10000,
          })
          .catch((e) => {
            this.logger.warn(`Polling screenshot failed: ${e.message}`);
          });
        this.logger.log(`After polling screenshot: ${afterPollingScreenshot}`);

        // Step 7: Find İndir button
        this.logger.log('Looking for "İndir" download button in table...');
        const indirButtons = await this.page
          .locator('a:has-text("İndir"), button:has-text("İndir")')
          .all();

        if (indirButtons.length === 0) {
          // Save event logs for debugging
          await this.saveEventLogs('export-failed');
          throw new Error(
            `No "İndir" (download) buttons found after ${Date.now() - pollStartTime}ms of polling`
          );
        }

        this.logger.log(`Found ${indirButtons.length} İndir buttons`);

        // Click FIRST İndir button (newest file is usually first)
        const indirButton = indirButtons[0];
        this.logger.log('Clicking first "İndir" button...');

        // Setup download event
        const downloadPromise = this.page.waitForEvent('download', {
          timeout: 30000,
        });
        await indirButton.click();
        download = await downloadPromise;

        this.logger.log(
          `Download started from İndir button: ${download.suggestedFilename()}`
        );
      }

      // Save download
      const fileName =
        download.suggestedFilename() || `export-${Date.now()}.xlsx`;
      const filePath = path.join(this.config.downloadDir, fileName);
      await download.saveAs(filePath);

      const fileStats = fs.statSync(filePath);
      this.logger.log(`File saved: ${filePath} (${fileStats.size} bytes)`);

      // Detect file format
      const format = this.detectFileFormat(fileName);

      // Save event logs on success
      await this.saveEventLogs('export-success');

      return {
        success: true,
        message: 'Export successful',
        filePath,
        fileName,
        fileSize: fileStats.size,
        format,
      };
    } catch (error) {
      const errorScreenshot = path.join(
        this.config.screenshotDir,
        `export-error-${Date.now()}.png`
      );

      if (this.page) {
        await this.page
          .screenshot({
            path: errorScreenshot,
            fullPage: false,
            timeout: 10000,
          })
          .catch((e) => {
            this.logger.warn(`Error screenshot failed: ${e.message}`);
          });
      }

      // Save event logs on error
      await this.saveEventLogs('export-error');

      this.logger.error(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      return {
        success: false,
        message: 'Export failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        screenshot: errorScreenshot,
      };
    }
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();

    this.page = null;
    this.context = null;
    this.browser = null;

    this.logger.log('Browser closed');
  }

  /**
   * Find username input field (resilient selectors)
   */
  private async findUsernameField(): Promise<string | null> {
    const selectors = [
      'input[name="username"]',
      'input[name="email"]',
      'input[type="text"]',
      'input[placeholder*="kullanıcı" i]',
      'input[placeholder*="username" i]',
      'input#username',
      'input#user',
    ];

    for (const selector of selectors) {
      try {
        const element = await this.page?.locator(selector).first();
        if (await element?.isVisible()) {
          this.logger.log(`Username field found: ${selector}`);
          return selector;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Find password input field (resilient selectors)
   */
  private async findPasswordField(): Promise<string | null> {
    const selectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input[placeholder*="şifre" i]',
      'input[placeholder*="password" i]',
      'input#password',
      'input#pass',
    ];

    for (const selector of selectors) {
      try {
        const element = await this.page?.locator(selector).first();
        if (await element?.isVisible()) {
          this.logger.log(`Password field found: ${selector}`);
          return selector;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Find submit button (resilient selectors)
   */
  private async findSubmitButton(): Promise<string | null> {
    const selectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Giriş")',
      'button:has-text("Login")',
      'button:has-text("Oturum Aç")',
      'button:has-text("Sign In")',
    ];

    for (const selector of selectors) {
      try {
        const element = await this.page?.locator(selector).first();
        if (await element?.isVisible()) {
          this.logger.log(`Submit button found: ${selector}`);
          return selector;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Detect if login was successful
   */
  private async detectLoginSuccess(): Promise<boolean> {
    if (!this.page) return false;

    const url = this.page.url();

    // Still on login page = fail
    if (url.includes('/login')) {
      return false;
    }

    // Look for error indicators
    const errorTexts = ['hatalı', 'error', 'geçersiz', 'invalid', 'failed'];
    for (const text of errorTexts) {
      const errorElement = await this.page.locator(`text=${text}`).first();
      if (await errorElement.isVisible().catch(() => false)) {
        return false;
      }
    }

    // Success indicators
    const successIndicators = ['dashboard', 'panel', 'ana sayfa', 'home'];
    for (const indicator of successIndicators) {
      if (url.toLowerCase().includes(indicator)) {
        return true;
      }
    }

    // If URL changed from /login, assume success
    return true;
  }

  /**
   * Find export page URL (customer list page)
   */
  private async findExportPage(): Promise<string | null> {
    // Based on screenshot: "MÜŞTERİ İŞLEMLERİ" -> "Müşteriler"
    const customerListPaths = [
      '/customers',
      '/musteriler',
      '/musteri',
      '/customer/list',
      '/musteri/liste',
    ];

    for (const path of customerListPaths) {
      const fullUrl = `${this.config.baseUrl}${path}`;
      return fullUrl; // Return customer list page
    }

    return null;
  }

  /**
   * Find export button
   */
  private async findExportButton(): Promise<string | null> {
    const selectors = [
      'button:has-text("Export")',
      'button:has-text("İndir")',
      'button:has-text("Download")',
      'button:has-text("CSV")',
      'button:has-text("Excel")',
      'a:has-text("Export")',
      'a:has-text("İndir")',
      'button[class*="export"]',
      'a[class*="export"]',
    ];

    for (const selector of selectors) {
      try {
        const element = await this.page?.locator(selector).first();
        if (await element?.isVisible()) {
          this.logger.log(`Export button found: ${selector}`);
          return selector;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Detect file format from filename
   */
  private detectFileFormat(fileName: string): 'csv' | 'xlsx' | 'xls' {
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.csv')) return 'csv';
    if (lowerName.endsWith('.xlsx')) return 'xlsx';
    if (lowerName.endsWith('.xls')) return 'xls';
    return 'csv'; // Default
  }

  /**
   * Mask sensitive string for logging
   */
  private maskString(str: string): string {
    if (str.length <= 3) return '***';
    return `${str.substring(0, 2)}***${str.substring(str.length - 1)}`;
  }
}
