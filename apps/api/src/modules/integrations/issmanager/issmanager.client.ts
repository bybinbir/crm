/**
 * ISSmanager HTTP Client
 * Handles all HTTP communication with ISSmanager API
 * Includes retry logic, timeout, and error normalization
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
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
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    // Add response interceptor for error normalization
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.normalizeError(error));
      },
    );
  }

  /**
   * Test connection to ISSmanager
   * Strategy: Try a lightweight endpoint (health check or version)
   * If no health endpoint exists, try to list a small resource
   */
  async testConnection(): Promise<ISSManagerConnectionTestResult> {
    const startTime = Date.now();

    try {
      // Try common health check endpoints
      // Note: Actual endpoint will depend on ISSmanager API documentation
      // For now, we try common patterns
      const healthEndpoints = [
        '/api/health',
        '/api/v1/health',
        '/health',
        '/api/ping',
        '/ping',
        '/api/version',
        '/version',
      ];

      let lastError: Error | null = null;

      for (const endpoint of healthEndpoints) {
        try {
          const response = await this.client.get(endpoint, {
            timeout: 5000, // Shorter timeout for connection test
          });

          const responseTime = Date.now() - startTime;

          return {
            success: true,
            message: 'Connection successful',
            responseTime,
            serverVersion: response.data?.version || 'unknown',
          };
        } catch (error) {
          lastError = error as Error;
          // Continue to next endpoint
        }
      }

      // If all health endpoints failed, return the last error
      return {
        success: false,
        message: 'Connection failed',
        error:
          lastError?.message ||
          'Unable to connect to ISSmanager API. Please verify the base URL and API key.',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get customers from ISSmanager
   * This is a placeholder - actual implementation depends on API docs
   */
  async getCustomers(params?: {
    page?: number;
    limit?: number;
  }): Promise<unknown> {
    const response = await this.client.get('/api/customers', {
      params,
    });

    return response.data;
  }

  /**
   * Get personnel from ISSmanager
   * This is a placeholder - actual implementation depends on API docs
   */
  async getPersonnel(params?: {
    page?: number;
    limit?: number;
  }): Promise<unknown> {
    const response = await this.client.get('/api/personnel', {
      params,
    });

    return response.data;
  }

  /**
   * Get finance records from ISSmanager
   * This is a placeholder - actual implementation depends on API docs
   */
  async getFinanceRecords(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<unknown> {
    const response = await this.client.get('/api/finance', {
      params,
    });

    return response.data;
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
        message: 'No response from ISSmanager server. Please check connectivity.',
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
