import * as fs from 'fs/promises';
import * as path from 'path';

import { Injectable, Logger } from '@nestjs/common';
import type { IntegrationConfig } from '@prisma/client';
import { chromium, Browser, Page } from 'playwright';

export interface AutomationResult {
  filesProcessed: number;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  downloadedFile: string | null;
  stagingFilePath: string | null;
  importBatchId: string | null;
}

@Injectable()
export class ISSManagerAutomationWorker {
  private readonly logger = new Logger(ISSManagerAutomationWorker.name);
  private readonly downloadDir = path.join(process.cwd(), 'temp', 'downloads');
  private readonly stagingDir = path.join(process.cwd(), 'temp', 'staging');

  constructor() {
    // Ensure directories exist
    this.ensureDirectories().catch((err) => {
      this.logger.error('Failed to create directories:', err);
    });
  }

  private async ensureDirectories() {
    await fs.mkdir(this.downloadDir, { recursive: true });
    await fs.mkdir(this.stagingDir, { recursive: true });
  }

  async execute(
    integration: IntegrationConfig,
    jobId: string
  ): Promise<AutomationResult> {
    this.logger.log(`Starting automation for job ${jobId}`);

    let browser: Browser | null = null;

    try {
      // Launch browser
      browser = await chromium.launch({
        headless: true,
        timeout: 30000,
      });

      const context = await browser.newContext({
        acceptDownloads: true,
        viewport: { width: 1920, height: 1080 },
      });

      const page = await context.newPage();

      // Parse credentials from encrypted apiKey
      const [username, password] = this.parseCredentials(
        integration.apiKeyEncrypted
      );

      // Navigate to ISSmanager login
      await page.goto(integration.baseUrl, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      this.logger.log('Navigated to ISSmanager panel');

      // Login
      await this.performLogin(page, username, password);
      this.logger.log('Login successful');

      // Navigate to export page
      await this.navigateToExportPage(page);
      this.logger.log('Navigated to export page');

      // Download export file
      const downloadedFile = await this.downloadExportFile(page, jobId);
      this.logger.log(`Downloaded file: ${downloadedFile}`);

      // Move to staging
      const stagingFilePath = await this.moveToStaging(downloadedFile, jobId);
      this.logger.log(`Moved to staging: ${stagingFilePath}`);

      await browser.close();

      // Trigger import (simplified - in real implementation, integrate with import service)
      const importResult = await this.triggerImport(stagingFilePath);

      return {
        filesProcessed: 1,
        recordsProcessed: importResult.recordsProcessed,
        recordsSucceeded: importResult.recordsSucceeded,
        recordsFailed: importResult.recordsFailed,
        downloadedFile,
        stagingFilePath,
        importBatchId: importResult.batchId,
      };
    } catch (error) {
      this.logger.error(`Automation failed for job ${jobId}:`, error);

      if (browser) {
        await browser.close();
      }

      throw error;
    }
  }

  private parseCredentials(apiKeyEncrypted: string): [string, string] {
    // In real implementation, decrypt using ENCRYPTION_KEY
    // For now, assume format "username:password"
    const [username, password] = apiKeyEncrypted.split(':');

    if (!username || !password) {
      throw new Error(
        'Invalid credential format. Expected "username:password"'
      );
    }

    return [username, password];
  }

  private async performLogin(page: Page, username: string, password: string) {
    // Wait for login form
    await page.waitForSelector('input[name="username"], input[type="text"]', {
      timeout: 10000,
    });

    // Fill credentials
    await page.fill('input[name="username"], input[type="text"]', username);
    await page.fill('input[name="password"], input[type="password"]', password);

    // Submit
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"], input[type="submit"]'),
    ]);

    // Verify login success
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('error')) {
      throw new Error('Login failed - still on login page or error page');
    }
  }

  private async navigateToExportPage(page: Page) {
    // Navigate to export/customer page
    // This is vendor-specific, adjust based on real ISSmanager UI
    await page.goto(`${page.url()}/export/customers`, {
      waitUntil: 'networkidle',
    });
  }

  private async downloadExportFile(page: Page, jobId: string): Promise<string> {
    // Click export button and wait for download
    const downloadPromise = page.waitForEvent('download');

    await page.click('button:has-text("Export"), a:has-text("Export")');

    const download = await downloadPromise;
    const fileName = `issmanager-export-${jobId}-${Date.now()}.csv`;
    const downloadPath = path.join(this.downloadDir, fileName);

    await download.saveAs(downloadPath);

    return downloadPath;
  }

  private async moveToStaging(
    downloadPath: string,
    _jobId: string
  ): Promise<string> {
    const fileName = path.basename(downloadPath);
    const stagingPath = path.join(this.stagingDir, fileName);

    await fs.rename(downloadPath, stagingPath);

    return stagingPath;
  }

  private async triggerImport(_stagingFilePath: string): Promise<{
    batchId: string;
    recordsProcessed: number;
    recordsSucceeded: number;
    recordsFailed: number;
  }> {
    // In real implementation, integrate with ImportService
    // For now, return mock data
    this.logger.warn(
      'Import integration not yet implemented - returning mock data'
    );

    return {
      batchId: 'mock-batch-id',
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
    };
  }
}
