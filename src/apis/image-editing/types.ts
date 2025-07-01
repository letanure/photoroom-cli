export interface ImageEditingConfig {
  imageFile: string;
  outputPath: string;
  operation: 'enhance' | 'resize' | 'filter' | 'crop';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  preserveAspectRatio: boolean;
}

export interface EnhanceOptions {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
}

export interface ResizeOptions {
  width: number;
  height: number;
  maintainAspectRatio: boolean;
}

export interface FilterOptions {
  filterType: 'vintage' | 'black-white' | 'sepia' | 'blur' | 'sharpen';
  intensity: number;
}

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageEditingApiResponse {
  success: boolean;
  data?: Buffer;
  metadata?: {
    originalSize: { width: number; height: number };
    processedSize: { width: number; height: number };
    processingTime: number;
  };
  error?: {
    detail: string;
    status_code: number;
    type: string;
  };
}
