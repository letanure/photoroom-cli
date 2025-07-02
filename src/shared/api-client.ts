import { createReadStream, promises as fs } from 'node:fs';
import { basename } from 'node:path';
import FormData from 'form-data';
import { getActiveApiKey } from './config-manager.js';

export interface RemoveBackgroundOptions {
  format?: 'png' | 'jpg' | 'webp';
  size?: string;
  crop?: boolean;
  bg_color?: string;
  channels?: 'rgba' | 'alpha';
  despill?: boolean;
}

export interface ApiErrorResponse {
  detail: string;
  status_code: number;
  type: string;
}

export interface ApiSuccessResponse {
  success: true;
  data: Buffer;
  uncertaintyScore?: number;
}

export interface ApiErrorResult {
  success: false;
  error: string;
  detail?: string;
  type?: string;
  statusCode?: number;
}

export type ApiResponse = ApiSuccessResponse | ApiErrorResult;

function getErrorMessage(statusCode: number, errorData: ApiErrorResponse): string {
  switch (statusCode) {
    case 400:
      return `Bad Request: ${errorData.detail} (${errorData.type})`;
    case 402:
      return `Payment Required: ${errorData.detail} (${errorData.type})`;
    case 403:
      return `Forbidden: ${errorData.detail} (${errorData.type})`;
    case 404:
      return `Not Found: ${errorData.detail} (${errorData.type})`;
    case 429:
      return `Rate Limited: ${errorData.detail} (${errorData.type})`;
    case 500:
      return `Server Error: ${errorData.detail} (${errorData.type})`;
    default:
      return `HTTP ${statusCode}: ${errorData.detail} (${errorData.type})`;
  }
}

export async function removeBackgroundApi(
  imagePaths: string[],
  options: RemoveBackgroundOptions = {}
): Promise<{ path: string; result: ApiResponse }[]> {
  const activeKey = await getActiveApiKey();

  if (!activeKey) {
    throw new Error('No active API key found. Please add and activate an API key first.');
  }

  const results: { path: string; result: ApiResponse }[] = [];

  for (const imagePath of imagePaths) {
    try {
      const result = await processImage(imagePath, options, activeKey.data.key);
      results.push({ path: imagePath, result });
    } catch (error) {
      results.push({
        path: imagePath,
        result: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  return results;
}

async function processImage(
  imagePath: string,
  options: RemoveBackgroundOptions,
  apiKey: string
): Promise<ApiResponse> {
  return new Promise((resolve) => {
    const form = new FormData();

    // Add image file
    form.append('image_file', createReadStream(imagePath));

    // Add options
    if (options.format) form.append('format', options.format);
    if (options.size) form.append('size', options.size);
    if (options.crop !== undefined) form.append('crop', options.crop.toString());
    if (options.bg_color) form.append('bg_color', options.bg_color);
    if (options.channels) form.append('channels', options.channels);
    if (options.despill !== undefined) form.append('despill', options.despill.toString());

    const request = form.submit(
      {
        protocol: 'https:',
        hostname: 'sdk.photoroom.com',
        path: '/v1/segment',
        headers: {
          Accept: 'image/png, application/json',
          'x-api-key': apiKey
        }
      },
      (error, response) => {
        if (error) {
          resolve({
            success: false,
            error: `Request failed: ${error.message}`
          });
          return;
        }

        const chunks: Buffer[] = [];

        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          const body = Buffer.concat(chunks);

          if (response.statusCode === 200) {
            // Get uncertainty score from headers
            const uncertaintyScore = response.headers['x-uncertainty-score'];
            const score = uncertaintyScore
              ? Number.parseFloat(uncertaintyScore as string)
              : undefined;

            resolve({
              success: true,
              data: body,
              uncertaintyScore: score
            });
          } else {
            // Handle error responses
            try {
              const errorData = JSON.parse(body.toString()) as ApiErrorResponse;
              const errorMessage = getErrorMessage(response.statusCode || 500, errorData);

              resolve({
                success: false,
                error: errorMessage,
                detail: errorData.detail,
                type: errorData.type,
                statusCode: errorData.status_code
              });
            } catch {
              // Fallback for non-JSON error responses
              resolve({
                success: false,
                error: `HTTP ${response.statusCode}: ${body.toString() || 'Unknown error'}`,
                statusCode: response.statusCode
              });
            }
          }
        });

        response.on('error', (responseError) => {
          resolve({
            success: false,
            error: `Response error: ${responseError.message}`
          });
        });
      }
    );

    request.on('error', (requestError) => {
      resolve({
        success: false,
        error: `Request error: ${requestError.message}`
      });
    });
  });
}

export async function saveProcessedImage(
  originalPath: string,
  processedData: Buffer,
  options: RemoveBackgroundOptions
): Promise<string> {
  const extension = options.format || 'png';
  const baseName = basename(originalPath, `.${basename(originalPath).split('.').pop()}`);
  const outputPath = `${baseName}_processed.${extension}`;

  await fs.writeFile(outputPath, processedData);
  return outputPath;
}
