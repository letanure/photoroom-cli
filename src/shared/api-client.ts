import { createReadStream, promises as fs } from 'node:fs';
import { basename, join, relative } from 'node:path';
import FormData from 'form-data';
import { getActiveApiKey } from './config-manager.js';
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

    const response = await fetch(`https://image-api.photoroom.com/v2/edit?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'image/png, application/json',
        'x-api-key': apiKey
      }
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

    const request = form.submit(
      {
        protocol: 'https:',
        hostname: 'image-api.photoroom.com',
        path: '/v2/edit',
        headers: {
          Accept: 'image/png, application/json',
          'x-api-key': apiKey
        }
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
  if (response.status === 200) {
    const data = Buffer.from(await response.arrayBuffer());

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
    const errorData = (await response.json()) as ApiErrorResponse;
    const errorMessage = getErrorMessage(response.status, errorData);

    return {
      success: false,
      error: errorMessage,
      detail: errorData.detail,
      type: errorData.type,
      statusCode: errorData.status_code
    };
  } catch {
    return {
      success: false,
      error: `HTTP ${response.status}: ${(await response.text()) || 'Unknown error'}`,
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
  if (options.background?.guidanceScale !== undefined)
    params.append('background.guidance.scale', options.background.guidanceScale.toString());
  if (options.background?.prompt) params.append('background.prompt', options.background.prompt);
  if (options.background?.negativePrompt)
    params.append('background.negativePrompt', options.background.negativePrompt);
  if (options.background?.expandPrompt)
    params.append('background.expandPrompt', options.background.expandPrompt);
  if (options.background?.scaling) params.append('background.scaling', options.background.scaling);
  if (options.background?.seed !== undefined)
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
  if (options.margin !== undefined) params.append('margin', options.margin.toString());
  if (options.marginTop !== undefined) params.append('marginTop', options.marginTop.toString());
  if (options.marginRight !== undefined)
    params.append('marginRight', options.marginRight.toString());
  if (options.marginBottom !== undefined)
    params.append('marginBottom', options.marginBottom.toString());
  if (options.marginLeft !== undefined) params.append('marginLeft', options.marginLeft.toString());
  if (options.padding !== undefined) params.append('padding', options.padding.toString());
  if (options.paddingTop !== undefined) params.append('paddingTop', options.paddingTop.toString());
  if (options.paddingRight !== undefined)
    params.append('paddingRight', options.paddingRight.toString());
  if (options.paddingBottom !== undefined)
    params.append('paddingBottom', options.paddingBottom.toString());
  if (options.paddingLeft !== undefined)
    params.append('paddingLeft', options.paddingLeft.toString());

  // Expand options
  if (options.expand?.mode) params.append('expand.mode', options.expand.mode);
  if (options.expand?.seed !== undefined)
    params.append('expand.seed', options.expand.seed.toString());

  // Export options
  if (options.export?.dpi !== undefined) params.append('export.dpi', options.export.dpi.toString());
  if (options.export?.format) params.append('export.format', options.export.format);

  // Output options
  if (options.outputImageMimeType)
    params.append('outputImageMimeType', options.outputImageMimeType);
  if (options.maxWidth !== undefined) params.append('maxWidth', options.maxWidth.toString());
  if (options.maxHeight !== undefined) params.append('maxHeight', options.maxHeight.toString());
  if (options.outputSize) params.append('outputSize', options.outputSize);
  if (options.sizeWidth !== undefined) params.append('sizeWidth', options.sizeWidth.toString());
  if (options.sizeHeight !== undefined) params.append('sizeHeight', options.sizeHeight.toString());
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
  if (options.background?.guidanceScale !== undefined)
    form.append('background.guidance.scale', options.background.guidanceScale.toString());
  if (options.background?.prompt) form.append('background.prompt', options.background.prompt);
  if (options.background?.negativePrompt)
    form.append('background.negativePrompt', options.background.negativePrompt);
  if (options.background?.expandPrompt)
    form.append('background.expandPrompt', options.background.expandPrompt);
  if (options.background?.scaling) form.append('background.scaling', options.background.scaling);
  if (options.background?.seed !== undefined)
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
  if (options.margin !== undefined) form.append('margin', options.margin.toString());
  if (options.marginTop !== undefined) form.append('marginTop', options.marginTop.toString());
  if (options.marginRight !== undefined) form.append('marginRight', options.marginRight.toString());
  if (options.marginBottom !== undefined)
    form.append('marginBottom', options.marginBottom.toString());
  if (options.marginLeft !== undefined) form.append('marginLeft', options.marginLeft.toString());
  if (options.padding !== undefined) form.append('padding', options.padding.toString());
  if (options.paddingTop !== undefined) form.append('paddingTop', options.paddingTop.toString());
  if (options.paddingRight !== undefined)
    form.append('paddingRight', options.paddingRight.toString());
  if (options.paddingBottom !== undefined)
    form.append('paddingBottom', options.paddingBottom.toString());
  if (options.paddingLeft !== undefined) form.append('paddingLeft', options.paddingLeft.toString());

  // Expand options
  if (options.expand?.mode) form.append('expand.mode', options.expand.mode);
  if (options.expand?.seed !== undefined)
    form.append('expand.seed', options.expand.seed.toString());

  // Export options
  if (options.export?.dpi !== undefined) form.append('export.dpi', options.export.dpi.toString());
  if (options.export?.format) form.append('export.format', options.export.format);

  // Output options
  if (options.outputImageMimeType) form.append('outputImageMimeType', options.outputImageMimeType);
  if (options.maxWidth !== undefined) form.append('maxWidth', options.maxWidth.toString());
  if (options.maxHeight !== undefined) form.append('maxHeight', options.maxHeight.toString());
  if (options.outputSize) form.append('outputSize', options.outputSize);
  if (options.sizeWidth !== undefined) form.append('sizeWidth', options.sizeWidth.toString());
  if (options.sizeHeight !== undefined) form.append('sizeHeight', options.sizeHeight.toString());
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
    const response = await fetch('https://image-api.photoroom.com/v1/account', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-api-key': activeKey.data.key
      }
    });

    const data = await response.json();

    if (response.ok) {
      return data as AccountResponse;
    }
    return data as AccountErrorResponse;
  } catch (error) {
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
