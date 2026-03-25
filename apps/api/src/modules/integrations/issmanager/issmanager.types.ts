/**
 * ISSmanager Integration Types
 * These types are based on assumed ISSmanager API structure
 * Will be refined as actual API documentation becomes available
 */

export interface ISSManagerConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
}

export interface ISSManagerConnectionTestResult {
  success: boolean;
  message: string;
  responseTime?: number;
  serverVersion?: string;
  error?: string;
}

export interface ISSManagerCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  neighborhood?: string;
  district?: string;
  city?: string;
  // Additional fields will be captured in raw data
  [key: string]: unknown;
}

export interface ISSManagerPersonnel {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  // Additional fields will be captured in raw data
  [key: string]: unknown;
}

export interface ISSManagerFinance {
  id: string;
  transactionType?: string;
  amount?: number;
  currency?: string;
  date?: string;
  // Additional fields will be captured in raw data
  [key: string]: unknown;
}

export interface ISSManagerApiError {
  code: string;
  message: string;
  details?: unknown;
}
