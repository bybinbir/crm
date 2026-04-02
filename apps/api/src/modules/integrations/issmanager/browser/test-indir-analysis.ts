/**
 * Task 081 - İndir Button Analysis and Direct Download Test
 * Analyze button structure and attempt direct HTTP download if href available
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';
import axios from 'axios';

async function main() {
  console.log('\n=== Task 081: İndir Button Analysis ===\n');

  const config = {
    baseUrl: 'http://192.168.106.118',
    username: 'admin',
    password: 'bariss',
    downloadDir: path.join(process.cwd(), 'temp', 'issmanager-downloads'),
    screenshotDir: path.join(process.cwd(), 'temp', 'issmanager-screenshots'),
  };

  // Ensure directories exist
  [
    config.downloadDir,
    config.screenshotDir,
    path.join(config.screenshotDir, 'logs'),
  ].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    // Login
    console.log('Logging in...');
    await page.goto(`${config.baseUrl}/login`);
    await page.fill('input[name="email"]', config.username);
    await page.fill('input[name="password"]', config.password);
    await Promise.all([
      page.waitForNavigation(),
      page.click('button[type="submit"]'),
    ]);
    console.log('✓ Login successful\n');

    // Navigate to customer list
    console.log('Navigating to customer list...');
    await page.click('a:has-text("Müşteriler")');
    await page.waitForLoadState('networkidle');

    // Navigate to Excel export page
    console.log('Navigating to Excel export page...');
    await page.click('button:has-text("Export"), button:has-text("Excel")');
    await page.waitForTimeout(1000);

    const excelLink = await page.locator('a:has-text("Excel")').first();
    const excelHref = await excelLink.getAttribute('href');
    console.log(`Excel export URL: ${excelHref}`);

    await page.goto(excelHref!, { waitUntil: 'networkidle' });
    console.log('✓ On export page\n');

    // Click Excel Oluştur to trigger file generation
    console.log('Clicking Excel Oluştur...');
    const createButton = await page
      .locator('button:has-text("Excel Oluştur"), a:has-text("Excel Oluştur")')
      .first();
    await createButton.click({ noWaitAfter: true });

    // Wait for navigation/redirect (302 will happen)
    await page.waitForLoadState('networkidle').catch(() => null);
    await page.waitForTimeout(2000);
    console.log(`Current URL: ${page.url()}`);

    // Poll for İndir buttons
    console.log('\nPolling for İndir buttons...');
    let indirButtons = [];
    for (let i = 0; i < 30; i++) {
      indirButtons = await page
        .locator('a:has-text("İndir"), button:has-text("İndir")')
        .all();

      if (indirButtons.length > 0) {
        console.log(
          `✓ Found ${indirButtons.length} İndir buttons after ${i * 2}s\n`
        );
        break;
      }

      // Reload and check again
      await page.waitForTimeout(2000);
      try {
        await page.reload({ waitUntil: 'networkidle', timeout: 10000 });
      } catch {
        // Ignore reload errors, page might be navigating
        await page.waitForLoadState('load').catch(() => null);
      }
    }

    if (indirButtons.length === 0) {
      throw new Error('No İndir buttons found after polling');
    }

    // Analyze each button
    console.log('=== Button Analysis ===\n');
    const buttonAnalyses = [];

    for (let i = 0; i < indirButtons.length; i++) {
      const button = indirButtons[i];

      const analysis = {
        index: i,
        tagName: await button.evaluate((el) => el.tagName),
        innerText: await button.innerText(),
        href: await button.getAttribute('href'),
        onclick: await button.getAttribute('onclick'),
        outerHTML: await button.evaluate((el) =>
          el.outerHTML.substring(0, 200)
        ),
      };

      buttonAnalyses.push(analysis);

      console.log(`Button ${i}:`);
      console.log(`  Tag: <${analysis.tagName}>`);
      console.log(`  Text: "${analysis.innerText.trim()}"`);
      console.log(`  href: ${analysis.href}`);
      console.log(`  onclick: ${analysis.onclick}`);
      console.log(`  HTML: ${analysis.outerHTML}...\n`);
    }

    // Save analysis
    const analysisFile = path.join(
      config.screenshotDir,
      'logs',
      `indir-button-analysis-${Date.now()}.json`
    );
    fs.writeFileSync(analysisFile, JSON.stringify(buttonAnalyses, null, 2));
    console.log(`✓ Analysis saved: ${analysisFile}\n`);

    // Find first REAL Excel download button (text exactly "İndir" and has base64-looking href)
    const excelButton = buttonAnalyses.find(
      (b) =>
        b.innerText.trim() === 'İndir' &&
        b.href &&
        b.href.includes('/loglar/abone_excel_raporu/indir/')
    );

    if (!excelButton) {
      throw new Error('Could not find real Excel download button');
    }

    console.log(`✓ Found real Excel button at index ${excelButton.index}\n`);

    // Try direct HTTP download if href exists
    const firstButton = excelButton;
    if (firstButton.href) {
      console.log('=== Attempting Authenticated HTTP Download ===\n');

      // Get cookies for authenticated request
      const cookies = await context.cookies();
      const cookieHeader = cookies
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');

      const downloadUrl = firstButton.href.startsWith('http')
        ? firstButton.href
        : `${config.baseUrl}${firstButton.href}`;

      console.log(`Download URL: ${downloadUrl}`);
      console.log(`Cookie header: ${cookieHeader.substring(0, 100)}...`);

      try {
        const response = await axios.get(downloadUrl, {
          headers: {
            Cookie: cookieHeader,
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          responseType: 'arraybuffer',
          maxRedirects: 5,
        });

        console.log(`\n✓ HTTP ${response.status} ${response.statusText}`);
        console.log(`  Content-Type: ${response.headers['content-type']}`);
        console.log(
          `  Content-Disposition: ${response.headers['content-disposition']}`
        );
        console.log(`  Content-Length: ${response.data.byteLength} bytes`);

        // Extract filename
        const contentDisposition = response.headers['content-disposition'];
        let filename = 'export.xlsx';
        if (contentDisposition) {
          const match = contentDisposition.match(
            /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
          );
          if (match) {
            filename = match[1].replace(/['"]/g, '');
          }
        }

        // Save file
        const filePath = path.join(config.downloadDir, filename);
        fs.writeFileSync(filePath, Buffer.from(response.data));

        console.log(`\n✓ File downloaded successfully!`);
        console.log(`  Path: ${filePath}`);
        console.log(`  Size: ${fs.statSync(filePath).size} bytes`);

        // Verify it's a valid file (check magic bytes for ZIP/Excel)
        const fileBuffer = fs.readFileSync(filePath);
        const magicBytes = fileBuffer.toString('hex', 0, 4);
        console.log(`  Magic bytes: ${magicBytes.toUpperCase()}`);

        if (magicBytes === '504b0304') {
          console.log(`  ✓ Valid ZIP/XLSX file (PK\\x03\\x04 signature)`);
        } else if (magicBytes.substring(0, 4) === 'd0cf') {
          console.log(`  ✓ Valid XLS file (OLE signature)`);
        } else {
          console.log(`  ⚠ Unknown file type`);
        }

        console.log('\n=== RESULT: SUCCESS ===');
        console.log('İndir button uses direct href link');
        console.log('Authenticated HTTP download working perfectly!');
      } catch (error: any) {
        console.error(`\n✗ HTTP download failed: ${error.message}`);
        if (error.response) {
          console.error(`  Status: ${error.response.status}`);
          console.error(
            `  Headers: ${JSON.stringify(error.response.headers, null, 2)}`
          );
        }
      }
    } else {
      console.log(
        '⚠ First button has no href - JavaScript-based download mechanism'
      );
      console.log('Will need to capture download event or intercept fetch/XHR');
    }
  } catch (error) {
    console.error('\n✗ Error:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
