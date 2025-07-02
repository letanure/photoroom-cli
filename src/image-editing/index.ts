import type { ImageEditingOptions } from '../shared/api-client.js';
import { processImages } from '../shared/image-processor.js';
import { processImageEditing } from './action.js';
import { askImageEditingParams, type ImageEditingParams } from './questions.js';

export async function imageEditing() {
  try {
    const params = await askImageEditingParams();

    // Extract image sources based on the selection
    let imagePaths: string[] = [];
    // biome-ignore lint/suspicious/noExplicitAny: Required for flexible parameter interface
    const p = params as any;
    if (p.imageSource === 'file' && p.imageFiles) {
      imagePaths = p.imageFiles;
    } else if (p.imageSource === 'url' && p.imageUrl) {
      imagePaths = [p.imageUrl];
    }

    if (imagePaths.length === 0) {
      console.error('❌ No images provided for processing');
      return;
    }

    // Transform the question responses into API options
    const options: ImageEditingOptions = transformToApiOptions(params);

    // Process images using generic processor
    await processImages(imagePaths, options, processImageEditing);
  } catch (error) {
    console.error('❌ Failed to process image editing request:', error);
  }
}

function transformToApiOptions(params: ImageEditingParams): ImageEditingOptions {
  const options: ImageEditingOptions = {};
  // Type assertion for easier access to properties
  // biome-ignore lint/suspicious/noExplicitAny: Required for flexible parameter interface
  const p = params as any;

  // Set output directory
  if (p.outputDir) {
    options.outputDir = p.outputDir;
  }

  // Template and upscaling
  if (p.templateId) options.templateId = p.templateId;
  if (p.upscaleMode) options.upscaleMode = p.upscaleMode;

  // Background removal
  if (p.removeBackground !== undefined) {
    options.removeBackground = p.removeBackground;
  }

  // Background configuration
  if (p.background) {
    options.background = {};
    if (p.background.color) options.background.color = p.background.color;
    if (p.background.imageUrl) options.background.imageUrl = p.background.imageUrl;
    if (p.background.imageFile) options.background.imageFile = p.background.imageFile;
    if (p.background.guidanceImageUrl)
      options.background.guidanceImageUrl = p.background.guidanceImageUrl;
    if (p.background.guidanceScale !== undefined)
      options.background.guidanceScale = Number(p.background.guidanceScale);
    if (p.background.prompt) options.background.prompt = p.background.prompt;
    if (p.background.negativePrompt)
      options.background.negativePrompt = p.background.negativePrompt;
    if (p.background.expandPrompt) options.background.expandPrompt = p.background.expandPrompt;
    if (p.background.scaling) options.background.scaling = p.background.scaling;
    if (p.background.seed !== undefined) options.background.seed = Number(p.background.seed);
  }

  // Layout and positioning
  if (p.layout) {
    if (p.layout.scaling) options.scaling = p.layout.scaling;
    if (p.layout.horizontalAlignment) options.horizontalAlignment = p.layout.horizontalAlignment;
    if (p.layout.verticalAlignment) options.verticalAlignment = p.layout.verticalAlignment;
    if (p.layout.keepExistingAlphaChannel)
      options.keepExistingAlphaChannel = p.layout.keepExistingAlphaChannel;
    if (p.layout.ignorePaddingAndSnapOnCroppedSides !== undefined)
      options.ignorePaddingAndSnapOnCroppedSides = p.layout.ignorePaddingAndSnapOnCroppedSides;
    if (p.layout.lightingMode) options.lightingMode = p.layout.lightingMode;
    if (p.layout.referenceBox) options.referenceBox = p.layout.referenceBox;
    if (p.layout.shadowMode) options.shadowMode = p.layout.shadowMode;
    if (p.layout.textRemovalMode) options.textRemovalMode = p.layout.textRemovalMode;
  }

  // Margins - handle both uniform and individual
  if (p.margin) {
    options.margin = p.margin;
  }
  if (p.margins) {
    if (p.margins.marginTop) options.marginTop = p.margins.marginTop;
    if (p.margins.marginRight) options.marginRight = p.margins.marginRight;
    if (p.margins.marginBottom) options.marginBottom = p.margins.marginBottom;
    if (p.margins.marginLeft) options.marginLeft = p.margins.marginLeft;
  }

  // Padding - handle both uniform and individual
  if (p.padding) {
    if (typeof p.padding === 'string') {
      options.padding = p.padding;
    } else {
      // Individual padding
      if (p.padding.paddingTop) options.paddingTop = p.padding.paddingTop;
      if (p.padding.paddingRight) options.paddingRight = p.padding.paddingRight;
      if (p.padding.paddingBottom) options.paddingBottom = p.padding.paddingBottom;
      if (p.padding.paddingLeft) options.paddingLeft = p.padding.paddingLeft;
    }
  }

  // Expand configuration
  if (p.expand) {
    options.expand = {};
    if (p.expand.mode) options.expand.mode = p.expand.mode;
    if (p.expand.seed !== undefined) options.expand.seed = Number(p.expand.seed);
  }

  // Export configuration
  if (p.export) {
    options.export = {};
    if (p.export.dpi !== undefined) options.export.dpi = Number(p.export.dpi);
    if (p.export.format) options.export.format = p.export.format;
  }

  // Output configuration
  if (p.output) {
    if (p.output.outputImageMimeType) options.outputImageMimeType = p.output.outputImageMimeType;
    if (p.output.maxWidth !== undefined) options.maxWidth = Number(p.output.maxWidth);
    if (p.output.maxHeight !== undefined) options.maxHeight = Number(p.output.maxHeight);
    if (p.output.outputSize) options.outputSize = p.output.outputSize;
    if (p.output.sizeWidth !== undefined) options.sizeWidth = Number(p.output.sizeWidth);
    if (p.output.sizeHeight !== undefined) options.sizeHeight = Number(p.output.sizeHeight);
  }

  return options;
}
