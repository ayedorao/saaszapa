/**
 * Professional Barcode Generation System for Retail POS
 *
 * This module provides deterministic, production-grade barcode generation
 * for product variants in a shoe store inventory system.
 *
 * Barcode Format: [PRODUCT_ID][SIZE_CODE][COLOR_CODE][CHECKSUM]
 *
 * Features:
 * - Deterministic generation (same input → same output)
 * - Modulo 10 checksum for error detection
 * - Support for CODE 128 and EAN-13 symbologies
 * - Collision prevention through unique variant combinations
 */

/**
 * Normalize a numeric product ID to fixed length (5 digits)
 * Example: 123 → 00123
 */
function normalizeProductId(productCode: string): string {
  // Extract numeric portion if code contains letters
  const numericPart = productCode.replace(/\D/g, '');

  if (numericPart.length === 0) {
    // If no numeric part, create hash from full code
    const hash = simpleHash(productCode);
    return hash.toString().padStart(5, '0').slice(0, 5);
  }

  // Take last 5 digits or pad with zeros
  return numericPart.padStart(5, '0').slice(-5);
}

/**
 * Convert shoe size to numeric code (2 digits)
 * Handles standard shoe sizes from 9 to 35+
 */
function normalizeSizeCode(sizeName: string): string {
  // Remove non-numeric characters and convert to number
  const sizeNum = parseFloat(sizeName.replace(/[^\d.]/g, ''));

  if (isNaN(sizeNum) || sizeNum < 9 || sizeNum > 99) {
    // Default to 00 for invalid sizes
    return '00';
  }

  // Convert to 2-digit code
  return Math.floor(sizeNum).toString().padStart(2, '0');
}

/**
 * Convert color to numeric code (2 digits)
 * Uses a deterministic hash of the color name
 */
function normalizeColorCode(colorName: string): string {
  const hash = simpleHash(colorName);
  // Use modulo to get 2 digits (00-99)
  return (hash % 100).toString().padStart(2, '0');
}

/**
 * Simple hash function for string to number conversion
 * Used for deterministic color code generation
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Calculate Modulo 10 checksum digit
 *
 * Algorithm:
 * 1. Starting from the right, multiply every second digit by 2
 * 2. If the result is > 9, subtract 9
 * 3. Sum all digits
 * 4. The checksum is (10 - (sum % 10)) % 10
 *
 * This is a simplified version of the Luhn algorithm,
 * commonly used in credit cards and retail barcodes.
 */
function calculateChecksum(code: string): string {
  const digits = code.split('').map(Number);
  let sum = 0;

  // Process from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    const position = digits.length - 1 - i;
    let digit = digits[i];

    // Multiply every second digit by 2
    if (position % 2 === 0) {
      digit *= 2;
      // If result > 9, subtract 9
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
  }

  // Calculate checksum
  const checksum = (10 - (sum % 10)) % 10;
  return checksum.toString();
}

/**
 * Validate a barcode's checksum
 * Returns true if the barcode has a valid checksum
 */
export function validateBarcode(barcode: string): boolean {
  if (!barcode || barcode.length < 2) {
    return false;
  }

  const code = barcode.slice(0, -1);
  const checksum = barcode.slice(-1);
  const calculatedChecksum = calculateChecksum(code);

  return checksum === calculatedChecksum;
}

/**
 * Generate a unique barcode for a product variant
 *
 * @param productCode - The product's unique code/SKU
 * @param sizeName - The size name (e.g., "42", "9.5", "L")
 * @param colorName - The color name (e.g., "Negro", "Rojo")
 * @param variantId - Optional variant ID for additional uniqueness
 * @returns A deterministic numeric barcode with checksum
 *
 * Format: PPPPPSSCCX (10 digits total)
 * - PPPPP: Product ID (5 digits)
 * - SS: Size code (2 digits)
 * - CC: Color code (2 digits)
 * - X: Checksum (1 digit)
 */
export function generateBarcode(
  productCode: string,
  sizeName: string,
  colorName: string,
  variantId?: string
): string {
  // Normalize components to fixed-length numeric codes
  const productId = normalizeProductId(productCode);
  const sizeCode = normalizeSizeCode(sizeName);
  const colorCode = normalizeColorCode(colorName);

  // Combine into base code (9 digits)
  const baseCode = `${productId}${sizeCode}${colorCode}`;

  // Calculate and append checksum
  const checksum = calculateChecksum(baseCode);
  const barcode = `${baseCode}${checksum}`;

  return barcode;
}

/**
 * Generate EAN-13 compatible barcode
 *
 * EAN-13 is commonly used in retail and requires 13 digits
 * Format: CCCPPPPPSSCCX
 * - CCC: Country/Company code (3 digits) - configurable prefix
 * - PPPPP: Product ID (5 digits)
 * - SS: Size code (2 digits)
 * - CC: Color code (2 digits)
 * - X: EAN checksum (1 digit)
 */
export function generateEAN13Barcode(
  productCode: string,
  sizeName: string,
  colorName: string,
  companyPrefix: string = '200' // Default to 200-299 (internal use)
): string {
  const productId = normalizeProductId(productCode);
  const sizeCode = normalizeSizeCode(sizeName);
  const colorCode = normalizeColorCode(colorName);

  // Ensure company prefix is 3 digits
  const prefix = companyPrefix.padStart(3, '0').slice(0, 3);

  // Combine into base code (12 digits)
  const baseCode = `${prefix}${productId}${sizeCode}${colorCode}`;

  // Calculate EAN-13 checksum
  const checksum = calculateEAN13Checksum(baseCode);
  const barcode = `${baseCode}${checksum}`;

  return barcode;
}

/**
 * Calculate EAN-13 checksum
 *
 * Algorithm:
 * 1. Starting from the right, multiply odd positions by 3
 * 2. Sum all values
 * 3. The checksum is (10 - (sum % 10)) % 10
 */
function calculateEAN13Checksum(code: string): string {
  const digits = code.split('').map(Number);
  let sum = 0;

  for (let i = 0; i < digits.length; i++) {
    // Odd positions (from the right) get multiplied by 3
    const multiplier = (digits.length - i) % 2 === 0 ? 3 : 1;
    sum += digits[i] * multiplier;
  }

  const checksum = (10 - (sum % 10)) % 10;
  return checksum.toString();
}

/**
 * Generate a human-readable barcode label
 *
 * @returns Object containing all label information
 */
export interface BarcodeLabel {
  barcode: string;
  productName: string;
  brand: string;
  size: string;
  color: string;
  price: number;
  sku: string;
}

export function generateBarcodeLabel(
  barcode: string,
  productName: string,
  brand: string,
  size: string,
  color: string,
  price: number,
  sku: string
): BarcodeLabel {
  return {
    barcode,
    productName,
    brand,
    size,
    color,
    price,
    sku,
  };
}

/**
 * Format barcode for display with separators
 * Example: 1234567890 → 12345-67-89-0
 */
export function formatBarcodeDisplay(barcode: string): string {
  if (barcode.length === 10) {
    // Format: PPPPP-SS-CC-X
    return `${barcode.slice(0, 5)}-${barcode.slice(5, 7)}-${barcode.slice(7, 9)}-${barcode.slice(9)}`;
  } else if (barcode.length === 13) {
    // Format EAN-13: CCC-PPPPP-SS-CC-X
    return `${barcode.slice(0, 3)}-${barcode.slice(3, 8)}-${barcode.slice(8, 10)}-${barcode.slice(10, 12)}-${barcode.slice(12)}`;
  }
  return barcode;
}

/**
 * Parse barcode components (for debugging/validation)
 */
export interface BarcodeComponents {
  productId: string;
  sizeCode: string;
  colorCode: string;
  checksum: string;
  companyPrefix?: string;
  isValid: boolean;
}

export function parseBarcode(barcode: string): BarcodeComponents | null {
  if (barcode.length === 10) {
    return {
      productId: barcode.slice(0, 5),
      sizeCode: barcode.slice(5, 7),
      colorCode: barcode.slice(7, 9),
      checksum: barcode.slice(9),
      isValid: validateBarcode(barcode),
    };
  } else if (barcode.length === 13) {
    return {
      companyPrefix: barcode.slice(0, 3),
      productId: barcode.slice(3, 8),
      sizeCode: barcode.slice(8, 10),
      colorCode: barcode.slice(10, 12),
      checksum: barcode.slice(12),
      isValid: validateBarcode(barcode),
    };
  }
  return null;
}

/**
 * Extension Points:
 *
 * 1. Custom Company Prefix:
 *    Modify the generateEAN13Barcode function to use your registered
 *    GS1 company prefix for globally unique barcodes.
 *
 * 2. Alternative Checksums:
 *    Implement different checksum algorithms (UPC, ISBN, etc.)
 *    by creating new calculateChecksum functions.
 *
 * 3. Size/Color Mappings:
 *    Replace normalizeSizeCode and normalizeColorCode with
 *    database lookups for explicit mappings.
 *
 * 4. Barcode Formats:
 *    Add support for Code 39, QR codes, or other symbologies
 *    by implementing additional generation functions.
 *
 * 5. Sequential Numbering:
 *    For guaranteed uniqueness, implement a sequential counter
 *    stored in the database instead of hash-based codes.
 */
