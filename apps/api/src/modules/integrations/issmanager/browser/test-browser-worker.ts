/**
 * Test Script for ISS Manager Browser Worker
 * Task 079 - Manual test runner for browser automation
 *
 * Usage:
 *   tsx apps/api/src/modules/integrations/issmanager/browser/test-browser-worker.ts
 */

import * as path from 'path';
import { ISSManagerBrowserWorker } from './issmanager.browser.worker';

async function main() {
  console.log('=== ISS Manager Browser Worker Test ===\n');

  // Configuration
  const config = {
    baseUrl: 'http://192.168.106.118',
    username: 'admin',
    password: 'bariss',
    headless: false, // Headful for debugging
    timeout: 30000,
    downloadDir: path.join(process.cwd(), 'temp', 'issmanager-downloads'),
    screenshotDir: path.join(process.cwd(), 'temp', 'issmanager-screenshots'),
    systemUserId: 'system_task079',
    cleanupAfterRun: false, // Keep files for inspection
  };

  const worker = new ISSManagerBrowserWorker(config);

  try {
    console.log('Starting dry run (login + export, no import)...\n');

    const result = await worker.dryRun();

    console.log('\n=== Dry Run Results ===');
    console.log(`Login Success: ${result.loginSuccess}`);
    console.log(`Export Success: ${result.exportSuccess}`);

    if (result.loginResult.landingUrl) {
      console.log(`Landing URL: ${result.loginResult.landingUrl}`);
    }

    if (result.loginResult.screenshot) {
      console.log(`Login Screenshot: ${result.loginResult.screenshot}`);
    }

    if (result.exportResult) {
      console.log(`Export File: ${result.exportResult.filePath}`);
      console.log(`Export Size: ${result.exportResult.fileSize} bytes`);
      console.log(`Export Format: ${result.exportResult.format}`);

      if (result.exportResult.screenshot) {
        console.log(`Export Screenshot: ${result.exportResult.screenshot}`);
      }
    }

    if (result.error) {
      console.error(`Error: ${result.error}`);
    }

    console.log('\n=== Test Complete ===');
    process.exit(result.loginSuccess && result.exportSuccess ? 0 : 1);
  } catch (error) {
    console.error('\n=== Test Failed ===');
    console.error(error);
    process.exit(1);
  }
}

main();
