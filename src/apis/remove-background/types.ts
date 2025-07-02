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

export interface PhotoRoomApiResponse {
  success: boolean;
  data?: Buffer;
  headers?: {
    'x-uncertainty-score'?: string;
  };
  error?: RemoveBackgroundApiError;
}

export interface RemoveBackgroundApiError {
  detail: string;
  status_code: number;
  type: string;
}

export interface RemoveBackgroundSuccessResponse {
  data: Buffer;
  headers: {
    'x-uncertainty-score'?: string;
  };
}

export interface RemoveBackgroundErrorResponse {
  error: RemoveBackgroundApiError;
}

export interface UncertaintyScore {
  value: number;
  confidence: 'very-confident' | 'confident' | 'uncertain' | 'very-uncertain' | 'human-detected';
  description: string;
}
