export interface RemoveBackgroundConfig {
  imageFile: string;
  imageFiles?: string[]; // Support for multiple images
  outputPath: string;
  format: 'png' | 'jpg' | 'webp';
  channels: 'rgba' | 'alpha';
  bgColor?: string;
  size: 'preview' | 'medium' | 'hd' | 'full';
  crop: boolean;
  despill: boolean;
  dryRun?: boolean;
}

export interface RemoveBackgroundApiError {
  detail: string;
  status_code: number;
  type: string;
}
