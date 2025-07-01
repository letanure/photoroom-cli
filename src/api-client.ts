import { readFileSync } from 'node:fs';
import https from 'node:https';
import FormData from 'form-data';
import type { BaseApiError, ForbiddenError } from './types.js';

export interface ApiClientConfig {
  apiKey: string;
  hostname?: string;
}

export class PhotoRoomApiClient {
  private apiKey: string;
  private hostname: string;

  constructor(config: ApiClientConfig) {
    this.apiKey = config.apiKey || process.env.PHOTOROOM_API_KEY || '';
    this.hostname = config.hostname || 'sdk.photoroom.com';
  }

  async makeRequest<T>(
    path: string,
    formData: FormData
  ): Promise<{ data?: T; headers?: any; error?: BaseApiError | ForbiddenError }> {
    return new Promise((resolve) => {
      const options = {
        method: 'POST',
        hostname: this.hostname,
        path: path,
        headers: {
          ...formData.getHeaders(),
          Accept: 'image/png, application/json',
          'x-api-key': this.apiKey
        }
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const body = Buffer.concat(chunks);

          // Check if response is JSON (error) or binary (image)
          const _contentType = res.headers['content-type'] || '';

          if (res.statusCode === 200) {
            resolve({
              data: body as T,
              headers: res.headers
            });
          } else {
            try {
              const errorData = JSON.parse(body.toString());
              resolve({
                error: errorData
              });
            } catch {
              resolve({
                error: {
                  detail: 'Unknown error occurred',
                  status_code: res.statusCode || 500,
                  type: 'unknown_error'
                }
              });
            }
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          error: {
            detail: error.message,
            status_code: 500,
            type: 'network_error'
          }
        });
      });

      formData.pipe(req);
    });
  }
}

export function createFormData(imagePath: string, options: Record<string, any>): FormData {
  const form = new FormData();

  // Add image file
  const imageBuffer = readFileSync(imagePath);
  form.append('image_file', imageBuffer, {
    filename: imagePath.split('/').pop() || 'image.jpg',
    contentType: 'image/jpeg' // This will be adjusted based on actual file type
  });

  // Add other parameters
  if (options.format) form.append('format', options.format);
  if (options.channels) form.append('channels', options.channels);
  if (options.bgColor) form.append('bg_color', options.bgColor);
  if (options.size) form.append('size', options.size);
  if (options.crop !== undefined) form.append('crop', options.crop.toString());
  if (options.despill !== undefined) form.append('despill', options.despill.toString());

  return form;
}
