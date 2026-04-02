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
  sessionCookies?: Array<{ name: string; value: string; domain: string }>;
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

/**
 * Task 081 - Download mechanism analysis types
 */
export interface ButtonAnalysis {
  index: number;
  tagName: string;
  outerHTML: string;
  innerText: string;
  href: string | null;
  onclick: string | null;
  dataAttributes: Record<string, string>;
  parentRowHTML: string;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  nearestFormAction: string | null;
  nearestFormMethod: string | null;
  nearestFormTarget: string | null;
}

export interface NetworkInterception {
  type: 'fetch' | 'xhr' | 'window.open' | 'createObjectURL' | 'form.submit';
  timestamp: number;
  url: string;
  method?: string;
  status?: number;
  contentType?: string;
  contentDisposition?: string;
  responseSize?: number;
  callStack?: string;
}

export interface DownloadAttempt {
  strategy:
    | 'locator.click'
    | 'elementHandle.click'
    | 'dispatchEvent'
    | 'evaluate.click'
    | 'form.submit'
    | 'authenticated.http';
  timestamp: number;
  success: boolean;
  networkActivity: NetworkInterception[];
  downloadEventTriggered: boolean;
  filePath?: string;
  fileSize?: number;
  error?: string;
}
