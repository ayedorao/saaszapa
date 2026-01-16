import React from 'react';
import Barcode from 'react-barcode';

/**
 * Professional Barcode Label Component
 *
 * Designed for thermal printer output (typically 2" x 1" or 50mm x 25mm labels)
 * Optimized for 203 DPI thermal printers (standard retail label printers)
 *
 * Label Format:
 * ┌─────────────────────────┐
 * │ BRAND - PRODUCT NAME    │
 * │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
 * │ 1234567890              │
 * │ Size: 42  Color: Negro  │
 * │ $999.99                 │
 * │ SKU: ABC-42-NEGRO       │
 * └─────────────────────────┘
 */

export interface BarcodeLabelProps {
  barcode: string;
  productName: string;
  brand: string;
  size: string;
  color: string;
  price: number;
  sku: string;
  format?: 'CODE128' | 'EAN13';
}

export const BarcodeLabel: React.FC<BarcodeLabelProps> = ({
  barcode,
  productName,
  brand,
  size,
  color,
  price,
  sku,
  format = 'CODE128',
}) => {
  return (
    <div className="barcode-label-container bg-white" style={{
      width: '384px',
      minHeight: '192px',
      padding: '8px',
      backgroundColor: 'white',
      border: '1px solid #000',
      fontFamily: 'monospace',
      fontSize: '10px',
      lineHeight: '1.2',
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 'bold',
        marginBottom: '4px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {brand.toUpperCase()} - {productName.toUpperCase()}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '4px 0',
      }}>
        <Barcode
          value={barcode}
          format={format}
          width={format === 'EAN13' ? 1.5 : 2}
          height={40}
          displayValue={true}
          fontSize={10}
          margin={0}
          background="#ffffff"
          lineColor="#000000"
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '4px',
        marginTop: '4px',
        fontSize: '9px',
      }}>
        <div><strong>Talla:</strong> {size}</div>
        <div><strong>Color:</strong> {color}</div>
      </div>

      <div style={{
        fontSize: '14px',
        fontWeight: 'bold',
        marginTop: '4px',
        textAlign: 'center',
      }}>
        ${price.toFixed(2)}
      </div>

      <div style={{
        fontSize: '8px',
        marginTop: '2px',
        textAlign: 'center',
        color: '#666',
      }}>
        SKU: {sku}
      </div>
    </div>
  );
};

/**
 * Compact Label for smaller thermal printers (1" x 0.5")
 */
export const CompactBarcodeLabel: React.FC<BarcodeLabelProps> = ({
  barcode,
  size,
  color,
  price,
  format = 'CODE128',
}) => {
  return (
    <div className="barcode-label-compact bg-white" style={{
      width: '192px',
      minHeight: '96px',
      padding: '4px',
      backgroundColor: 'white',
      border: '1px solid #000',
      fontFamily: 'monospace',
      fontSize: '8px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
      }}>
        <Barcode
          value={barcode}
          format={format}
          width={1.2}
          height={25}
          displayValue={true}
          fontSize={8}
          margin={0}
          background="#ffffff"
          lineColor="#000000"
        />
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '2px',
        fontSize: '8px',
      }}>
        <span>{size}</span>
        <span>{color}</span>
        <span style={{ fontWeight: 'bold' }}>${price.toFixed(2)}</span>
      </div>
    </div>
  );
};

/**
 * Print utility function
 * Opens a print dialog for the barcode label
 */
export function printBarcodeLabel(
  labelElement: HTMLElement,
  copies: number = 1
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite las ventanas emergentes para imprimir');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Imprimir Etiqueta</title>
        <style>
          @page {
            size: 2in 1in;
            margin: 0;
          }

          @media print {
            body {
              margin: 0;
              padding: 0;
            }

            .barcode-label-container,
            .barcode-label-compact {
              page-break-after: always;
              page-break-inside: avoid;
            }

            .barcode-label-container:last-child,
            .barcode-label-compact:last-child {
              page-break-after: auto;
            }
          }

          body {
            font-family: monospace;
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        ${Array(copies).fill(labelElement.outerHTML).join('')}
      </body>
    </html>
  `);

  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
    setTimeout(() => {
      printWindow.close();
    }, 100);
  }, 250);
}

/**
 * Batch print utility
 * Prints multiple labels at once
 */
export function printMultipleLabels(
  labels: BarcodeLabelProps[],
  copiesPerLabel: number = 1
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite las ventanas emergentes para imprimir');
    return;
  }

  const labelsHTML = labels.flatMap(label =>
    Array(copiesPerLabel).fill(null).map(() => `
      <div class="barcode-label-container" style="width: 384px; min-height: 192px; padding: 8px; background-color: white; border: 1px solid #000; font-family: monospace; font-size: 10px; line-height: 1.2; page-break-after: always;">
        <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">
          ${label.brand.toUpperCase()} - ${label.productName.toUpperCase()}
        </div>
        <div style="text-align: center; margin: 4px 0;">
          <svg id="barcode-${label.barcode}"></svg>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 4px; font-size: 9px;">
          <div><strong>Talla:</strong> ${label.size}</div>
          <div><strong>Color:</strong> ${label.color}</div>
        </div>
        <div style="font-size: 14px; font-weight: bold; margin-top: 4px; text-align: center;">
          $${label.price.toFixed(2)}
        </div>
        <div style="font-size: 8px; margin-top: 2px; text-align: center; color: #666;">
          SKU: ${label.sku}
        </div>
      </div>
    `)
  ).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Imprimir Etiquetas</title>
        <style>
          @page {
            size: 2in 1in;
            margin: 0;
          }

          @media print {
            body {
              margin: 0;
              padding: 0;
            }

            .barcode-label-container {
              page-break-after: always;
              page-break-inside: avoid;
            }

            .barcode-label-container:last-child {
              page-break-after: auto;
            }
          }

          body {
            font-family: monospace;
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        ${labelsHTML}
      </body>
    </html>
  `);

  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
    setTimeout(() => {
      printWindow.close();
    }, 100);
  }, 250);
}

/**
 * Extension Points:
 *
 * 1. Custom Label Sizes:
 *    Create additional label components for different printer sizes
 *    (e.g., 4"x6" for shipping labels)
 *
 * 2. Printer Integration:
 *    Use libraries like 'ZPL' or 'ESC/POS' for direct thermal printer
 *    communication without browser print dialog
 *
 * 3. QR Codes:
 *    Add QR code support for mobile scanning and additional data encoding
 *
 * 4. Logo Integration:
 *    Add company logo to labels for brand recognition
 *
 * 5. Variable Data:
 *    Support for batch printing with CSV import
 *    Dynamic field replacement from database
 */
