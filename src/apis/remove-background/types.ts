export interface RemoveBackgroundConfig {
  imageFile: string;
  outputPath: string;
  format: 'png' | 'jpg' | 'webp';
  channels: 'rgba' | 'alpha';
  bgColor?: string;
  size: 'preview' | 'medium' | 'hd' | 'full';
  crop: boolean;
  despill: boolean;
}

export interface PhotoRoomApiResponse {
  success: boolean;
  data?: Buffer;
  headers?: {
    'x-uncertainty-score'?: string;
  };
  error?: PhotoRoomApiError;
}

export interface PhotoRoomApiError {
  detail: string;
  status_code: number;
  type: string;
}

export interface UncertaintyScore {
  value: number;
  confidence: 'very-confident' | 'confident' | 'uncertain' | 'very-uncertain' | 'human-detected';
  description: string;
}
