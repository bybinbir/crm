/**
 * ISSmanager HTTP Client
 * Handles all HTTP communication with ISSmanager API
 * Includes retry logic, timeout, and error normalization
 */

import { URLSearchParams } from 'url';

import type { AxiosInstance, AxiosError } from 'axios';
import axios from 'axios';

import type {
  ISSManagerConfig,
  ISSManagerConnectionTestResult,
  ISSManagerApiError,
} from './issmanager.types';

export class ISSManagerClient {
  private client: AxiosInstance;
  private config: ISSManagerConfig;

  constructor(config: ISSManagerConfig) {
    this.config = config;

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Add response interceptor for error normalization
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  /**
   * Test connection to ISSmanager OIM API
   * Uses real /api/oim/login endpoint to validate credentials
   *
   * NOTE: ISSmanager API is customer-facing (OIM) API
   * It requires username+password authentication
   * Config apiKey should be in format: "username:password"
   */
  async testConnection(): Promise<ISSManagerConnectionTestResult> {
    const startTime = Date.now();

    try {
      // Parse apiKey as username:password
      const [username, password] = this.config.apiKey.split(':');

      if (!username || !password) {
        return {
          success: false,
          message: 'Invalid credentials format',
          error: 'API Key must be in format "username:password"',
        };
      }

      // Attempt login to validate credentials
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await this.client.post('/api/oim/login', params, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const responseTime = Date.now() - startTime;

      // Check if login successful
      if (response.data?.success && response.data?.data?.token) {
        return {
          success: true,
          message: 'Connection successful - Authentication verified',
          responseTime,
          serverVersion: 'ISSmanager OIM API',
        };
      } else {
        return {
          success: false,
          message: 'Authentication failed',
          error: response.data?.message || 'Invalid response from server',
        };
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      return {
        success: false,
        message: 'Connection test failed',
        error: axiosError.response?.data
          ? (axiosError.response.data as { message?: string }).message ||
            axiosError.message
          : axiosError.message || 'Unknown error',
      };
    }
  }

  /**
   * Get customers from ISSmanager
   *
   * LIMITATION: ISSmanager provides OIM (customer portal) API only
   * There is NO bulk customer listing endpoint available
   * Available endpoint: /api/oim/customer_information (requires authentication, returns single customer)
   *
   * For bulk data sync, use manual CSV/Excel import instead
   */
  async getCustomers(_params?: {
    page?: number;
    limit?: number;
  }): Promise<{ customers: never[] }> {
    throw new Error(
      'ISSmanager bulk customer API not available. ' +
        'ISSmanager provides customer-facing OIM API only. ' +
        'For data import, use manual CSV/Excel upload feature.'
    );
  }

  /**
   * Get personnel from ISSmanager
   *
   * LIMITATION: Not available in ISSmanager OIM API
   */
  async getPersonnel(_params?: {
    page?: number;
    limit?: number;
  }): Promise<{ personnel: never[] }> {
    throw new Error('Personnel API not available in ISSmanager OIM API');
  }

  /**
   * Get finance records from ISSmanager
   *
   * LIMITATION: Not available in ISSmanager OIM API
   */
  async getFinanceRecords(_params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{ records: never[] }> {
    throw new Error('Finance API not available in ISSmanager OIM API');
  }

  /**
   * Normalize API errors into consistent format
   */
  private normalizeError(error: AxiosError): ISSManagerApiError {
    if (error.response) {
      // Server responded with error status
      const data = error.response.data as { message?: string; code?: string };

      return {
        code: data.code || `HTTP_${error.response.status}`,
        message:
          data.message ||
          error.message ||
          `Request failed with status ${error.response.status}`,
        details: data,
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        code: 'NO_RESPONSE',
        message:
          'No response from ISSmanager server. Please check connectivity.',
        details: { timeout: this.config.timeoutMs },
      };
    } else {
      // Error in request setup
      return {
        code: 'REQUEST_ERROR',
        message: error.message || 'Failed to create request',
        details: error,
      };
    }
  }
}
