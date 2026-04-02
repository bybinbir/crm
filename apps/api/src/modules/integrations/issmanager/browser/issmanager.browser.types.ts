/**
 * ISS Manager Browser Automation Types
 * Task 079 - Live browser bot implementation
 */

export interface BrowserConfig {
  baseUrl: string;
  username: string;
  password: string;
  headless: boolean;
  timeout: number;
  downloadDir: string;
  screenshotDir: string;
}

export interface LoginResult {
  success: boolean;
  message: string;
  sessionCookies?: any[];
  landingUrl?: string;
  screenshot?: string;
  error?: string;
}

export interface ExportResult {
  success: boolean;
  message: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  format?: 'csv' | 'xlsx' | 'xls';
  screenshot?: string;
  error?: string;
}

export interface BrowserRunResult {
  success: boolean;
  loginResult: LoginResult;
  exportResult?: ExportResult;
  importResult?: {
    batchId: string;
    totalRows: number;
    successRows: number;
    failedRows: number;
  };
  duration: number;
  timestamp: Date;
  error?: string;
}

export interface BrowserAutomationConfig {
  enabled: boolean;
  schedule?: string; // cron expression
  retryAttempts: number;
  retryDelay: number;
  artifactRetentionDays: number;
}
