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
    this.hostname = config.hostname || 'image-api.photoroom.com';
  }

  async makeRequest<T>(
    path: string,
    formData: FormData,
    dryRun = false
  ): Promise<{
    data?: T;
    headers?: Record<string, string | string[] | undefined>;
    error?: BaseApiError | ForbiddenError;
  }> {
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

      if (dryRun) {
        console.log('\n🔍 DRY RUN - API Request Details:');
        console.log('================================');
        console.log(`URL: https://${this.hostname}${path}`);
        console.log(`Method: ${options.method}`);
        console.log('\nHeaders:');
        for (const [key, value] of Object.entries(options.headers)) {
          if (key === 'x-api-key') {
            console.log(`  ${key}: ${'*'.repeat(20)}...`);
          } else {
            console.log(`  ${key}: ${value}`);
          }
        }
        console.log('\nForm Data Fields:');
        // @ts-ignore - accessing private _streams for dry run logging
        const fields = formData._streams.filter((_item: unknown, index: number) => index % 2 === 1);
        for (let i = 0; i < fields.length; i++) {
          const field = fields[i];
          if (typeof field === 'string') {
            // @ts-ignore
            const fieldName = formData._streams[i * 2].match(/name="([^"]+)"/)?.[1];
            console.log(`  ${fieldName}: ${field || '(empty)'}`);
          } else if (field?.path) {
            // @ts-ignore
            const fieldName = formData._streams[i * 2].match(/name="([^"]+)"/)?.[1];
            console.log(`  ${fieldName}: [File: ${field.path}]`);
          }
        }
        console.log('================================\n');

        resolve({
          data: Buffer.from('DRY RUN - No actual request made') as T,
          headers: { 'x-dry-run': 'true' }
        });
        return;
      }

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

  async getAccountDetails(): Promise<{
    data?: { credits: { available: number; subscription: number } };
    error?: BaseApiError | ForbiddenError;
  }> {
    return new Promise((resolve) => {
      const options = {
        method: 'GET',
        hostname: this.hostname,
        path: '/v1/account',
        headers: {
          'x-api-key': this.apiKey,
          Accept: 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const body = Buffer.concat(chunks);

          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(body.toString());
              resolve({ data });
            } catch {
              resolve({
                error: {
                  detail: 'Invalid JSON response',
                  status_code: 500,
                  type: 'parse_error'
                }
              });
            }
          } else {
            try {
              const errorData = JSON.parse(body.toString());
              resolve({ error: errorData });
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

      req.end();
    });
  }

  async editImage(
    imagePath: string,
    options: Record<string, string | number | boolean | undefined>,
    dryRun = false
  ): Promise<{
    data?: Buffer;
    headers?: Record<string, string | string[] | undefined>;
    error?: BaseApiError | ForbiddenError;
  }> {
    const formData = createImageEditingFormData(imagePath, options);
    return this.makeRequest<Buffer>('/v2/edit', formData, dryRun);
  }
}

export function createFormData(
  imagePath: string,
  options: Record<string, string | boolean | undefined>
): FormData {
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

export function createImageEditingFormData(
  imagePath: string,
  options: Record<string, string | number | boolean | undefined>
): FormData {
  const form = new FormData();

  // Add image file with proper content type detection
  const imageBuffer = readFileSync(imagePath);
  const filename = imagePath.split('/').pop() || 'image.jpg';
  const ext = filename.split('.').pop()?.toLowerCase();

  let contentType = 'image/jpeg';
  if (ext === 'png') contentType = 'image/png';
  else if (ext === 'webp') contentType = 'image/webp';
  else if (ext === 'gif') contentType = 'image/gif';
  else if (ext === 'bmp') contentType = 'image/bmp';

  form.append('imageFile', imageBuffer, {
    filename,
    contentType
  });

  // Add all other parameters if they exist
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== '') {
      form.append(key, value.toString());
    }
  }

  return form;
}
