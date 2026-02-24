import { useEffect, useRef } from 'react';
import { AreaConfig } from './AreaSelector';

interface QRISImage {
  id: string;
  file: File;
  preview: string;
}

interface ImageMergerProps {
  frameImage: string;
  qrisImages: QRISImage[];
  areaConfig: AreaConfig;
  onMergedImagesReady: (images: string[]) => void;
}

function ImageMerger({ frameImage, qrisImages, areaConfig, onMergedImagesReady }: ImageMergerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    mergeImages();
  }, [frameImage, qrisImages, areaConfig]);

  const mergeImages = async () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mergedResults: string[] = [];

    const frameImg = await loadImage(frameImage);

    // Convert percentage-based area config to actual pixel values
    const targetArea = {
      x: (areaConfig.x / 100) * frameImg.width,
      y: (areaConfig.y / 100) * frameImg.height,
      width: (areaConfig.width / 100) * frameImg.width,
      height: (areaConfig.height / 100) * frameImg.height,
    };

    for (const qrisImage of qrisImages) {
      try {
        const qrisImg = await loadImage(qrisImage.preview);

        canvas.width = frameImg.width;
        canvas.height = frameImg.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the frame
        ctx.drawImage(frameImg, 0, 0);

        // Calculate QRIS dimensions to fill the target area while maintaining aspect ratio
        const qrisAspect = qrisImg.width / qrisImg.height;
        const targetAspect = targetArea.width / targetArea.height;

        let drawWidth: number, drawHeight: number, drawX: number, drawY: number;

        if (qrisAspect > targetAspect) {
          // QRIS is wider proportionally - fit to width
          drawWidth = targetArea.width;
          drawHeight = drawWidth / qrisAspect;
          drawX = targetArea.x;
          drawY = targetArea.y + (targetArea.height - drawHeight) / 2;
        } else {
          // QRIS is taller proportionally - fit to height
          drawHeight = targetArea.height;
          drawWidth = drawHeight * qrisAspect;
          drawX = targetArea.x + (targetArea.width - drawWidth) / 2;
          drawY = targetArea.y;
        }

        ctx.drawImage(qrisImg, drawX, drawY, drawWidth, drawHeight);

        const mergedDataUrl = canvas.toDataURL('image/png', 1.0);
        mergedResults.push(mergedDataUrl);
      } catch (error) {
        console.error('Error merging image:', error);
      }
    }

    onMergedImagesReady(mergedResults);
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

  return <canvas ref={canvasRef} className="hidden" />;
}

export default ImageMerger;
