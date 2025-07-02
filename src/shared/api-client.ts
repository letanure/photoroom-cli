import { createReadStream, promises as fs } from 'node:fs';
import { basename, join, relative } from 'node:path';
import FormData from 'form-data';
import { getActiveApiKey } from './config-manager.js';
import { debugLogRequest, debugLogResponse, isDryRunEnabled, logCurlCommand } from './debug.js';
import { type ConflictState, handleFileConflict } from './file-conflict-handler.js';

export interface RemoveBackgroundOptions {
  format?: 'png' | 'jpg' | 'webp';
  size?: string;
  crop?: boolean;
  bg_color?: string;
  channels?: 'rgba' | 'alpha';
  despill?: boolean;
  outputDir?: string;
}

export interface ImageEditingOptions {
  templateId?: string;
  upscaleMode?: 'ai.fast' | 'ai.slow';
  removeBackground?: boolean;
  background?: {
    color?: string;
    imageUrl?: string;
    imageFile?: string;
    guidanceImageUrl?: string;
    guidanceScale?: number;
    prompt?: string;
    negativePrompt?: string;
    expandPrompt?: string;
    scaling?: 'fit' | 'fill';
    seed?: number;
  };
  scaling?: 'fit' | 'fill';
  horizontalAlignment?: 'left' | 'center' | 'right';
  verticalAlignment?: 'top' | 'center' | 'bottom';
  keepExistingAlphaChannel?: 'auto' | 'never';
  ignorePaddingAndSnapOnCroppedSides?: boolean;
  lightingMode?: 'ai.auto';
  referenceBox?: 'subjectBox' | 'originalImage';
  shadowMode?: 'ai.soft' | 'ai.hard' | 'ai.floating';
  textRemovalMode?: 'ai.artificial' | 'ai.natural' | 'ai.all';
  margin?: number | string;
  marginTop?: number | string;
  marginRight?: number | string;
  marginBottom?: number | string;
  marginLeft?: number | string;
  padding?: number | string;
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  expand?: {
    mode?: 'ai.auto';
    seed?: number;
  };
  export?: {
    dpi?: number;
    format?: 'png' | 'jpeg' | 'jpg' | 'webp';
  };
  outputImageMimeType?: string;
  maxWidth?: number;
  maxHeight?: number;
  outputSize?: string;
  sizeWidth?: number;
  sizeHeight?: number;
  outputDir?: string;
}

export interface ApiErrorResponse {
  detail: string;
  status_code: number;
  type: string;
}

export interface AccountCredits {
  available: number;
  subscription: number;
}

export interface AccountResponse {
  credits: AccountCredits;
}

export interface AccountErrorResponse {
  error: {
    message: string;
  };
}

export interface ApiSuccessResponse {
  success: true;
  data: Buffer;
  uncertaintyScore?: number;
}

export interface ImageEditingSuccessResponse extends ApiSuccessResponse {
  aiBackgroundSeed?: string;
  editFurtherUrl?: string;
  textsDetected?: number;
  unsupportedAttributes?: string;
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

    const url = 'https://sdk.photoroom.com/v1/segment';
    const headers = {
      Accept: 'image/png, application/json',
      'x-api-key': apiKey
    };

    debugLogRequest(url, 'POST', headers, form);
    logCurlCommand(url, 'POST', headers, form, imagePath);

    // Return mock response in dry-run mode
    if (isDryRunEnabled()) {
      resolve({
        success: true,
        data: Buffer.from('fake-image-data'),
        uncertaintyScore: 0.1
      });
      return;
    }

    const request = form.submit(
      {
        protocol: 'https:',
        hostname: 'sdk.photoroom.com',
        path: '/v1/segment',
        headers
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

          // Debug log the response
          debugLogResponse(response.statusCode || 0, response.headers, body);

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
  options: RemoveBackgroundOptions,
  conflictState: ConflictState
): Promise<string | null> {
  const extension = options.format || 'png';
  const baseName = basename(originalPath, `.${basename(originalPath).split('.').pop()}`);
  const fileName = `${baseName}_processed.${extension}`;

  // Use output directory if specified, otherwise current directory
  const outputDir = options.outputDir || '.';
  const outputPath = join(outputDir, fileName);

  // Create output directory if it doesn't exist
  if (options.outputDir) {
    await fs.mkdir(outputDir, { recursive: true });
  }

  // Handle file conflicts
  const resolution = await handleFileConflict(outputPath, conflictState);

  if (resolution.action === 'cancel') {
    return null; // Operation cancelled
  }

  const finalPath = resolution.newPath;
  if (!finalPath) {
    throw new Error('No output path provided');
  }
  await fs.writeFile(finalPath, processedData);

  // Return relative path from current working directory
  return relative(process.cwd(), finalPath);
}

export async function imageEditingApi(
  imagePaths: string[],
  options: ImageEditingOptions = {}
): Promise<{ path: string; result: ImageEditingSuccessResponse | ApiErrorResult }[]> {
  const activeKey = await getActiveApiKey();

  if (!activeKey) {
    throw new Error('No active API key found. Please add and activate an API key first.');
  }

  const results: { path: string; result: ImageEditingSuccessResponse | ApiErrorResult }[] = [];

  for (const imagePath of imagePaths) {
    try {
      const result = await processImageEditing(imagePath, options, activeKey.data.key);
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

async function processImageEditing(
  imagePath: string,
  options: ImageEditingOptions,
  apiKey: string
): Promise<ImageEditingSuccessResponse | ApiErrorResult> {
  // Check if we're using a URL or file
  const isUrl = imagePath.startsWith('http://') || imagePath.startsWith('https://');

  if (isUrl) {
    return processImageEditingUrl(imagePath, options, apiKey);
  }
  return processImageEditingFile(imagePath, options, apiKey);
}

async function processImageEditingUrl(
  imageUrl: string,
  options: ImageEditingOptions,
  apiKey: string
): Promise<ImageEditingSuccessResponse | ApiErrorResult> {
  try {
    const params = new URLSearchParams();
    params.append('imageUrl', imageUrl);

    // Add all options as URL parameters
    addOptionsToParams(params, options);

    const url = `https://image-api.photoroom.com/v2/edit?${params.toString()}`;
    const headers = {
      Accept: 'image/png, application/json',
      'x-api-key': apiKey
    };

    debugLogRequest(url, 'GET', headers);
    logCurlCommand(url, 'GET', headers, undefined, imageUrl);

    // Return mock response in dry-run mode
    if (isDryRunEnabled()) {
      return {
        success: true,
        data: Buffer.from('fake-image-data'),
        uncertaintyScore: 0.1
      };
    }

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    return handleImageEditingResponse(response);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function processImageEditingFile(
  imagePath: string,
  options: ImageEditingOptions,
  apiKey: string
): Promise<ImageEditingSuccessResponse | ApiErrorResult> {
  return new Promise((resolve) => {
    const form = new FormData();

    // Add image file
    form.append('imageFile', createReadStream(imagePath));

    // Add all options to form data
    addOptionsToFormData(form, options);

    const url = 'https://image-api.photoroom.com/v2/edit';
    const headers = {
      Accept: 'image/png, application/json',
      'x-api-key': apiKey
    };

    debugLogRequest(url, 'POST', headers, form);
    logCurlCommand(url, 'POST', headers, form, imagePath);

    // Return mock response in dry-run mode
    if (isDryRunEnabled()) {
      resolve({
        success: true,
        data: Buffer.from('fake-image-data'),
        uncertaintyScore: 0.1
      });
      return;
    }

    const request = form.submit(
      {
        protocol: 'https:',
        hostname: 'image-api.photoroom.com',
        path: '/v2/edit',
        headers
      },
      async (error, response) => {
        if (error) {
          resolve({
            success: false,
            error: `Request failed: ${error.message}`
          });
          return;
        }

        const result = await handleImageEditingResponseStream(response);
        resolve(result);
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

async function handleImageEditingResponse(
  response: Response
): Promise<ImageEditingSuccessResponse | ApiErrorResult> {
  const data = Buffer.from(await response.arrayBuffer());

  // Convert Headers to plain object for debugging
  const responseHeaders: Record<string, unknown> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  debugLogResponse(response.status, responseHeaders, data);

  if (response.status === 200) {
    return {
      success: true,
      data,
      uncertaintyScore: response.headers.get('x-uncertainty-score')
        ? Number.parseFloat(response.headers.get('x-uncertainty-score') as string)
        : undefined,
      aiBackgroundSeed: response.headers.get('pr-ai-background-seed') || undefined,
      editFurtherUrl: response.headers.get('pr-edit-further-url') || undefined,
      textsDetected: response.headers.get('pr-texts-detected')
        ? Number.parseInt(response.headers.get('pr-texts-detected') as string, 10)
        : undefined,
      unsupportedAttributes: response.headers.get('pr-unsupported-attributes') || undefined
    };
  }

  try {
    const errorData = JSON.parse(data.toString());

    // Handle different error response formats
    if (errorData.error?.message) {
      // PhotoRoom API format: {"error":{"message":"..."}}
      return {
        success: false,
        error: errorData.error.message,
        statusCode: response.status
      };
    }
    if (errorData.detail) {
      // Standard format: {detail: "...", status_code: number, type: string}
      const standardError = errorData as ApiErrorResponse;
      const errorMessage = getErrorMessage(response.status, standardError);
      return {
        success: false,
        error: errorMessage,
        detail: standardError.detail,
        type: standardError.type,
        statusCode: standardError.status_code
      };
    }
    // Fallback to raw response
    return {
      success: false,
      error: `HTTP ${response.status}: ${JSON.stringify(errorData)}`,
      statusCode: response.status
    };
  } catch {
    return {
      success: false,
      error: `HTTP ${response.status}: ${data.toString() || 'Unknown error'}`,
      statusCode: response.status
    };
  }
}

async function handleImageEditingResponseStream(
  response: NodeJS.ReadableStream & {
    statusCode?: number;
    headers: Record<string, string | string[] | undefined>;
  }
): Promise<ImageEditingSuccessResponse | ApiErrorResult> {
  const chunks: Buffer[] = [];

  return new Promise((resolve) => {
    response.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    response.on('end', () => {
      const body = Buffer.concat(chunks);

      // Debug log the response
      debugLogResponse(response.statusCode || 0, response.headers, body);

      if (response.statusCode === 200) {
        const uncertaintyScore = response.headers['x-uncertainty-score'];
        const score = uncertaintyScore ? Number.parseFloat(uncertaintyScore as string) : undefined;

        const getHeaderValue = (headerName: string): string | undefined => {
          const value = response.headers[headerName];
          return Array.isArray(value) ? value[0] : value;
        };

        resolve({
          success: true,
          data: body,
          uncertaintyScore: score,
          aiBackgroundSeed: getHeaderValue('pr-ai-background-seed'),
          editFurtherUrl: getHeaderValue('pr-edit-further-url'),
          textsDetected: getHeaderValue('pr-texts-detected')
            ? Number.parseInt(getHeaderValue('pr-texts-detected') as string, 10)
            : undefined,
          unsupportedAttributes: getHeaderValue('pr-unsupported-attributes')
        });
      } else {
        try {
          const errorData = JSON.parse(body.toString());

          // Handle different error response formats
          if (errorData.error?.message) {
            // PhotoRoom API format: {"error":{"message":"..."}}
            resolve({
              success: false,
              error: errorData.error.message,
              statusCode: response.statusCode
            });
            return;
          }
          if (errorData.detail) {
            // Standard format: {detail: "...", status_code: number, type: string}
            const standardError = errorData as ApiErrorResponse;
            const errorMessage = getErrorMessage(response.statusCode || 500, standardError);
            resolve({
              success: false,
              error: errorMessage,
              detail: standardError.detail,
              type: standardError.type,
              statusCode: standardError.status_code
            });
            return;
          }
          // Fallback to raw response
          resolve({
            success: false,
            error: `HTTP ${response.statusCode}: ${JSON.stringify(errorData)}`,
            statusCode: response.statusCode
          });
        } catch {
          resolve({
            success: false,
            error: `HTTP ${response.statusCode}: ${body.toString() || 'Unknown error'}`,
            statusCode: response.statusCode
          });
        }
      }
    });

    response.on('error', (responseError: Error) => {
      resolve({
        success: false,
        error: `Response error: ${responseError.message}`
      });
    });
  });
}

// Helper function to check if a value is meaningful (not empty, null, undefined, or 0)
function hasValue(value: unknown): value is string | number {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return value > 0;
  return Boolean(value);
}

function addOptionsToParams(params: URLSearchParams, options: ImageEditingOptions): void {
  if (options.templateId) params.append('templateId', options.templateId);
  if (options.upscaleMode) params.append('upscale.mode', options.upscaleMode);
  if (options.removeBackground !== undefined)
    params.append('removeBackground', options.removeBackground.toString());

  // Background options
  if (options.background?.color) params.append('background.color', options.background.color);
  if (options.background?.imageUrl)
    params.append('background.imageUrl', options.background.imageUrl);
  if (options.background?.guidanceImageUrl)
    params.append('background.guidance.imageUrl', options.background.guidanceImageUrl);
  if (hasValue(options.background?.guidanceScale))
    params.append('background.guidance.scale', options.background.guidanceScale.toString());
  if (options.background?.prompt) params.append('background.prompt', options.background.prompt);
  if (options.background?.negativePrompt)
    params.append('background.negativePrompt', options.background.negativePrompt);
  if (options.background?.expandPrompt)
    params.append('background.expandPrompt', options.background.expandPrompt);
  if (options.background?.scaling) params.append('background.scaling', options.background.scaling);
  if (hasValue(options.background?.seed))
    params.append('background.seed', options.background.seed.toString());

  // Layout options
  if (options.scaling) params.append('scaling', options.scaling);
  if (options.horizontalAlignment)
    params.append('horizontalAlignment', options.horizontalAlignment);
  if (options.verticalAlignment) params.append('verticalAlignment', options.verticalAlignment);
  if (options.keepExistingAlphaChannel)
    params.append('keepExistingAlphaChannel', options.keepExistingAlphaChannel);
  if (options.ignorePaddingAndSnapOnCroppedSides !== undefined)
    params.append(
      'ignorePaddingAndSnapOnCroppedSides',
      options.ignorePaddingAndSnapOnCroppedSides.toString()
    );
  if (options.lightingMode) params.append('lighting.mode', options.lightingMode);
  if (options.referenceBox) params.append('referenceBox', options.referenceBox);
  if (options.shadowMode) params.append('shadow.mode', options.shadowMode);
  if (options.textRemovalMode) params.append('textRemoval.mode', options.textRemovalMode);

  // Spacing options
  if (hasValue(options.margin)) params.append('margin', options.margin.toString());
  if (hasValue(options.marginTop)) params.append('marginTop', options.marginTop.toString());
  if (hasValue(options.marginRight)) params.append('marginRight', options.marginRight.toString());
  if (hasValue(options.marginBottom))
    params.append('marginBottom', options.marginBottom.toString());
  if (hasValue(options.marginLeft)) params.append('marginLeft', options.marginLeft.toString());
  if (hasValue(options.padding)) params.append('padding', options.padding.toString());
  if (hasValue(options.paddingTop)) params.append('paddingTop', options.paddingTop.toString());
  if (hasValue(options.paddingRight))
    params.append('paddingRight', options.paddingRight.toString());
  if (hasValue(options.paddingBottom))
    params.append('paddingBottom', options.paddingBottom.toString());
  if (hasValue(options.paddingLeft)) params.append('paddingLeft', options.paddingLeft.toString());

  // Expand options
  if (options.expand?.mode) params.append('expand.mode', options.expand.mode);
  if (hasValue(options.expand?.seed)) params.append('expand.seed', options.expand.seed.toString());

  // Export options
  if (hasValue(options.export?.dpi)) params.append('export.dpi', options.export.dpi.toString());
  if (options.export?.format) params.append('export.format', options.export.format);

  // Output options
  if (hasValue(options.outputImageMimeType))
    params.append('outputImageMimeType', options.outputImageMimeType);
  if (hasValue(options.maxWidth)) params.append('maxWidth', options.maxWidth.toString());
  if (hasValue(options.maxHeight)) params.append('maxHeight', options.maxHeight.toString());
  if (hasValue(options.outputSize)) params.append('outputSize', options.outputSize);
  if (hasValue(options.sizeWidth)) params.append('sizeWidth', options.sizeWidth.toString());
  if (hasValue(options.sizeHeight)) params.append('sizeHeight', options.sizeHeight.toString());
}

function addOptionsToFormData(form: FormData, options: ImageEditingOptions): void {
  if (options.templateId) form.append('templateId', options.templateId);
  if (options.upscaleMode) form.append('upscale.mode', options.upscaleMode);
  if (options.removeBackground !== undefined)
    form.append('removeBackground', options.removeBackground.toString());

  // Background options
  if (options.background?.color) form.append('background.color', options.background.color);
  if (options.background?.imageUrl) form.append('background.imageUrl', options.background.imageUrl);
  if (options.background?.imageFile)
    form.append('background.guidance.imageFile', createReadStream(options.background.imageFile));
  if (options.background?.guidanceImageUrl)
    form.append('background.guidance.imageUrl', options.background.guidanceImageUrl);
  if (hasValue(options.background?.guidanceScale))
    form.append('background.guidance.scale', options.background.guidanceScale.toString());
  if (options.background?.prompt) form.append('background.prompt', options.background.prompt);
  if (options.background?.negativePrompt)
    form.append('background.negativePrompt', options.background.negativePrompt);
  if (options.background?.expandPrompt)
    form.append('background.expandPrompt', options.background.expandPrompt);
  if (options.background?.scaling) form.append('background.scaling', options.background.scaling);
  if (hasValue(options.background?.seed))
    form.append('background.seed', options.background.seed.toString());

  // Layout options
  if (options.scaling) form.append('scaling', options.scaling);
  if (options.horizontalAlignment) form.append('horizontalAlignment', options.horizontalAlignment);
  if (options.verticalAlignment) form.append('verticalAlignment', options.verticalAlignment);
  if (options.keepExistingAlphaChannel)
    form.append('keepExistingAlphaChannel', options.keepExistingAlphaChannel);
  if (options.ignorePaddingAndSnapOnCroppedSides !== undefined)
    form.append(
      'ignorePaddingAndSnapOnCroppedSides',
      options.ignorePaddingAndSnapOnCroppedSides.toString()
    );
  if (options.lightingMode) form.append('lighting.mode', options.lightingMode);
  if (options.referenceBox) form.append('referenceBox', options.referenceBox);
  if (options.shadowMode) form.append('shadow.mode', options.shadowMode);
  if (options.textRemovalMode) form.append('textRemoval.mode', options.textRemovalMode);

  // Spacing options
  if (hasValue(options.margin)) form.append('margin', options.margin.toString());
  if (hasValue(options.marginTop)) form.append('marginTop', options.marginTop.toString());
  if (hasValue(options.marginRight)) form.append('marginRight', options.marginRight.toString());
  if (hasValue(options.marginBottom)) form.append('marginBottom', options.marginBottom.toString());
  if (hasValue(options.marginLeft)) form.append('marginLeft', options.marginLeft.toString());
  if (hasValue(options.padding)) form.append('padding', options.padding.toString());
  if (hasValue(options.paddingTop)) form.append('paddingTop', options.paddingTop.toString());
  if (hasValue(options.paddingRight)) form.append('paddingRight', options.paddingRight.toString());
  if (hasValue(options.paddingBottom))
    form.append('paddingBottom', options.paddingBottom.toString());
  if (hasValue(options.paddingLeft)) form.append('paddingLeft', options.paddingLeft.toString());

  // Expand options
  if (options.expand?.mode) form.append('expand.mode', options.expand.mode);
  if (hasValue(options.expand?.seed)) form.append('expand.seed', options.expand.seed.toString());

  // Export options
  if (hasValue(options.export?.dpi)) form.append('export.dpi', options.export.dpi.toString());
  if (options.export?.format) form.append('export.format', options.export.format);

  // Output options
  if (hasValue(options.outputImageMimeType))
    form.append('outputImageMimeType', options.outputImageMimeType);
  if (hasValue(options.maxWidth)) form.append('maxWidth', options.maxWidth.toString());
  if (hasValue(options.maxHeight)) form.append('maxHeight', options.maxHeight.toString());
  if (hasValue(options.outputSize)) form.append('outputSize', options.outputSize);
  if (hasValue(options.sizeWidth)) form.append('sizeWidth', options.sizeWidth.toString());
  if (hasValue(options.sizeHeight)) form.append('sizeHeight', options.sizeHeight.toString());
}

export async function saveProcessedImageEditing(
  originalPath: string,
  processedData: Buffer,
  options: ImageEditingOptions,
  conflictState: ConflictState
): Promise<string | null> {
  const extension = options.export?.format || 'png';
  const baseName = basename(originalPath, `.${basename(originalPath).split('.').pop()}`);
  const fileName = `${baseName}_edited.${extension}`;

  // Use output directory if specified, otherwise current directory
  const outputDir = options.outputDir || '.';
  const outputPath = join(outputDir, fileName);

  // Create output directory if it doesn't exist
  if (options.outputDir) {
    await fs.mkdir(outputDir, { recursive: true });
  }

  // Handle file conflicts
  const resolution = await handleFileConflict(outputPath, conflictState);

  if (resolution.action === 'cancel') {
    return null; // Operation cancelled
  }

  const finalPath = resolution.newPath;
  if (!finalPath) {
    throw new Error('No output path provided');
  }
  await fs.writeFile(finalPath, processedData);

  // Return relative path from current working directory
  return relative(process.cwd(), finalPath);
}

export async function getAccountDetails(): Promise<AccountResponse | AccountErrorResponse> {
  const activeKey = await getActiveApiKey();

  if (!activeKey) {
    throw new Error('No active API key found. Please add and activate an API key first.');
  }

  try {
    const url = 'https://image-api.photoroom.com/v1/account';
    const headers = {
      Accept: 'application/json',
      'x-api-key': activeKey.data.key
    };

    debugLogRequest(url, 'GET', headers);
    logCurlCommand(url, 'GET', headers);

    // Return mock response in dry-run mode
    if (isDryRunEnabled()) {
      return {
        credits: {
          available: 100,
          subscription: 1000
        }
      } as AccountResponse;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    const data = await response.json();

    // Convert Headers to plain object for debugging
    const responseHeaders: Record<string, unknown> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    debugLogResponse(response.status, responseHeaders, data);

    if (response.ok) {
      return data as AccountResponse;
    }
    return data as AccountErrorResponse;
  } catch (error) {
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
