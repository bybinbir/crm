// Domain: Auth
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  ANALYST = 'ANALYST',
  VIEWER = 'VIEWER',
}

// Domain: Integrations
export interface IntegrationConfig {
  id: string;
  name: string;
  type: IntegrationType;
  enabled: boolean;
  settings: Record<string, unknown>;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum IntegrationType {
  ISSMANAGER = 'ISSMANAGER',
}

// Domain: Neighborhoods
export interface Neighborhood {
  id: string;
  name: string;
  code: string;
  city: string;
  district: string;
  qualityScore?: number;
  metadata?: Record<string, unknown>;
}

// Domain: Customers
export interface Customer {
  id: string;
  externalId: string;
  name: string;
  email?: string;
  phone?: string;
  neighborhoodId: string;
  status: CustomerStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

// Domain: Personnel
export interface Personnel {
  id: string;
  externalId: string;
  name: string;
  email?: string;
  department: string;
  position: string;
  performanceScore?: number;
  metadata?: Record<string, unknown>;
}

// Domain: Analytics
export interface AnalyticsMetric {
  id: string;
  metricType: MetricType;
  value: number;
  dimension?: Record<string, string>;
  timestamp: Date;
}

export enum MetricType {
  CUSTOMER_QUALITY_SCORE = 'CUSTOMER_QUALITY_SCORE',
  PERSONNEL_PERFORMANCE_SCORE = 'PERSONNEL_PERFORMANCE_SCORE',
  REVENUE = 'REVENUE',
  COST = 'COST',
}

// Domain: Reporting
export interface Report {
  id: string;
  title: string;
  type: ReportType;
  generatedAt: Date;
  generatedBy: string;
  parameters: Record<string, unknown>;
  data: unknown;
}

export enum ReportType {
  NEIGHBORHOOD_QUALITY = 'NEIGHBORHOOD_QUALITY',
  PERSONNEL_PERFORMANCE = 'PERSONNEL_PERFORMANCE',
  CUSTOMER_INSIGHTS = 'CUSTOMER_INSIGHTS',
  FINANCIAL_SUMMARY = 'FINANCIAL_SUMMARY',
  EXECUTIVE_DASHBOARD = 'EXECUTIVE_DASHBOARD',
}

// Common Types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
