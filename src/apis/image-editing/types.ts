export interface ImageEditingConfig {
  imageFile: string;
  imageFiles?: string[];
  outputPath: string;

  // Core editing options
  removeBackground?: boolean;
  templateId?: string;

  // Background options
  'background.color'?: string;
  'background.prompt'?: string;
  'background.negativePrompt'?: string;
  'background.expandPrompt'?: string;
  'background.imageFile'?: string;
  'background.scaling'?: string;
  'background.seed'?: number;
  'background.guidance.scale'?: number;
  'background.guidance.imageFile'?: string;

  // Layout and sizing
  outputSize?: string;
  maxWidth?: number;
  maxHeight?: number;
  scaling?: string;
  horizontalAlignment?: string;
  verticalAlignment?: string;

  // Margins and padding
  margin?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  padding?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;

  // Advanced features
  'lighting.mode'?: string;
  'shadow.mode'?: string;
  'upscale.mode'?: string;
  'textRemoval.mode'?: string;
  'segmentation.mode'?: string;
  'segmentation.prompt'?: string;
  'segmentation.negativePrompt'?: string;
  'expand.mode'?: string;
  'expand.seed'?: number;

  // Export settings
  'export.format'?: 'png' | 'jpg' | 'webp';
  'export.dpi'?: number;

  // Other options
  referenceBox?: string;
  keepExistingAlphaChannel?: boolean;
  ignorePaddingAndSnapOnCroppedSides?: boolean;
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

export interface QuestionConfig {
  core: string[];
  advanced: string[];
}

export const DEFAULT_QUESTION_CONFIG: QuestionConfig = {
  core: ['removeBackground'],
  advanced: ['outputSize', 'background.prompt', 'export.format']
};
