import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  filename?: string;
  onStart?: () => void;
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

/**
 * Captures an HTML element and exports it as a multi-page high-definition A4 PDF.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: PDFExportOptions = {}
): Promise<void> {
  const filename = options.filename || `finepath-statement-${Date.now()}.pdf`;

  try {
    options.onStart?.();

    // Render DOM node to high-res canvas (scale: 2 guarantees crisp text & borders)
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1024,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const a4WidthMm = 210;
    const a4HeightMm = 297;
    const imgHeightMm = (canvas.height * a4WidthMm) / canvas.width;

    let heightLeftMm = imgHeightMm;
    let positionMm = 0;

    // First page
    pdf.addImage(imgData, 'PNG', 0, positionMm, a4WidthMm, imgHeightMm, undefined, 'FAST');
    heightLeftMm -= a4HeightMm;

    // Handle subsequent pages if statement exceeds single A4 page
    while (heightLeftMm > 0) {
      positionMm = heightLeftMm - imgHeightMm;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, positionMm, a4WidthMm, imgHeightMm, undefined, 'FAST');
      heightLeftMm -= a4HeightMm;
    }

    pdf.save(filename);
    options.onSuccess?.();
  } catch (error) {
    console.error('PDF export failed:', error);
    options.onError?.(error);
    throw error;
  }
}
