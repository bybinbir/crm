/**
 * CSV/Excel Parser Utility
 * Handles parsing of CSV and Excel files for import
 */

import { parse } from 'csv-parse/sync';

import type { ImportPreviewDto } from '../dto/import.dto';

export interface ParseOptions {
  delimiter?: string;
  encoding?: 'utf8' | 'utf-8' | 'ascii' | 'latin1' | 'base64' | 'hex';
  skipEmptyLines?: boolean;
  trim?: boolean;
  maxRows?: number;
}

export interface ParseResult {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  skippedRows: number;
  warnings: string[];
}

export class CsvParser {
  /**
   * Parse CSV file buffer
   */
  static parse(buffer: Buffer, options: ParseOptions = {}): ParseResult {
    const {
      delimiter = ',',
      encoding = 'utf-8',
      skipEmptyLines = true,
      trim = true,
      maxRows,
    } = options;

    const warnings: string[] = [];
    let content: string;

    try {
      content = buffer.toString(encoding);
    } catch {
      // Try alternative encodings
      try {
        content = buffer.toString('latin1');
        warnings.push('File encoding detected as Latin-1 (ISO-8859-1)');
      } catch {
        content = buffer.toString('utf-8');
        warnings.push('File encoding detection failed, using UTF-8');
      }
    }

    const records = parse(content, {
      delimiter,
      skip_empty_lines: skipEmptyLines,
      trim,
      columns: true, // Parse headers
      relax_column_count: true, // Allow inconsistent column counts
      relax_quotes: true, // Be lenient with quotes
    }) as Record<string, unknown>[];

    const headers = records.length > 0 ? Object.keys(records[0]) : [];
    const totalRows = records.length;
    const rows = maxRows ? records.slice(0, maxRows) : records;
    const skippedRows = maxRows ? Math.max(0, totalRows - maxRows) : 0;

    if (headers.length === 0) {
      warnings.push('No headers detected in CSV file');
    }

    if (headers.some((h) => !h || h.trim() === '')) {
      warnings.push('Some column headers are empty or invalid');
    }

    return {
      headers,
      rows,
      totalRows,
      skippedRows,
      warnings,
    };
  }

  /**
   * Preview CSV file (first N rows)
   */
  static preview(buffer: Buffer, maxRows = 10): ImportPreviewDto {
    const result = this.parse(buffer, { maxRows });

    return {
      headers: result.headers,
      rows: result.rows,
      totalRows: result.totalRows,
      detectedEncoding: 'utf-8', // Simplified, can enhance detection
      warnings: result.warnings,
    };
  }

  /**
   * Validate CSV structure
   */
  static validateStructure(
    buffer: Buffer,
    requiredHeaders: string[]
  ): {
    isValid: boolean;
    missingHeaders: string[];
    extraHeaders: string[];
    warnings: string[];
  } {
    const result = this.parse(buffer, { maxRows: 1 });
    const headers = result.headers.map((h) => h.trim().toLowerCase());
    const required = requiredHeaders.map((h) => h.toLowerCase());

    const missingHeaders = required.filter((h) => !headers.includes(h));
    const extraHeaders = headers.filter((h) => !required.includes(h));

    return {
      isValid: missingHeaders.length === 0,
      missingHeaders,
      extraHeaders,
      warnings: result.warnings,
    };
  }

  /**
   * Map CSV headers to internal field names
   */
  static mapHeaders(
    csvHeaders: string[],
    mapping: Record<string, string>
  ): Record<string, string> {
    const result: Record<string, string> = {};

    csvHeaders.forEach((csvHeader) => {
      const normalized = csvHeader.trim().toLowerCase();
      const targetField = mapping[normalized];
      if (targetField) {
        result[csvHeader] = targetField;
      }
    });

    return result;
  }

  /**
   * Common CSV header variations for customer data
   */
  static readonly CUSTOMER_HEADER_MAPPINGS: Record<string, string> = {
    // External ID variations
    'external id': 'externalId',
    external_id: 'externalId',
    'customer id': 'externalId',
    customer_id: 'externalId',
    abone_no: 'externalId',
    'abone no': 'externalId',
    'subscriber number': 'externalId',
    id: 'externalId',

    // Name variations
    name: 'name',
    'full name': 'name',
    full_name: 'name',
    'customer name': 'name',
    isim: 'name',

    // Email variations
    email: 'email',
    'e-mail': 'email',
    e_mail: 'email',
    'email address': 'email',

    // Phone variations
    phone: 'phone',
    telephone: 'phone',
    telefon: 'phone',
    'phone number': 'phone',
    mobile: 'phone',
    cep: 'phone',

    // Address variations
    address: 'address',
    'full address': 'address',
    adres: 'address',
    location: 'address',

    // Neighborhood variations
    neighborhood: 'neighborhood',
    mahalle: 'neighborhood',
    mah: 'neighborhood',

    // District variations
    district: 'district',
    ilce: 'district',
    ilçe: 'district',

    // City variations
    city: 'city',
    il: 'city',
    province: 'city',
  };

  /**
   * Common CSV header variations for personnel data
   */
  static readonly PERSONNEL_HEADER_MAPPINGS: Record<string, string> = {
    'external id': 'externalId',
    external_id: 'externalId',
    'employee id': 'externalId',
    employee_id: 'externalId',
    'personnel id': 'externalId',
    'staff id': 'externalId',
    id: 'externalId',

    name: 'name',
    'full name': 'name',
    'employee name': 'name',
    isim: 'name',

    email: 'email',
    'e-mail': 'email',

    phone: 'phone',
    telephone: 'phone',
    telefon: 'phone',

    role: 'role',
    position: 'role',
    title: 'role',
    gorev: 'role',

    'performance score': 'performanceScore',
    performance_score: 'performanceScore',
    score: 'performanceScore',
    rating: 'performanceScore',
  };

  /**
   * Common CSV header variations for finance data
   */
  static readonly FINANCE_HEADER_MAPPINGS: Record<string, string> = {
    'external id': 'externalId',
    external_id: 'externalId',
    'transaction id': 'externalId',
    transaction_id: 'externalId',
    'invoice number': 'externalId',
    fatura_no: 'externalId',
    id: 'externalId',

    'transaction type': 'transactionType',
    transaction_type: 'transactionType',
    type: 'transactionType',
    islem_tipi: 'transactionType',

    amount: 'amount',
    total: 'amount',
    tutar: 'amount',
    price: 'amount',
    fiyat: 'amount',

    currency: 'currency',
    para_birimi: 'currency',

    date: 'date',
    'transaction date': 'date',
    tarih: 'date',
    issue_date: 'date',
  };
}
