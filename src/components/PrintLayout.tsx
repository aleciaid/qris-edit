import { Download, FileText, Printer } from 'lucide-react';
import { useRef, useState } from 'react';
import jsPDF from 'jspdf';

interface PrintLayoutProps {
  mergedImages: string[];
  imagesPerPage: number;
}

function PrintLayout({ mergedImages, imagesPerPage }: PrintLayoutProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const pages: string[][] = [];
  for (let i = 0; i < mergedImages.length; i += imagesPerPage) {
    pages.push(mergedImages.slice(i, i + imagesPerPage));
  }

  const getGridClass = () => {
    switch (imagesPerPage) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2';
      case 4:
        return 'grid-cols-2';
      case 6:
        return 'grid-cols-3';
      default:
        return 'grid-cols-2';
    }
  };

  // Determine orientation based on images per page
  const getOrientation = (): 'portrait' | 'landscape' => {
    return imagesPerPage >= 2 ? 'landscape' : 'portrait';
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const downloadPageAsPDF = async (pageImages: string[], pageIndex: number) => {
    setIsGenerating(true);
    try {
      const orientation = getOrientation();
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
      });

      // A4 dimensions in mm
      const pageWidth = orientation === 'landscape' ? 297 : 210;
      const pageHeight = orientation === 'landscape' ? 210 : 297;
      const padding = 3; // mm

      const cols = imagesPerPage === 1 ? 1 : imagesPerPage === 2 ? 2 : imagesPerPage === 4 ? 2 : 3;
      const rows = Math.ceil(imagesPerPage / cols);

      const availableWidth = pageWidth - (padding * 2);
      const availableHeight = pageHeight - (padding * 2);
      const cellWidth = availableWidth / cols;
      const cellHeight = availableHeight / rows;

      for (let i = 0; i < pageImages.length; i++) {
        const img = await loadImage(pageImages[i]);

        const col = i % cols;
        const row = Math.floor(i / cols);

        const imgAspect = img.width / img.height;
        const cellAspect = cellWidth / cellHeight;

        let drawWidth: number, drawHeight: number;
        if (imgAspect > cellAspect) {
          drawWidth = cellWidth * 0.99;
          drawHeight = drawWidth / imgAspect;
        } else {
          drawHeight = cellHeight * 0.99;
          drawWidth = drawHeight * imgAspect;
        }

        const x = padding + col * cellWidth + (cellWidth - drawWidth) / 2;
        const y = padding + row * cellHeight + (cellHeight - drawHeight) / 2;

        pdf.addImage(pageImages[i], 'PNG', x, y, drawWidth, drawHeight);
      }

      pdf.save(`qris-merged-page-${pageIndex + 1}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal membuat PDF. Silakan coba lagi.');
    }
    setIsGenerating(false);
  };

  const downloadAllAsPDF = async () => {
    setIsGenerating(true);
    try {
      const orientation = getOrientation();
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = orientation === 'landscape' ? 297 : 210;
      const pageHeight = orientation === 'landscape' ? 210 : 297;
      const padding = 3;

      const cols = imagesPerPage === 1 ? 1 : imagesPerPage === 2 ? 2 : imagesPerPage === 4 ? 2 : 3;
      const rows = Math.ceil(imagesPerPage / cols);

      const availableWidth = pageWidth - (padding * 2);
      const availableHeight = pageHeight - (padding * 2);
      const cellWidth = availableWidth / cols;
      const cellHeight = availableHeight / rows;

      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        if (pageIdx > 0) {
          pdf.addPage('a4', orientation);
        }

        const pageImages = pages[pageIdx];

        for (let i = 0; i < pageImages.length; i++) {
          const img = await loadImage(pageImages[i]);

          const col = i % cols;
          const row = Math.floor(i / cols);

          const imgAspect = img.width / img.height;
          const cellAspect = cellWidth / cellHeight;

          let drawWidth: number, drawHeight: number;
          if (imgAspect > cellAspect) {
            drawWidth = cellWidth * 0.99;
            drawHeight = drawWidth / imgAspect;
          } else {
            drawHeight = cellHeight * 0.99;
            drawWidth = drawHeight * imgAspect;
          }

          const x = padding + col * cellWidth + (cellWidth - drawWidth) / 2;
          const y = padding + row * cellHeight + (cellHeight - drawHeight) / 2;

          pdf.addImage(pageImages[i], 'PNG', x, y, drawWidth, drawHeight);
        }
      }

      pdf.save('qris-merged-all.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal membuat PDF. Silakan coba lagi.');
    }
    setIsGenerating(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const orientationLabel = getOrientation() === 'landscape' ? 'Landscape' : 'Portrait';

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6 justify-between items-center">
        <div className="text-sm text-slate-500">
          Orientasi: <span className="font-medium text-slate-700">{orientationLabel}</span> • {pages.length} halaman
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 text-sm"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={downloadAllAsPDF}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 text-sm disabled:opacity-60 disabled:cursor-wait"
          >
            <FileText className="w-4 h-4" />
            {isGenerating ? 'Membuat PDF...' : `Download PDF (${pages.length} hal)`}
          </button>
        </div>
      </div>

      <div ref={printAreaRef} className="space-y-8">
        {pages.map((pageImages, pageIndex) => (
          <div key={pageIndex} className="print-page">
            <div className={`bg-white rounded-lg shadow-md border border-slate-200 p-2 ${imagesPerPage >= 2 ? 'aspect-[297/210]' : 'aspect-[210/297]'
              }`}>
              <div className="flex justify-between items-center mb-4 print:hidden">
                <h3 className="text-sm font-semibold text-slate-600">
                  Halaman {pageIndex + 1} ({pageImages.length} gambar) — {orientationLabel}
                </h3>
                <button
                  onClick={() => downloadPageAsPDF(pageImages, pageIndex)}
                  disabled={isGenerating}
                  className="px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
              </div>

              <div className={`grid ${getGridClass()} gap-4 h-[calc(100%-3rem)]`}>
                {pageImages.map((img, imgIndex) => (
                  <div key={imgIndex} className="flex items-center justify-center rounded p-1">
                    <img
                      src={img}
                      alt={`Merged ${pageIndex * imagesPerPage + imgIndex + 1}`}
                      className="max-w-full max-h-full h-auto rounded shadow object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-page, .print-page * {
            visibility: visible;
          }
          .print-page {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            page-break-after: always;
          }
          @page {
            size: ${getOrientation() === 'landscape' ? 'A4 landscape' : 'A4'};
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default PrintLayout;
