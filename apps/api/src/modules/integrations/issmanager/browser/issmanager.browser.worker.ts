/**
 * ISS Manager Browser Worker
 * Task 079 - Orchestrates browser automation and CSV import pipeline
 *
 * Workflow:
 * 1. Initialize Chromium browser
 * 2. Login to ISS Manager panel
 * 3. Navigate to export page and download CSV/XLSX
 * 4. Feed downloaded file to existing CSV import pipeline
 * 5. Clean up artifacts and return results
 */

import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

import { ISSManagerBrowserClient } from './issmanager.browser.client';
import type {
  BrowserConfig,
  BrowserRunResult,
  LoginResult,
  ExportResult,
} from './issmanager.browser.types';

export interface BrowserWorkerConfig extends BrowserConfig {
  importProcessorCallback?: (
    fileBuffer: Buffer,
    fileName: string,
    fileSize: number,
    fileMimeType: string,
    userId: string
  ) => Promise<{
    batchId: string;
    totalRows: number;
    successRows: number;
    failedRows: number;
  }>;
  systemUserId: string; // User ID for system-initiated imports
  cleanupAfterRun: boolean;
}

export class ISSManagerBrowserWorker {
  private logger = new Logger(ISSManagerBrowserWorker.name);
  private client: ISSManagerBrowserClient;

  constructor(private config: BrowserWorkerConfig) {
    this.client = new ISSManagerBrowserClient({
      baseUrl: config.baseUrl,
      username: config.username,
      password: config.password,
      headless: config.headless,
      timeout: config.timeout,
      downloadDir: config.downloadDir,
      screenshotDir: config.screenshotDir,
    });
  }

  /**
   * Execute full browser automation workflow
   */
  async run(): Promise<BrowserRunResult> {
    const startTime = Date.now();
    const timestamp = new Date();

    this.logger.log('Starting ISS Manager browser automation workflow...');

    let loginResult: LoginResult = {
      success: false,
      message: 'Not attempted',
    };

    let exportResult: ExportResult | undefined;

    let importResult:
      | {
          batchId: string;
          totalRows: number;
          successRows: number;
          failedRows: number;
        }
      | undefined;

    try {
      // Step 1: Initialize browser
      this.logger.log('Step 1/5: Initializing browser...');
      await this.client.initialize();

      // Step 2: Login
      this.logger.log('Step 2/5: Logging in to ISS Manager...');
      loginResult = await this.client.login();

      if (!loginResult.success) {
        throw new Error(
          `Login failed: ${loginResult.error || loginResult.message}`
        );
      }

      this.logger.log(
        `Login successful. Landing URL: ${loginResult.landingUrl}`
      );

      // Step 3: Export customers
      this.logger.log('Step 3/5: Exporting customer data...');
      exportResult = await this.client.exportCustomers();

      if (!exportResult.success || !exportResult.filePath) {
        throw new Error(
          `Export failed: ${exportResult.error || exportResult.message}`
        );
      }

      this.logger.log(
        `Export successful. File: ${exportResult.fileName} (${exportResult.fileSize} bytes)`
      );

      // Step 4: Import to database via existing pipeline
      if (this.config.importProcessorCallback) {
        this.logger.log('Step 4/5: Importing to database...');

        const fileBuffer = fs.readFileSync(exportResult.filePath);
        const fileName = exportResult.fileName!;
        const fileSize = exportResult.fileSize!;
        const fileMimeType = this.detectMimeType(exportResult.format!);

        importResult = await this.config.importProcessorCallback(
          fileBuffer,
          fileName,
          fileSize,
          fileMimeType,
          this.config.systemUserId
        );

        this.logger.log(
          `Import complete. Batch: ${importResult.batchId}, Success: ${importResult.successRows}/${importResult.totalRows}`
        );
      } else {
        this.logger.warn('Step 4/5: Skipped (no import callback provided)');
      }

      // Step 5: Cleanup
      this.logger.log('Step 5/5: Cleaning up...');
      await this.cleanup(exportResult.filePath);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Browser automation workflow completed successfully in ${duration}ms`
      );

      return {
        success: true,
        loginResult,
        exportResult,
        importResult,
        duration,
        timestamp,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Browser automation workflow failed: ${errorMessage}`);

      // Cleanup on error
      if (exportResult?.filePath) {
        await this.cleanup(exportResult.filePath);
      }

      return {
        success: false,
        loginResult,
        exportResult,
        importResult,
        duration,
        timestamp,
        error: errorMessage,
      };
    } finally {
      // Always close browser
      await this.client.close();
    }
  }

  /**
   * Cleanup downloaded files and screenshots
   */
  private async cleanup(downloadPath?: string): Promise<void> {
    if (!this.config.cleanupAfterRun) {
      this.logger.log('Cleanup skipped (cleanupAfterRun=false)');
      return;
    }

    try {
      // Delete downloaded file
      if (downloadPath && fs.existsSync(downloadPath)) {
        fs.unlinkSync(downloadPath);
        this.logger.log(`Deleted download: ${downloadPath}`);
      }

      // Clean up old screenshots (keep last 10)
      const screenshotDir = this.config.screenshotDir;
      if (fs.existsSync(screenshotDir)) {
        const screenshots = fs
          .readdirSync(screenshotDir)
          .filter((f) => f.endsWith('.png'))
          .map((f) => ({
            name: f,
            path: path.join(screenshotDir, f),
            mtime: fs.statSync(path.join(screenshotDir, f)).mtime.getTime(),
          }))
          .sort((a, b) => b.mtime - a.mtime);

        // Keep last 10, delete rest
        const toDelete = screenshots.slice(10);
        for (const file of toDelete) {
          fs.unlinkSync(file.path);
          this.logger.log(`Deleted old screenshot: ${file.name}`);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Cleanup warning: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Detect MIME type from file format
   */
  private detectMimeType(format: 'csv' | 'xlsx' | 'xls'): string {
    const mimeTypes = {
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
    };
    return mimeTypes[format];
  }

  /**
   * Dry run (test login and export without importing)
   */
  async dryRun(): Promise<{
    loginSuccess: boolean;
    exportSuccess: boolean;
    loginResult: LoginResult;
    exportResult?: ExportResult;
    error?: string;
  }> {
    this.logger.log('Starting dry run (no import)...');

    try {
      await this.client.initialize();

      const loginResult = await this.client.login();
      if (!loginResult.success) {
        return {
          loginSuccess: false,
          exportSuccess: false,
          loginResult,
          error: loginResult.error,
        };
      }

      const exportResult = await this.client.exportCustomers();
      await this.client.close();

      return {
        loginSuccess: loginResult.success,
        exportSuccess: exportResult.success,
        loginResult,
        exportResult,
        error: exportResult.error,
      };
    } catch (error) {
      await this.client.close();
      return {
        loginSuccess: false,
        exportSuccess: false,
        loginResult: { success: false, message: 'Exception during dry run' },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
