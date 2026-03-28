/**
 * ISSManager Export Adapter
 * Maps ISSManager export CSV/Excel fields to CustomerSnapshot model
 *
 * Context: ISSManager API is customer self-service only (no admin/bulk endpoints).
 * This adapter handles manual exports from ISSManager admin panel.
 */

export interface ISSManagerExportRow {
  abone_no?: string;
  isim?: string;
  email?: string;
  telefon?: string;
  adres?: string;
  fatura_adres?: string;
  tarife?: string;
  tarife_fiyat?: string;
  bitis_tarihi?: string;
  bakiye?: string;
  [key: string]: unknown;
}

export interface NormalizedCustomerData {
  externalId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  billingAddress?: string;
  plan?: string;
  planPrice?: string;
  expiryDate?: string;
  balance?: string;
  neighborhoodName?: string;
  district?: string;
  city?: string;
}

export class ISSManagerExportAdapter {
  /**
   * Map ISSManager export row to normalized customer data
   */
  static mapCustomer(row: ISSManagerExportRow): NormalizedCustomerData {
    const normalizedData: NormalizedCustomerData = {
      externalId: this.extractExternalId(row),
      name: this.extractName(row),
    };

    // Optional fields
    if (row.email) normalizedData.email = String(row.email);
    if (row.telefon) normalizedData.phone = String(row.telefon);
    if (row.adres) normalizedData.address = String(row.adres);
    if (row.fatura_adres)
      normalizedData.billingAddress = String(row.fatura_adres);
    if (row.tarife) normalizedData.plan = String(row.tarife);
    if (row.tarife_fiyat) normalizedData.planPrice = String(row.tarife_fiyat);
    if (row.bitis_tarihi) normalizedData.expiryDate = String(row.bitis_tarihi);
    if (row.bakiye) normalizedData.balance = String(row.bakiye);

    // Parse address for neighborhood data
    const addressParts = this.parseAddress(row.adres);
    if (addressParts) {
      normalizedData.neighborhoodName = addressParts.neighborhood;
      normalizedData.district = addressParts.district;
      normalizedData.city = addressParts.city;
    }

    return normalizedData;
  }

  /**
   * Extract customer external ID (subscriber number)
   */
  private static extractExternalId(row: ISSManagerExportRow): string {
    const id = row.abone_no || row['Abone No'] || row['ID'];
    if (!id) {
      throw new Error('Missing required field: abone_no (subscriber number)');
    }
    return String(id).trim();
  }

  /**
   * Extract customer name
   */
  private static extractName(row: ISSManagerExportRow): string {
    const name = row.isim || row['İsim'] || row['Name'] || row['Ad Soyad'];
    if (!name) {
      throw new Error('Missing required field: isim (customer name)');
    }
    return String(name).trim();
  }

  /**
   * Parse ISSManager address format into neighborhood components
   * Example: "Güzeloba Mah. Lara Cd. No:7/7 Muratpaşa/Antalya"
   */
  private static parseAddress(address?: string): {
    neighborhood?: string;
    district?: string;
    city?: string;
  } | null {
    if (!address) return null;

    const addressStr = String(address);

    // Extract neighborhood (Mah./Mahallesi)
    const neighborhoodMatch = addressStr.match(/([^\s]+)\s+(Mah\.|Mahallesi)/i);
    const neighborhood = neighborhoodMatch ? neighborhoodMatch[1] : undefined;

    // Extract district and city (format: "District/City")
    const locationMatch = addressStr.match(/([^/]+)\/([^\s]+)$/);
    const district = locationMatch ? locationMatch[1].trim() : undefined;
    const city = locationMatch ? locationMatch[2].trim() : undefined;

    return {
      neighborhood,
      district,
      city,
    };
  }

  /**
   * Validate export file headers
   */
  static validateHeaders(headers: string[]): {
    valid: boolean;
    missing: string[];
  } {
    const requiredHeaders = ['abone_no', 'isim'];

    // Normalize headers for case-insensitive check
    const normalizedHeaders = headers.map((h) => h.toLowerCase());

    const missing = requiredHeaders.filter(
      (required) => !normalizedHeaders.includes(required.toLowerCase())
    );

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Get field mapping documentation
   */
  static getFieldMapping(): Record<string, string> {
    return {
      abone_no: 'External ID (subscriber number)',
      isim: 'Customer name',
      email: 'Email address',
      telefon: 'Phone number',
      adres: 'Full address (parsed for neighborhood)',
      fatura_adres: 'Billing address',
      tarife: 'Plan/package name',
      tarife_fiyat: 'Plan price',
      bitis_tarihi: 'Subscription expiry date',
      bakiye: 'Account balance',
    };
  }
}
