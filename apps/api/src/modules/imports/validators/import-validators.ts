/**
 * Import Validation Rules
 * Source-agnostic validation for CSV/Excel imports
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  value: unknown;
  rule: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  value: unknown;
  message: string;
}

export interface ImportFieldMapping {
  sourceColumn: string;
  targetField: string;
  required: boolean;
  transformer?: (value: unknown) => unknown;
  validator?: (value: unknown) => ValidationResult;
}

/**
 * Customer Import Validation Rules
 */
export class CustomerImportValidator {
  static readonly REQUIRED_FIELDS = ['externalId', 'name'];
  static readonly OPTIONAL_FIELDS = ['email', 'phone', 'address'];

  static validate(row: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field validation
    for (const field of this.REQUIRED_FIELDS) {
      if (!row[field] || String(row[field]).trim() === '') {
        errors.push({
          field,
          value: row[field],
          rule: 'required',
          message: `Field '${field}' is required`,
        });
      }
    }

    // External ID validation
    if (row.externalId && String(row.externalId).length > 255) {
      errors.push({
        field: 'externalId',
        value: row.externalId,
        rule: 'max_length',
        message: 'External ID must be 255 characters or less',
      });
    }

    // Email validation
    if (row.email && !this.isValidEmail(String(row.email))) {
      warnings.push({
        field: 'email',
        value: row.email,
        message: 'Email format appears invalid',
      });
    }

    // Phone validation
    if (row.phone && !this.isValidPhone(String(row.phone))) {
      warnings.push({
        field: 'phone',
        value: row.phone,
        message: 'Phone format appears invalid',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static isValidPhone(phone: string): boolean {
    // Turkish phone format or international format
    return /^[\d\s\-+()]{7,20}$/.test(phone);
  }

  /**
   * Extract neighborhood from address string
   * Pattern: "{Mahalle} Mah. ..." or "{Mahalle} MAH. ..."
   */
  static extractNeighborhood(address: string): string | null {
    if (!address) return null;

    const match = address.match(/^(.*?)\s*[Mm][Aa][Hh]\./);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract district and city from address
   * Heuristic: Last part after "/" is city, second-to-last is district
   */
  static extractLocation(address: string): {
    district: string | null;
    city: string | null;
  } {
    if (!address) return { district: null, city: null };

    const parts = address.split('/').map((p) => p.trim());

    if (parts.length >= 2) {
      return {
        city: parts[parts.length - 1] || null,
        district: parts[parts.length - 2] || null,
      };
    }

    return { district: null, city: null };
  }
}

/**
 * Personnel Import Validation Rules
 */
export class PersonnelImportValidator {
  static readonly REQUIRED_FIELDS = ['externalId', 'name'];
  static readonly OPTIONAL_FIELDS = [
    'email',
    'phone',
    'role',
    'performanceScore',
  ];

  static validate(row: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field validation
    for (const field of this.REQUIRED_FIELDS) {
      if (!row[field] || String(row[field]).trim() === '') {
        errors.push({
          field,
          value: row[field],
          rule: 'required',
          message: `Field '${field}' is required`,
        });
      }
    }

    // Performance score validation
    if (row.performanceScore !== null && row.performanceScore !== undefined) {
      const score = Number(row.performanceScore);
      if (isNaN(score) || score < 0 || score > 100) {
        errors.push({
          field: 'performanceScore',
          value: row.performanceScore,
          rule: 'range',
          message: 'Performance score must be between 0 and 100',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Finance Import Validation Rules
 */
export class FinanceImportValidator {
  static readonly REQUIRED_FIELDS = ['externalId', 'amount'];
  static readonly OPTIONAL_FIELDS = ['transactionType', 'currency', 'date'];

  static validate(row: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field validation
    for (const field of this.REQUIRED_FIELDS) {
      if (
        row[field] === null ||
        row[field] === undefined ||
        String(row[field]).trim() === ''
      ) {
        errors.push({
          field,
          value: row[field],
          rule: 'required',
          message: `Field '${field}' is required`,
        });
      }
    }

    // Amount validation
    if (row.amount !== null && row.amount !== undefined) {
      const amount = Number(row.amount);
      if (isNaN(amount)) {
        errors.push({
          field: 'amount',
          value: row.amount,
          rule: 'numeric',
          message: 'Amount must be a valid number',
        });
      }
    }

    // Currency validation
    if (row.currency && typeof row.currency === 'string') {
      const currency = row.currency.toUpperCase();
      if (currency.length !== 3) {
        warnings.push({
          field: 'currency',
          value: row.currency,
          message: 'Currency code should be 3 characters (ISO 4217)',
        });
      }
    }

    // Date validation
    if (row.date && !this.isValidDate(row.date)) {
      errors.push({
        field: 'date',
        value: row.date,
        rule: 'date_format',
        message: 'Date must be in valid format (ISO 8601 or YYYY-MM-DD)',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static isValidDate(value: unknown): boolean {
    if (!value) return false;
    const date = new Date(String(value));
    return !isNaN(date.getTime());
  }
}

/**
 * Duplicate Detection
 */
export class DuplicateDetector {
  /**
   * Detect duplicates within a batch
   */
  static findDuplicates(
    rows: Record<string, unknown>[],
    keyField: string
  ): { rowNumber: number; duplicateOf: number; value: unknown }[] {
    const seen = new Map<unknown, number>();
    const duplicates: {
      rowNumber: number;
      duplicateOf: number;
      value: unknown;
    }[] = [];

    rows.forEach((row, index) => {
      const key = row[keyField];
      if (key !== null && key !== undefined) {
        const firstOccurrence = seen.get(key);
        if (firstOccurrence !== undefined) {
          duplicates.push({
            rowNumber: index + 1,
            duplicateOf: firstOccurrence + 1,
            value: key,
          });
        } else {
          seen.set(key, index);
        }
      }
    });

    return duplicates;
  }

  /**
   * Check if external ID exists in database
   * (To be implemented with actual database check)
   */
  static async checkExisting(
    _entityType: string,
    _externalIds: string[]
  ): Promise<Map<string, boolean>> {
    // Placeholder - will be implemented with Prisma
    return new Map();
  }
}
