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
  private tokenCache: string | null = null;
  private tokenExpiry: number | null = null;

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
   * Authenticate with ISSmanager OIM API and get token
   * Token is cached for 1 hour (assumed lifespan)
   *
   * @private
   */
  private async authenticate(): Promise<string> {
    // Check token cache
    if (this.tokenCache && this.tokenExpiry && this.tokenExpiry > Date.now()) {
      return this.tokenCache;
    }

    // Parse apiKey as username:password
    const [username, password] = this.config.apiKey.split(':');

    if (!username || !password) {
      throw new Error(
        'Invalid credentials format. Expected "username:password"'
      );
    }

    // POST /api/oim/login
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    const response = await this.client.post('/api/oim/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Validate response
    if (!response.data?.success || !response.data?.data?.token) {
      throw new Error(
        `Authentication failed: ${response.data?.message || 'Invalid response'}`
      );
    }

    // Cache token (1 hour TTL)
    this.tokenCache = response.data.data.token;
    this.tokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

    return this.tokenCache!; // Non-null assertion: token was just set above
  }

  /**
   * Execute authenticated request with automatic token refresh
   *
   * @private
   */
  private async executeWithAuth<T>(
    operation: (token: string) => Promise<T>
  ): Promise<T> {
    try {
      const token = await this.authenticate();
      return await operation(token);
    } catch (error) {
      // If 401, clear token cache and retry once
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.tokenCache = null;
        this.tokenExpiry = null;
        const token = await this.authenticate();
        return await operation(token);
      }
      throw error;
    }
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
   * IMPLEMENTATION NOTE:
   * ISSmanager OIM API provides /api/oim/customer_information which returns
   * the authenticated user's customer data only (single customer).
   *
   * There is NO bulk customer listing endpoint in the documented OIM API.
   * The /api/iss/api/list endpoint exists but uses different auth (undocumented).
   *
   * CURRENT APPROACH:
   * - Fetch single customer (authenticated user's data)
   * - Return as array with 1 customer for compatibility
   *
   * FUTURE SCALING:
   * - Contact Quart Bilişim for bulk export API
   * - Or implement manual CSV upload feature
   * - Or reverse-engineer /api/iss/api/list endpoint
   */
  async getCustomers(_params?: { page?: number; limit?: number }): Promise<{
    customers: Array<{
      id: string;
      externalId: string;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      billingAddress: string | null;
      plan: string | null;
      planPrice: number | null;
      serviceEndDate: string | null;
      balance: number | null;
      isPrepaid: boolean;
      metadata: Record<string, unknown>;
    }>;
  }> {
    return this.executeWithAuth(async (token) => {
      // GET /api/oim/customer_information
      const response = await this.client.get('/api/oim/customer_information', {
        headers: {
          'X-HTTP-Authorization': token,
        },
      });

      // Validate response
      if (!response.data?.success) {
        throw new Error(
          `Failed to fetch customer: ${response.data?.message || 'Unknown error'}`
        );
      }

      const customerData = response.data.data?.customer;

      if (!customerData) {
        return { customers: [] };
      }

      // Map ISS Manager customer data to our format
      // Based on official ISSmanager OIM API documentation
      const customer = {
        id: customerData.abone_no || 'UNKNOWN', // Service expects 'id' field
        externalId: customerData.abone_no || 'UNKNOWN',
        name: customerData.isim || 'Unknown Customer',
        email: customerData.email || null,
        phone: customerData.telefon || null,
        address: customerData.adres || null,
        billingAddress: customerData.fatura_adres || customerData.adres || null,
        plan: customerData.tarife || null,
        planPrice: customerData.tarife_fiyat
          ? parseFloat(customerData.tarife_fiyat)
          : null,
        serviceEndDate: customerData.bitis_tarihi || null,
        balance: customerData.bakiye ? parseFloat(customerData.bakiye) : null,
        isPrepaid: customerData.on_odemeli || false,
        metadata: {
          pppoeUsername: customerData.pppoe_k_adi,
          pppoePassword: customerData.pppoe_parola, // Note: Sensitive, consider excluding in production
          oimUsername: customerData.oim_k_adi,
          planType: customerData.tarife_tur,
          staticIpFee: customerData.sabit_ip_ucreti,
          activationFee: customerData.aktivasyon_ucreti,
          commitmentEnd: customerData.taahhut_bitis,
          kdv: customerData.kdv,
          oiv: customerData.oiv,
          invoices: customerData.faturalar || [],
          tickets: customerData.ariza_kayitlari || [],
          trafficData: customerData.trafik_data || [],
          otherSubscriptions: customerData.diger_abonelikler || [],
          maxPackageExtension: customerData.max_paket_uzat_oim,
          unpaidPermission: customerData.odenmemis_izin,
          gihProfile: customerData.gih_profil,
          gihProfiles: customerData.gih_profiller,
          gihHistory: customerData.gih_son_islemler || [],
          unpaidCount: customerData.veresiye_sayisi,
        },
      };

      return { customers: [customer] };
    });
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
