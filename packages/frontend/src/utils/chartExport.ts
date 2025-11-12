import html2canvas from 'html2canvas';

/**
 * Export a chart component as an image file
 * @param element - The DOM element containing the chart
 * @param filename - The name of the file to download (without extension)
 * @param format - The image format ('png' or 'svg')
 */
export async function exportChartAsImage(
  element: HTMLElement,
  filename: string = 'chart',
  format: 'png' | 'svg' = 'png'
): Promise<void> {
  try {
    if (format === 'png') {
      // Use html2canvas for PNG export
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true,
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `${filename}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    } else {
      // For SVG, we'll need to extract the SVG element
      const svgElement = element.querySelector('svg');
      if (!svgElement) {
        throw new Error('No SVG element found in the chart');
      }

      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;

      // Get the bounding box
      const bbox = svgElement.getBBox();
      clonedSvg.setAttribute('width', bbox.width.toString());
      clonedSvg.setAttribute('height', bbox.height.toString());
      clonedSvg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);

      // Serialize SVG to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${filename}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error exporting chart:', error);
    alert('Failed to export chart. Please try again.');
  }
}

/**
 * Export chart data as CSV
 * @param data - Array of data objects
 * @param columns - Column definitions with keys and labels
 * @param filename - The name of the file to download (without extension)
 */
export function exportChartDataAsCSV(
  data: any[],
  columns: { key: string; label: string }[],
  filename: string = 'chart-data'
): void {
  try {
    // Create CSV header
    const headers = columns.map((col) => col.label).join(',');

    // Create CSV rows
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const value = row[col.key];
          // Escape commas and quotes
          return `"${String(value || '').replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csv = [headers, ...rows].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    alert('Failed to export CSV. Please try again.');
  }
}

/**
 * Copy chart as image to clipboard (PNG only)
 * @param element - The DOM element containing the chart
 */
export async function copyChartToClipboard(element: HTMLElement): Promise<void> {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    });

    canvas.toBlob(async (blob) => {
      if (blob && navigator.clipboard) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          alert('Chart copied to clipboard!');
        } catch (err) {
          console.error('Failed to copy to clipboard:', err);
          alert('Failed to copy to clipboard. Please try export instead.');
        }
      }
    });
  } catch (error) {
    console.error('Error copying chart:', error);
    alert('Failed to copy chart. Please try again.');
  }
}

/**
 * Print a chart
 * @param element - The DOM element containing the chart
 */
export function printChart(element: HTMLElement): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the chart.');
    return;
  }

  const clone = element.cloneNode(true) as HTMLElement;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Chart</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
          }
          @media print {
            body {
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        ${clone.outerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}
