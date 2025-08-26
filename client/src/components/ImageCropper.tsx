import { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  imageUrl: string;
  onCropComplete: (croppedImageUrl: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const ImageCropper = ({ imageUrl, onCropComplete, isOpen = true, onClose }: ImageCropperProps) => {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 25,
    y: 25,
    width: 50,
    height: 50,
  });
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    
    // Set initial crop to be a square in the center
    const size = Math.min(naturalWidth, naturalHeight);
    const x = (naturalWidth - size) / 2;
    const y = (naturalHeight - size) / 2;
    
    setCrop({
      unit: 'px',
      x,
      y,
      width: size,
      height: size,
    });
  }, []);

  const getCroppedImg = useCallback(async (
    image: HTMLImageElement,
    pixelCrop: PixelCrop
  ): Promise<string> => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Set canvas size to the crop size
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Fill canvas with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          resolve(url);
        } else {
          resolve('');
        }
      }, 'image/jpeg', 0.9);
    });
  }, []);

  const handleCropComplete = useCallback(async () => {
    const image = imgRef.current;
    if (!image || !crop) return;

    try {
      // Convert crop to pixel crop if needed
      let pixelCrop: PixelCrop;
      if (crop.unit === '%') {
        pixelCrop = {
          x: (crop.x / 100) * image.naturalWidth,
          y: (crop.y / 100) * image.naturalHeight,
          width: (crop.width / 100) * image.naturalWidth,
          height: (crop.height / 100) * image.naturalHeight,
          unit: 'px'
        };
      } else {
        pixelCrop = crop as PixelCrop;
      }

      const croppedImageUrl = await getCroppedImg(image, pixelCrop);
      if (croppedImageUrl) {
        onCropComplete(croppedImageUrl);
        onClose?.();
      }
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  }, [crop, getCroppedImg, onCropComplete, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-hidden w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Crop Your Profile Picture</h2>
        
        <div className="flex flex-col items-center space-y-4 overflow-auto">
          <div className="max-h-96 overflow-auto">
            <ReactCrop
              crop={crop}
              onChange={(newCrop) => setCrop(newCrop)}
              aspect={1}
              circularCrop
              className="max-w-full"
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-w-full max-h-80 object-contain"
              />
            </ReactCrop>
          </div>
          
          <div className="text-sm text-gray-600 text-center">
            Drag the corners to adjust the crop area. The image will be cropped to fit a circular frame.
          </div>
        </div>

        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />

        <div className="flex justify-between pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCropComplete}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;