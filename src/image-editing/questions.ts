import type { Question } from '../shared/question-handler.js';

// Common editing questions that apply to both URL and file inputs
const commonEditingQuestions: Question[] = [
  {
    type: 'input',
    name: 'outputDir',
    label: 'Output directory',
    hint: 'Directory to save edited images',
    required: true,
    default: 'output'
  },
  // removeBackground
  // If enabled (default), the background of the image will be removed using PhotoRoom's award-winning algorithm
  {
    type: 'confirm',
    name: 'removeBackground',
    label: 'Remove background?',
    hint: 'Remove the background using PhotoRoom algorithm',
    default: true
  },
  // background.imageUrl
  // URL of the image to use as a background.
  // Can't be provided if removeBackground is set to false
  {
    type: 'input',
    name: 'background.imageUrl',
    label: 'Background image URL',
    hint: 'URL of image to use as background (max 30MB)',
    required: false,
    condition: (answers) => answers.removeBackground === true,
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      try {
        const url = new URL(value);

        // Check if URL has image extension
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff'];
        const pathname = url.pathname.toLowerCase();
        const hasImageExtension = imageExtensions.some((ext) => pathname.endsWith(ext));

        if (hasImageExtension) {
          return true;
        }

        return 'URL must end with an image extension (.jpg, .png, .gif, .webp, etc.)';
      } catch {
        return 'Must be a valid URL';
      }
    }
  },
  // background.color
  // Color of the background. If omitted, background will be transparent unless background.imageUrl or background.imageFile is provided
  {
    type: 'input',
    name: 'background.color',
    label: 'Background color',
    hint: 'Hex color (FF0000, #FF0000) or color name (red, blue)',
    required: false,
    default: 'transparent',
    condition: (answers) => answers.removeBackground === true && !answers['background.imageUrl'],
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const trimmedValue = value.trim();

      // Check for 'transparent'
      if (trimmedValue.toLowerCase() === 'transparent') return true;

      // Check hex format (with or without #, 6 or 8 characters)
      const hexPattern = /^#?[A-Fa-f0-9]{6}([A-Fa-f0-9]{2})?$/;
      if (hexPattern.test(trimmedValue)) return true;

      // Check common color names
      const colorNames = [
        'red',
        'green',
        'blue',
        'yellow',
        'orange',
        'purple',
        'pink',
        'black',
        'white',
        'gray',
        'grey',
        'brown',
        'cyan',
        'magenta',
        'lime',
        'navy',
        'teal',
        'silver',
        'maroon',
        'olive'
      ];

      if (colorNames.includes(trimmedValue.toLowerCase())) return true;

      return 'Must be a hex color (FF0000, #FF0000) or color name (red, blue, etc.)';
    }
  },
  // background.imageFile
  // Local image file to use as background
  // If background.imageUrl is provided, neither background.imageFile nor background.prompt can be provided
  {
    type: 'input',
    name: 'background.imageFile',
    label: 'Background image file path',
    hint: 'Local image file to use as background',
    required: false,
    condition: (answers) =>
      answers.removeBackground === true &&
      !answers['background.imageUrl'] &&
      !answers['background.color']
  },
  // background.prompt
  // Text prompt to generate background
  // If background.imageUrl is provided, neither background.imageFile nor background.prompt can be provided
  {
    type: 'input',
    name: 'background.prompt',
    label: 'Background prompt',
    hint: 'Text prompt to generate background with AI',
    required: false,
    condition: (answers) =>
      answers.removeBackground === true &&
      !answers['background.imageUrl'] &&
      !answers['background.color'] &&
      !answers['background.imageFile']
  },
  // background.expandPrompt
  // If ai.auto, a pre-processing step is applied to expand the prompt into a longer form
  {
    type: 'select',
    name: 'background.expandPrompt',
    label: 'Expand background prompt?',
    hint: 'AI preprocessing to expand prompt into longer form',
    choices: [
      { message: 'Auto (AI expands prompt)', name: 'ai.auto', value: 'ai.auto' },
      { message: 'Use as-is', name: 'none', value: '' }
    ],
    default: 'ai.auto',
    required: false,
    condition: (answers) => !!answers['background.prompt']
  },
  // background.seed
  // Seed used to generate the background. Can be used to get similar looking results for the same prompt
  {
    type: 'input',
    name: 'background.seed',
    label: 'Background generation seed',
    hint: 'Seed for consistent background generation results',
    required: false,
    condition: (answers) => !!answers['background.prompt'],
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK
      const num = Number(value);
      return Number.isNaN(num) ? 'Must be a valid number' : true;
    }
  },
  // background.guidance.imageUrl
  // URL of the image to use as a background image guidance
  // Can't be provided if removeBackground is set to false
  {
    type: 'input',
    name: 'background.guidance.imageUrl',
    label: 'Background guidance image URL',
    hint: 'URL of image for background guidance (max 30MB)',
    required: false,
    condition: (answers) => answers.removeBackground === true,
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      try {
        const url = new URL(value);

        // Check if URL has image extension
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff'];
        const pathname = url.pathname.toLowerCase();
        const hasImageExtension = imageExtensions.some((ext) => pathname.endsWith(ext));

        if (hasImageExtension) {
          return true;
        }

        return 'URL must end with an image extension (.jpg, .png, .gif, .webp, etc.)';
      } catch {
        return 'Must be a valid URL';
      }
    }
  },
  // background.guidance.imageFile
  // Bytes of the image to use as a background image guidance. Only available in the POST request
  // Can't be provided if removeBackground is set to false
  {
    type: 'input',
    name: 'background.guidance.imageFile',
    label: 'Background guidance image file',
    hint: 'Local image file for background guidance (max 30MB)',
    required: false,
    condition: (answers) => answers.removeBackground === true
  },
  // background.guidance.scale
  // How closely the generated background will be matching the guiding image, between 0 and 1
  {
    type: 'input',
    name: 'background.guidance.scale',
    label: 'Background guidance scale',
    hint: 'How closely to match guidance image (0-1, 0=ignore, 1=match closely)',
    required: false,
    default: '0.6',
    condition: (answers) =>
      !!answers['background.guidance.imageUrl'] || !!answers['background.guidance.imageFile'],
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const num = Number(value);
      if (Number.isNaN(num)) {
        return 'Must be a valid number';
      }
      if (num < 0 || num > 1) {
        return 'Must be between 0 and 1';
      }
      return true;
    }
  },
  // background.scaling
  // Whether the background should fit or fill (default) the output image
  // If set to fit, the empty pixels will be transparent
  {
    type: 'select',
    name: 'background.scaling',
    label: 'Background scaling',
    hint: 'How background should fit in output image',
    choices: [
      { message: 'Fill (scale to cover entire image)', name: 'fill', value: 'fill' },
      { message: 'Fit (scale to fit, transparent pixels)', name: 'fit', value: 'fit' }
    ],
    default: 'fill',
    required: false,
    condition: (answers) =>
      answers.removeBackground === true &&
      (!!answers['background.imageUrl'] || !!answers['background.imageFile'])
  },
  // expand.mode
  // Expand mode to use on the main image used by the API.
  // If set to ai.auto, all transparent pixels will automatically be filled based on the content of the current background
  {
    type: 'confirm',
    name: 'expand.mode',
    label: 'Enable expand mode?',
    hint: 'AI fills transparent pixels based on background content',
    default: false
  },
  // expand.seed
  // Seed used to generate the background (only when expand.mode is ai.auto)
  {
    type: 'input',
    name: 'expand.seed',
    label: 'Seed for AI expansion',
    hint: 'Seed used to generate the background',
    required: false,
    condition: (answers) => answers['expand.mode'] === true,
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK
      const num = Number(value);
      return Number.isNaN(num) ? 'Must be a valid number' : true;
    }
  },
  // export.dpi
  // The pixel density of the result image
  // Pixel density can be set to any value between 72 and 1200 dpi
  {
    type: 'input',
    name: 'export.dpi',
    label: 'Export DPI',
    hint: 'Pixel density of result image (72-1200 dpi)',
    required: false,
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const num = Number(value);
      if (Number.isNaN(num)) {
        return 'Must be a valid number';
      }
      if (num < 72 || num > 1200) {
        return 'DPI must be between 72 and 1200';
      }
      return true;
    }
  },
  // export.format
  // The format of the result image
  // Default value is "png". Jpeg exports with a quality of 80 and WebP exports with a quality of 90
  {
    type: 'select',
    name: 'export.format',
    label: 'Export format',
    hint: 'Output image format',
    choices: [
      { message: 'PNG (lossless)', name: 'png', value: 'png' },
      { message: 'JPEG (quality 80)', name: 'jpeg', value: 'jpeg' },
      { message: 'JPG (quality 80)', name: 'jpg', value: 'jpg' },
      { message: 'WebP (quality 90)', name: 'webp', value: 'webp' }
    ],
    default: 'png',
    required: false
  },
  // outputSize
  // Output size of the image. In the form of either: auto, widthxheight, originalImage, or croppedSubject
  {
    type: 'input',
    name: 'outputSize',
    label: 'Output size',
    hint: 'auto, widthxheight (200x400), originalImage, or croppedSubject',
    required: false,
    default: 'auto',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const trimmed = value.trim();

      // Check if it matches the allowed pattern: ^(auto|\d+x\d+|originalImage|croppedSubject)$
      const pattern = /^(auto|\d+x\d+|originalImage|croppedSubject)$/;

      if (pattern.test(trimmed)) {
        // Additional validation for custom dimensions (widthxheight)
        if (trimmed.includes('x') && trimmed !== 'originalImage' && trimmed !== 'croppedSubject') {
          const [width, height] = trimmed.split('x');
          const widthNum = Number(width);
          const heightNum = Number(height);

          if (Number.isNaN(widthNum) || Number.isNaN(heightNum)) {
            return 'Custom size must be in format: widthxheight (e.g., 200x400)';
          }
          if (widthNum <= 0 || heightNum <= 0) {
            return 'Width and height must be greater than 0';
          }
        }
        return true;
      }

      return 'Must be: auto, widthxheight (200x400), originalImage, or croppedSubject';
    }
  },
  // maxHeight
  // Maximum output height. Can only be provided if outputSize is originalImage or croppedSubject
  // Useful for: redimensioning while keeping the aspect ratio
  {
    type: 'input',
    name: 'maxHeight',
    label: 'Maximum height',
    hint: 'Maximum output height in pixels (maintains aspect ratio)',
    required: false,
    condition: (answers) =>
      answers.outputSize === 'originalImage' || answers.outputSize === 'croppedSubject',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const num = Number(value);
      if (Number.isNaN(num)) {
        return 'Must be a valid number';
      }
      if (num <= 0) {
        return 'Height must be greater than 0';
      }
      return true;
    }
  },
  // maxWidth
  // Maximum output width. Can only be provided if outputSize is originalImage or croppedSubject
  // Useful for: resizing an image while keeping the aspect ratio
  {
    type: 'input',
    name: 'maxWidth',
    label: 'Maximum width',
    hint: 'Maximum output width in pixels (maintains aspect ratio)',
    required: false,
    condition: (answers) =>
      answers.outputSize === 'originalImage' || answers.outputSize === 'croppedSubject',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const num = Number(value);
      if (Number.isNaN(num)) {
        return 'Must be a valid number';
      }
      if (num <= 0) {
        return 'Width must be greater than 0';
      }
      return true;
    }
  },
  // horizontalAlignment
  // [Advanced] Defines the horizontal alignment of the cutout subject within its bounding box
  // Specifying a custom horizontal alignment will implicitly set ignorePaddingAndSnapOnCroppedSides to false for the horizontal direction
  {
    type: 'select',
    name: 'horizontalAlignment',
    label: 'Horizontal alignment',
    hint: 'Horizontal alignment of subject within bounding box',
    choices: [
      { message: 'Left', name: 'left', value: 'left' },
      { message: 'Center', name: 'center', value: 'center' },
      { message: 'Right', name: 'right', value: 'right' }
    ],
    required: false
  },
  // verticalAlignment
  // [Advanced] Defines the vertical alignment of the cutout subject within its bounding box
  // Specifying a custom vertical alignment will implicitly set ignorePaddingAndSnapOnCroppedSides to false for the vertical direction
  {
    type: 'select',
    name: 'verticalAlignment',
    label: 'Vertical alignment',
    hint: 'Vertical alignment of subject within bounding box',
    choices: [
      { message: 'Top', name: 'top', value: 'top' },
      { message: 'Center', name: 'center', value: 'center' },
      { message: 'Bottom', name: 'bottom', value: 'bottom' }
    ],
    required: false
  },
  // ignorePaddingAndSnapOnCroppedSides
  // If set to true (default), cropped sides of the subject will snap to the edges
  // For instance, for a portrait image cropped below the elbows, the subject will be aligned at the bottom even if a bottom padding is provided
  // Can't be provided if removeBackground is set to false
  {
    type: 'confirm',
    name: 'ignorePaddingAndSnapOnCroppedSides',
    label: 'Snap cropped sides to edges?',
    hint: 'Cropped sides of subject snap to edges (ignores padding on cropped sides)',
    default: true,
    condition: (answers) => answers.removeBackground === true
  },
  // keepExistingAlphaChannel
  // If set to auto and if the image has transparency, the existing transparency will be used to cutout the subject
  {
    type: 'select',
    name: 'keepExistingAlphaChannel',
    label: 'Keep existing alpha channel?',
    hint: 'Use existing transparency for subject cutout',
    choices: [
      { message: 'Auto (use if available)', name: 'auto', value: 'auto' },
      { message: 'Never (ignore existing)', name: 'never', value: 'never' }
    ],
    default: 'never',
    required: false
  },
  // lighting.mode
  // Lighting mode to use on the main image used by the API
  // If set to ai.auto, the lighting will be automatically adjusted
  {
    type: 'confirm',
    name: 'lighting.mode',
    label: 'Enable automatic lighting adjustment?',
    hint: 'AI automatically adjusts lighting on the main image',
    default: false
  },
  // Margin settings
  {
    type: 'confirm',
    name: 'setMargins',
    label: 'Set margins?',
    hint: 'Add margin around the subject',
    default: false
  },
  {
    type: 'select',
    name: 'marginStyle',
    label: 'Margin style',
    hint: 'How to set margins',
    choices: [
      { message: 'All sides same', name: 'uniform', value: 'uniform' },
      { message: 'Individual sides', name: 'individual', value: 'individual' }
    ],
    default: 'uniform',
    condition: (answers) => answers.setMargins === true
  },
  // margin
  // General margin around the subject. Can be expressed as a number between 0 and 0.49, a percentage string between 0% and 49%, or a pixel value string
  // Unlike padding, margin is never ignored even on cropped sides of the subject
  {
    type: 'input',
    name: 'margin',
    label: 'Margin (all sides)',
    hint: 'Number (0-0.49), percentage (0%-49%), or pixels (100px)',
    required: false,
    default: '0',
    condition: (answers) => answers.setMargins === true && answers.marginStyle === 'uniform',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const trimmed = value.trim();

      // Check percentage format (0%-49%)
      if (trimmed.endsWith('%')) {
        const num = Number(trimmed.slice(0, -1));
        if (!Number.isNaN(num) && num >= 0 && num <= 49) {
          return true;
        }
        return 'Percentage must be between 0% and 49%';
      }

      // Check pixel format (e.g., "100px")
      if (trimmed.endsWith('px')) {
        const num = Number(trimmed.slice(0, -2));
        if (!Number.isNaN(num) && num >= 0) {
          return true;
        }
        return 'Pixel value must be a positive number followed by "px"';
      }

      // Check number format (0-0.49)
      const num = Number(trimmed);
      if (!Number.isNaN(num)) {
        if (num >= 0 && num <= 0.49) {
          return true;
        }
        return 'Number must be between 0 and 0.49';
      }

      return 'Must be a number (0-0.49), percentage (0%-49%), or pixels (100px)';
    }
  },
  // Individual margin questions
  // marginTop
  // Top Margin, overrides general margin on the top side. Accepts the same formats as margin
  {
    type: 'input',
    name: 'marginTop',
    label: 'Top margin',
    hint: 'Number (0-0.49), percentage (0%-49%), or pixels (100px)',
    required: false,
    condition: (answers) => answers.setMargins === true && answers.marginStyle === 'individual',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const trimmed = value.trim();

      // Check percentage format (0%-49%)
      if (trimmed.endsWith('%')) {
        const num = Number(trimmed.slice(0, -1));
        if (!Number.isNaN(num) && num >= 0 && num <= 49) {
          return true;
        }
        return 'Percentage must be between 0% and 49%';
      }

      // Check pixel format (e.g., "100px")
      if (trimmed.endsWith('px')) {
        const num = Number(trimmed.slice(0, -2));
        if (!Number.isNaN(num) && num >= 0) {
          return true;
        }
        return 'Pixel value must be a positive number followed by "px"';
      }

      // Check number format (0-0.49)
      const num = Number(trimmed);
      if (!Number.isNaN(num)) {
        if (num >= 0 && num <= 0.49) {
          return true;
        }
        return 'Number must be between 0 and 0.49';
      }

      return 'Must be a number (0-0.49), percentage (0%-49%), or pixels (100px)';
    }
  },
  // marginRight
  // Right Margin, overrides general margin on the right side. Accepts the same formats as margin
  {
    type: 'input',
    name: 'marginRight',
    label: 'Right margin',
    hint: 'Number (0-0.49), percentage (0%-49%), or pixels (100px)',
    required: false,
    condition: (answers) => answers.setMargins === true && answers.marginStyle === 'individual',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const trimmed = value.trim();

      // Check percentage format (0%-49%)
      if (trimmed.endsWith('%')) {
        const num = Number(trimmed.slice(0, -1));
        if (!Number.isNaN(num) && num >= 0 && num <= 49) {
          return true;
        }
        return 'Percentage must be between 0% and 49%';
      }

      // Check pixel format (e.g., "100px")
      if (trimmed.endsWith('px')) {
        const num = Number(trimmed.slice(0, -2));
        if (!Number.isNaN(num) && num >= 0) {
          return true;
        }
        return 'Pixel value must be a positive number followed by "px"';
      }

      // Check number format (0-0.49)
      const num = Number(trimmed);
      if (!Number.isNaN(num)) {
        if (num >= 0 && num <= 0.49) {
          return true;
        }
        return 'Number must be between 0 and 0.49';
      }

      return 'Must be a number (0-0.49), percentage (0%-49%), or pixels (100px)';
    }
  },
  // marginBottom
  // Bottom Margin, overrides general margin on the bottom side. Accepts the same formats as margin
  {
    type: 'input',
    name: 'marginBottom',
    label: 'Bottom margin',
    hint: 'Number (0-0.49), percentage (0%-49%), or pixels (100px)',
    required: false,
    condition: (answers) => answers.setMargins === true && answers.marginStyle === 'individual',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const trimmed = value.trim();

      // Check percentage format (0%-49%)
      if (trimmed.endsWith('%')) {
        const num = Number(trimmed.slice(0, -1));
        if (!Number.isNaN(num) && num >= 0 && num <= 49) {
          return true;
        }
        return 'Percentage must be between 0% and 49%';
      }

      // Check pixel format (e.g., "100px")
      if (trimmed.endsWith('px')) {
        const num = Number(trimmed.slice(0, -2));
        if (!Number.isNaN(num) && num >= 0) {
          return true;
        }
        return 'Pixel value must be a positive number followed by "px"';
      }

      // Check number format (0-0.49)
      const num = Number(trimmed);
      if (!Number.isNaN(num)) {
        if (num >= 0 && num <= 0.49) {
          return true;
        }
        return 'Number must be between 0 and 0.49';
      }

      return 'Must be a number (0-0.49), percentage (0%-49%), or pixels (100px)';
    }
  },
  // marginLeft
  // Left Margin, overrides general margin on the left side. Accepts the same formats as margin
  {
    type: 'input',
    name: 'marginLeft',
    label: 'Left margin',
    hint: 'Number (0-0.49), percentage (0%-49%), or pixels (100px)',
    required: false,
    condition: (answers) => answers.setMargins === true && answers.marginStyle === 'individual',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const trimmed = value.trim();

      // Check percentage format (0%-49%)
      if (trimmed.endsWith('%')) {
        const num = Number(trimmed.slice(0, -1));
        if (!Number.isNaN(num) && num >= 0 && num <= 49) {
          return true;
        }
        return 'Percentage must be between 0% and 49%';
      }

      // Check pixel format (e.g., "100px")
      if (trimmed.endsWith('px')) {
        const num = Number(trimmed.slice(0, -2));
        if (!Number.isNaN(num) && num >= 0) {
          return true;
        }
        return 'Pixel value must be a positive number followed by "px"';
      }

      // Check number format (0-0.49)
      const num = Number(trimmed);
      if (!Number.isNaN(num)) {
        if (num >= 0 && num <= 0.49) {
          return true;
        }
        return 'Number must be between 0 and 0.49';
      }

      return 'Must be a number (0-0.49), percentage (0%-49%), or pixels (100px)';
    }
  },
  // Padding settings
  {
    type: 'confirm',
    name: 'setPadding',
    label: 'Set padding?',
    hint: 'Add padding around the subject',
    default: false
  },
  {
    type: 'select',
    name: 'paddingStyle',
    label: 'Padding style',
    hint: 'How to set padding',
    choices: [
      { message: 'All sides same', name: 'uniform', value: 'uniform' },
      { message: 'Individual sides', name: 'individual', value: 'individual' }
    ],
    default: 'uniform',
    condition: (answers) => answers.setPadding === true
  },
  // padding
  // General padding around the subject. Can be expressed as a number between 0 and 0.49, a percentage string between 0% and 49%, or a pixel value string
  // Unlike margin, padding will be ignored on cropped sides of the subject if that option is enabled
  {
    type: 'input',
    name: 'padding',
    label: 'Padding (all sides)',
    hint: 'Number (0-0.49), percentage (0%-49%), or pixels (100px)',
    required: false,
    default: '0',
    condition: (answers) => answers.setPadding === true && answers.paddingStyle === 'uniform',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const trimmed = value.trim();

      // Check percentage format (0%-49%)
      if (trimmed.endsWith('%')) {
        const num = Number(trimmed.slice(0, -1));
        if (!Number.isNaN(num) && num >= 0 && num <= 49) {
          return true;
        }
        return 'Percentage must be between 0% and 49%';
      }

      // Check pixel format (e.g., "100px")
      if (trimmed.endsWith('px')) {
        const num = Number(trimmed.slice(0, -2));
        if (!Number.isNaN(num) && num >= 0) {
          return true;
        }
        return 'Pixel value must be a positive number followed by "px"';
      }

      // Check number format (0-0.49)
      const num = Number(trimmed);
      if (!Number.isNaN(num)) {
        if (num >= 0 && num <= 0.49) {
          return true;
        }
        return 'Number must be between 0 and 0.49';
      }

      return 'Must be a number (0-0.49), percentage (0%-49%), or pixels (100px)';
    }
  },
  // paddingTop
  {
    type: 'input',
    name: 'paddingTop',
    label: 'Top padding',
    hint: 'Number (0-0.49), percentage (0%-49%), or pixels (100px)',
    required: false,
    condition: (answers) => answers.setPadding === true && answers.paddingStyle === 'individual',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const trimmed = value.trim();

      // Check percentage format (0%-49%)
      if (trimmed.endsWith('%')) {
        const num = Number(trimmed.slice(0, -1));
        if (!Number.isNaN(num) && num >= 0 && num <= 49) {
          return true;
        }
        return 'Percentage must be between 0% and 49%';
      }

      // Check pixel format (e.g., "100px")
      if (trimmed.endsWith('px')) {
        const num = Number(trimmed.slice(0, -2));
        if (!Number.isNaN(num) && num >= 0) {
          return true;
        }
        return 'Pixel value must be a positive number followed by "px"';
      }

      // Check number format (0-0.49)
      const num = Number(trimmed);
      if (!Number.isNaN(num)) {
        if (num >= 0 && num <= 0.49) {
          return true;
        }
        return 'Number must be between 0 and 0.49';
      }

      return 'Must be a number (0-0.49), percentage (0%-49%), or pixels (100px)';
    }
  },
  // paddingRight
  {
    type: 'input',
    name: 'paddingRight',
    label: 'Right padding',
    hint: 'Number (0-0.49), percentage (0%-49%), or pixels (100px)',
    required: false,
    condition: (answers) => answers.setPadding === true && answers.paddingStyle === 'individual',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const trimmed = value.trim();

      // Check percentage format (0%-49%)
      if (trimmed.endsWith('%')) {
        const num = Number(trimmed.slice(0, -1));
        if (!Number.isNaN(num) && num >= 0 && num <= 49) {
          return true;
        }
        return 'Percentage must be between 0% and 49%';
      }

      // Check pixel format (e.g., "100px")
      if (trimmed.endsWith('px')) {
        const num = Number(trimmed.slice(0, -2));
        if (!Number.isNaN(num) && num >= 0) {
          return true;
        }
        return 'Pixel value must be a positive number followed by "px"';
      }

      // Check number format (0-0.49)
      const num = Number(trimmed);
      if (!Number.isNaN(num)) {
        if (num >= 0 && num <= 0.49) {
          return true;
        }
        return 'Number must be between 0 and 0.49';
      }

      return 'Must be a number (0-0.49), percentage (0%-49%), or pixels (100px)';
    }
  },
  // paddingBottom
  {
    type: 'input',
    name: 'paddingBottom',
    label: 'Bottom padding',
    hint: 'Number (0-0.49), percentage (0%-49%), or pixels (100px)',
    required: false,
    condition: (answers) => answers.setPadding === true && answers.paddingStyle === 'individual',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const trimmed = value.trim();

      // Check percentage format (0%-49%)
      if (trimmed.endsWith('%')) {
        const num = Number(trimmed.slice(0, -1));
        if (!Number.isNaN(num) && num >= 0 && num <= 49) {
          return true;
        }
        return 'Percentage must be between 0% and 49%';
      }

      // Check pixel format (e.g., "100px")
      if (trimmed.endsWith('px')) {
        const num = Number(trimmed.slice(0, -2));
        if (!Number.isNaN(num) && num >= 0) {
          return true;
        }
        return 'Pixel value must be a positive number followed by "px"';
      }

      // Check number format (0-0.49)
      const num = Number(trimmed);
      if (!Number.isNaN(num)) {
        if (num >= 0 && num <= 0.49) {
          return true;
        }
        return 'Number must be between 0 and 0.49';
      }

      return 'Must be a number (0-0.49), percentage (0%-49%), or pixels (100px)';
    }
  },
  // paddingLeft
  {
    type: 'input',
    name: 'paddingLeft',
    label: 'Left padding',
    hint: 'Number (0-0.49), percentage (0%-49%), or pixels (100px)',
    required: false,
    condition: (answers) => answers.setPadding === true && answers.paddingStyle === 'individual',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      const trimmed = value.trim();

      // Check percentage format (0%-49%)
      if (trimmed.endsWith('%')) {
        const num = Number(trimmed.slice(0, -1));
        if (!Number.isNaN(num) && num >= 0 && num <= 49) {
          return true;
        }
        return 'Percentage must be between 0% and 49%';
      }

      // Check pixel format (e.g., "100px")
      if (trimmed.endsWith('px')) {
        const num = Number(trimmed.slice(0, -2));
        if (!Number.isNaN(num) && num >= 0) {
          return true;
        }
        return 'Pixel value must be a positive number followed by "px"';
      }

      // Check number format (0-0.49)
      const num = Number(trimmed);
      if (!Number.isNaN(num)) {
        if (num >= 0 && num <= 0.49) {
          return true;
        }
        return 'Number must be between 0 and 0.49';
      }

      return 'Must be a number (0-0.49), percentage (0%-49%), or pixels (100px)';
    }
  },
  // referenceBox
  // [Advanced] subjectBox by default. When set to originalImage, the padding / margin will be around the original image and not the cropped subject
  // It can lead to the subject disappearing when scaling is set to 'fill', for instance if the subject is on the left of a landscape image and outputSize is a square
  // Most use cases don't require this option. It is useful if you'd like to maintain subject positioning in the original image
  // Can't be provided if removeBackground is set to false
  {
    type: 'select',
    name: 'referenceBox',
    label: 'Reference box for spacing',
    hint: 'How padding/margin are calculated (advanced - may cause issues with scaling)',
    choices: [
      { message: 'Subject box (around cropped subject)', name: 'subjectBox', value: 'subjectBox' },
      {
        message: 'Original image (around full image)',
        name: 'originalImage',
        value: 'originalImage'
      }
    ],
    default: 'subjectBox',
    required: false,
    condition: (answers) => answers.removeBackground === true
  },
  // scaling
  // Whether the subject should fit (default) or fill the output image
  // If set to fit, the empty pixels will be transparent
  // Can only be provided if imageUrl or imageFile is provided
  {
    type: 'select',
    name: 'scaling',
    label: 'Subject scaling',
    hint: 'How subject fits in output image',
    choices: [
      { message: 'Fit (subject fits entirely, transparent pixels)', name: 'fit', value: 'fit' },
      { message: 'Fill (subject fills image, may crop)', name: 'fill', value: 'fill' }
    ],
    default: 'fit',
    required: false,
    condition: (answers) => !!answers.imageUrl || !!answers.imageFile
  },
  // segmentation.mode
  // Controls whether or not the salient object should be kept or ignored by the segmentation model
  {
    type: 'select',
    name: 'segmentation.mode',
    label: 'Segmentation mode',
    hint: 'How segmentation model handles salient objects',
    choices: [
      { message: 'Keep salient object', name: 'keepSalientObject', value: 'keepSalientObject' },
      {
        message: 'Ignore salient object',
        name: 'ignoreSalientObject',
        value: 'ignoreSalientObject'
      }
    ],
    default: 'ignoreSalientObject',
    required: false
  },
  // segmentation.prompt
  // A textual description of what the segmentation should keep
  {
    type: 'input',
    name: 'segmentation.prompt',
    label: 'Segmentation prompt',
    hint: 'Describe what should be kept (e.g., "a red object")',
    required: false
  },
  // segmentation.negativePrompt
  // A textual description of what the segmentation should remove
  {
    type: 'input',
    name: 'segmentation.negativePrompt',
    label: 'Segmentation negative prompt',
    hint: 'Describe what should be removed (e.g., "a red object")',
    required: false
  },
  // shadow.mode
  // Shadow generation mode to use on the main image used by the API
  // If set to ai.soft, a soft shadow will be generated
  // If set to ai.hard, a hard shadow will be generated
  // If set to ai.floating, a floating shadow will be generated
  {
    type: 'select',
    name: 'shadow.mode',
    label: 'Shadow mode',
    hint: 'Type of shadow to generate',
    choices: [
      { message: 'Soft shadow', name: 'ai.soft', value: 'ai.soft' },
      { message: 'Hard shadow', name: 'ai.hard', value: 'ai.hard' },
      { message: 'Floating shadow', name: 'ai.floating', value: 'ai.floating' },
      { message: 'No shadow', name: 'none', value: '' }
    ],
    required: false
  },
  // templateId
  // The ID of the template to render
  {
    type: 'input',
    name: 'templateId',
    label: 'Template ID',
    hint: 'UUID of the template to render',
    required: false,
    validate: (value: string) => {
      if (!value || value.trim() === '') return true; // Empty is OK

      // UUID v4 format validation
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (uuidPattern.test(value.trim())) {
        return true;
      }

      return 'Must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)';
    }
  },
  // textRemoval.mode
  // Text removal mode to use on the main image used by the API
  // If set to ai.artificial, artificial text will be automatically removed (company names, watermarks, discounts, etc.)
  // If set to ai.natural, natural text will be automatically removed (writing on buildings/clothing, road signs, etc.)
  // If set to ai.all, all text (natural and artificial) will be automatically removed
  {
    type: 'select',
    name: 'textRemoval.mode',
    label: 'Text removal mode',
    hint: 'What type of text to remove from the image',
    choices: [
      {
        message: 'Artificial text (watermarks, company names, discounts)',
        name: 'ai.artificial',
        value: 'ai.artificial'
      },
      {
        message: 'Natural text (signs, clothing text, building text)',
        name: 'ai.natural',
        value: 'ai.natural'
      },
      { message: 'All text (both artificial and natural)', name: 'ai.all', value: 'ai.all' },
      { message: 'No text removal', name: 'none', value: '' }
    ],
    required: false
  },
  // upscale.mode
  // (ALPHA) Warning: might get deprecated with a 2 weeks warning
  // If enabled, the input image will be upscaled (imageFile or imageUrl)
  // The input image must not exceed 1000x1000 pixels when using ai.fast mode
  // The input image must not exceed 512x512 pixels when using ai.slow mode
  // The upscaling process will enlarge the input image up to 4 times its original size
  {
    type: 'select',
    name: 'upscale.mode',
    label: 'Upscale mode (ALPHA - may be deprecated)',
    hint: 'Upscale input image up to 4x (size limits apply)',
    choices: [
      {
        message: 'Fast (max 1000x1000px input, optimized for speed)',
        name: 'ai.fast',
        value: 'ai.fast'
      },
      {
        message: 'Slow (max 512x512px input, optimized for quality)',
        name: 'ai.slow',
        value: 'ai.slow'
      },
      { message: 'No upscaling', name: 'none', value: '' }
    ],
    required: false,
    condition: (answers) => !!answers.imageUrl || !!answers.imageFile
  }
];

export const imageEditingQuestions: Question[] = [
  {
    type: 'select',
    name: 'imageSource',
    label: 'Select image source',
    hint: 'Choose how to provide the image',
    choices: [
      { message: 'URL (GET endpoint)', name: 'url', value: 'url' },
      { message: 'Local file (POST endpoint)', name: 'file', value: 'file' }
    ],
    default: 'file',
    required: true,
    subquestions: {
      url: [
        {
          type: 'input',
          name: 'imageUrl',
          label: 'Enter the image URL',
          hint: 'Paste a valid image URL',
          required: true,
          validate: (value: string) => {
            if (!value || value.trim() === '') return 'This field is required';

            try {
              const url = new URL(value);

              // Check if URL has image extension
              const imageExtensions = [
                '.jpg',
                '.jpeg',
                '.png',
                '.gif',
                '.bmp',
                '.webp',
                '.svg',
                '.tiff'
              ];
              const pathname = url.pathname.toLowerCase();
              const hasImageExtension = imageExtensions.some((ext) => pathname.endsWith(ext));

              if (hasImageExtension) {
                return true;
              }

              return 'URL must end with an image extension (.jpg, .png, .gif, .webp, etc.)';
            } catch {
              return 'Must be a valid URL';
            }
          }
        },
        ...commonEditingQuestions
      ],
      file: [
        {
          type: 'select-images',
          name: 'imageFiles',
          label: 'Select image file(s) to edit',
          hint: 'Choose one or more images to edit',
          required: true
        },
        ...commonEditingQuestions
      ]
    }
  }
] as const;
