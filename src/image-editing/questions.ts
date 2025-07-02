import enquirer from 'enquirer';
import type { Question } from '../shared/question-handler.js';
import { askQuestions } from '../shared/question-handler.js';

export interface ImageEditingParams {
  [key: string]: unknown;
}

export async function askImageEditingParams(): Promise<ImageEditingParams> {
  const responses: ImageEditingParams = {};

  // Use our custom question handler for image source selection
  const imageSourceQuestions: Question[] = [
    {
      type: 'select',
      name: 'imageSource',
      label: 'Select the image source',
      hint: 'Choose how to provide your image',
      choices: [
        { message: 'Upload a file', name: 'file', value: 'file' },
        { message: 'Use an image URL', name: 'url', value: 'url' }
      ],
      default: 'file',
      required: true,
      subquestions: {
        file: [
          {
            type: 'select-images',
            name: 'imageFiles',
            label: 'Select image file(s) to edit',
            hint: 'Choose one or more images to edit',
            required: true
          }
        ],
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
                if (hasImageExtension) return true;
                return 'URL must end with an image extension (.jpg, .png, .gif, .webp, etc.)';
              } catch {
                return 'Must be a valid URL';
              }
            }
          }
        ]
      }
    },
    {
      type: 'input',
      name: 'outputDir',
      label: 'Output directory',
      hint: 'Directory to save edited images',
      required: true,
      default: 'output'
    }
  ];

  const imageSourceResults = await askQuestions(imageSourceQuestions);
  Object.assign(responses, imageSourceResults);

  // === TEMPLATE CONFIGURATION ===
  const templateResult = (await enquirer.prompt({
    type: 'input',
    name: 'templateId',
    message: 'Template ID (UUID, optional):',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true;
      const trimmed = value.trim();

      // Basic UUID format validation
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(trimmed)) return true;

      return 'Must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)';
    }
  })) as { templateId: string };
  if (templateResult.templateId?.trim()) {
    responses.templateId = templateResult.templateId.trim();
  }

  // === UPSCALING (ALPHA) ===
  const upscaleResult = (await enquirer.prompt({
    type: 'input',
    name: 'upscaleMode',
    message: 'Upscale mode (ai.fast/ai.slow, ALPHA feature, optional):',
    validate: (value: string) => {
      if (!value || value.trim() === '') return true;
      const trimmed = value.trim();
      const validValues = ['ai.fast', 'ai.slow'];
      if (validValues.includes(trimmed)) return true;
      return 'Must be "ai.fast" or "ai.slow"';
    }
  })) as { upscaleMode: string };
  if (upscaleResult.upscaleMode?.trim()) {
    responses.upscaleMode = upscaleResult.upscaleMode.trim();
  }

  // === BACKGROUND CONFIGURATION ===
  console.log('\n🎨 Background Configuration');

  const removeBackgroundResult = (await enquirer.prompt({
    type: 'confirm',
    name: 'removeBackground',
    message: "Remove background using PhotoRoom's algorithm?",
    initial: true
  })) as { removeBackground: boolean };
  responses.removeBackground = removeBackgroundResult.removeBackground;

  const backgroundResult = (await enquirer.prompt({
    type: 'confirm',
    name: 'configureBackground',
    message: 'Do you want to edit the background?'
  })) as { configureBackground: boolean };
  responses.configureBackground = backgroundResult.configureBackground;

  if (backgroundResult.configureBackground) {
    const background = await enquirer.prompt([
      {
        type: 'input',
        name: 'color',
        message: 'Background color (hex: FF0000, #FF0000 or name: red, blue, transparent):',
        initial: 'transparent',
        validate: (value: string) => {
          if (!value || value.trim() === '') return true;
          const trimmed = value.trim();

          // Check for transparent
          if (trimmed.toLowerCase() === 'transparent') return true;

          // Check hex format (with or without #)
          const hexPattern = /^#?[A-Fa-f0-9]{6}([A-Fa-f0-9]{2})?$/;
          if (hexPattern.test(trimmed)) return true;

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
          if (colorNames.includes(trimmed.toLowerCase())) return true;

          return 'Must be a hex color (FF0000, #FF0000) or color name (red, blue, etc.)';
        }
      },
      {
        type: 'input',
        name: 'imageUrl',
        message: 'Background image URL (optional, max 30MB):',
        validate: (value: string) => {
          if (!value || value.trim() === '') return true;
          const trimmed = value.trim();

          try {
            const url = new URL(trimmed);
            const imageExtensions = [
              '.jpg',
              '.jpeg',
              '.png',
              '.gif',
              '.bmp',
              '.webp',
              '.svg',
              '.tiff',
              '.tif'
            ];
            const pathname = url.pathname.toLowerCase();
            const hasImageExtension = imageExtensions.some((ext) => pathname.endsWith(ext));

            if (hasImageExtension) return true;
            return 'URL must end with an image extension (.jpg, .png, .gif, .webp, etc.)';
          } catch {
            return 'Must be a valid URL (e.g., https://example.com/image.jpg)';
          }
        }
      },
      {
        type: 'input',
        name: 'imageFile',
        message: 'Background guidance image file path (optional, max 30MB):',
        validate: (value: string) => {
          if (!value || value.trim() === '') return true;
          const trimmed = value.trim();

          // Check if file path looks valid
          if (!trimmed.includes('.')) return 'Please provide a valid file path with extension';

          // Check for common image extensions
          const imageExtensions = [
            '.jpg',
            '.jpeg',
            '.png',
            '.gif',
            '.bmp',
            '.webp',
            '.svg',
            '.tiff',
            '.tif'
          ];
          const hasImageExtension = imageExtensions.some((ext) =>
            trimmed.toLowerCase().endsWith(ext)
          );

          if (!hasImageExtension) {
            return 'File must be an image (.jpg, .png, .gif, .webp, etc.)';
          }

          return true;
        }
      },
      {
        type: 'input',
        name: 'guidanceImageUrl',
        message: 'Background guidance image URL (optional, max 30MB):',
        validate: (value: string) => {
          if (!value || value.trim() === '') return true;
          const trimmed = value.trim();

          try {
            const url = new URL(trimmed);
            const imageExtensions = [
              '.jpg',
              '.jpeg',
              '.png',
              '.gif',
              '.bmp',
              '.webp',
              '.svg',
              '.tiff',
              '.tif'
            ];
            const pathname = url.pathname.toLowerCase();
            const hasImageExtension = imageExtensions.some((ext) => pathname.endsWith(ext));

            if (hasImageExtension) return true;
            return 'URL must end with an image extension (.jpg, .png, .gif, .webp, etc.)';
          } catch {
            return 'Must be a valid URL (e.g., https://example.com/image.jpg)';
          }
        }
      },
      {
        type: 'input',
        name: 'guidanceScale',
        message: 'Background guidance scale (0-1, how closely to match guiding image):',
        initial: '0.6',
        validate: (value: string) => {
          if (!value || value.trim() === '') return true;
          const trimmed = value.trim();
          const num = Number.parseFloat(trimmed);

          if (Number.isNaN(num)) return 'Must be a number';
          if (num < 0 || num > 1) return 'Must be between 0 and 1';

          return true;
        }
      },
      {
        type: 'input',
        name: 'prompt',
        message: 'Background prompt (optional, e.g. "a blue sky with white clouds"):'
      },
      {
        type: 'input',
        name: 'negativePrompt',
        message: 'Negative prompt (optional, LEGACY - only works with AI model v2):'
      },
      {
        type: 'input',
        name: 'expandPrompt',
        message: 'Expand prompt (optional):'
      },
      {
        type: 'input',
        name: 'scaling',
        message: 'Background scaling (fit/fill, only for image backgrounds):',
        initial: 'fill',
        validate: (value: string) => {
          if (!value || value.trim() === '') return true;
          const trimmed = value.trim().toLowerCase();
          if (trimmed === 'fit' || trimmed === 'fill') return true;
          return 'Must be "fit" or "fill"';
        }
      },
      {
        type: 'input',
        name: 'seed',
        message: 'Background seed (integer for reproducible results, e.g. 123456):',
        validate: (value: string) => {
          if (!value || value.trim() === '') return true;
          const trimmed = value.trim();
          const num = Number.parseInt(trimmed, 10);

          if (Number.isNaN(num) || !Number.isInteger(num)) return 'Must be an integer';
          if (num < 0) return 'Must be a positive integer';

          return true;
        }
      }
    ]);
    responses.background = background;
  }

  // === LAYOUT & POSITIONING ===
  console.log('\n📐 Layout & Positioning');
  const layout = await enquirer.prompt([
    {
      type: 'input',
      name: 'horizontalAlignment',
      message: 'Horizontal alignment (left/center/right, advanced):',
      validate: (value: string) => {
        if (!value || value.trim() === '') return true;
        const trimmed = value.trim().toLowerCase();
        const validAlignments = ['left', 'center', 'right'];
        if (validAlignments.includes(trimmed)) return true;
        return 'Must be one of: left, center, right';
      }
    },
    {
      type: 'input',
      name: 'verticalAlignment',
      message: 'Vertical alignment (top/center/bottom, advanced):',
      validate: (value: string) => {
        if (!value || value.trim() === '') return true;
        const trimmed = value.trim().toLowerCase();
        const validAlignments = ['top', 'center', 'bottom'];
        if (validAlignments.includes(trimmed)) return true;
        return 'Must be one of: top, center, bottom';
      }
    },
    {
      type: 'input',
      name: 'keepExistingAlphaChannel',
      message: 'Keep existing alpha channel (auto/never):',
      initial: 'never',
      validate: (value: string) => {
        if (!value || value.trim() === '') return true;
        const trimmed = value.trim().toLowerCase();
        const validValues = ['auto', 'never'];
        if (validValues.includes(trimmed)) return true;
        return 'Must be "auto" or "never"';
      }
    },
    {
      type: 'confirm',
      name: 'ignorePaddingAndSnapOnCroppedSides',
      message: 'Snap cropped subject sides to edges (ignores padding on cropped sides)?',
      initial: true
    },
    {
      type: 'input',
      name: 'lightingMode',
      message: 'Lighting mode (ai.auto for automatic adjustment):',
      validate: (value: string) => {
        if (!value || value.trim() === '') return true;
        const trimmed = value.trim();
        if (trimmed === 'ai.auto') return true;
        return 'Must be "ai.auto" or leave empty';
      }
    },
    {
      type: 'input',
      name: 'scaling',
      message: 'Subject scaling (fit/fill - how subject fits in output):',
      initial: 'fit',
      validate: (value: string) => {
        if (!value || value.trim() === '') return true;
        const trimmed = value.trim().toLowerCase();
        const validValues = ['fit', 'fill'];
        if (validValues.includes(trimmed)) return true;
        return 'Must be "fit" or "fill"';
      }
    },
    {
      type: 'input',
      name: 'referenceBox',
      message: 'Reference box (subjectBox/originalImage, advanced positioning):',
      initial: 'subjectBox',
      validate: (value: string) => {
        if (!value || value.trim() === '') return true;
        const trimmed = value.trim();
        const validValues = ['subjectBox', 'originalImage'];
        if (validValues.includes(trimmed)) return true;
        return 'Must be "subjectBox" or "originalImage"';
      }
    },
    {
      type: 'input',
      name: 'shadowMode',
      message: 'Shadow mode (ai.soft/ai.hard/ai.floating, optional):',
      validate: (value: string) => {
        if (!value || value.trim() === '') return true;
        const trimmed = value.trim();
        const validValues = ['ai.soft', 'ai.hard', 'ai.floating'];
        if (validValues.includes(trimmed)) return true;
        return 'Must be "ai.soft", "ai.hard", or "ai.floating"';
      }
    },
    {
      type: 'input',
      name: 'textRemovalMode',
      message: 'Text removal mode (ai.artificial/ai.natural/ai.all, optional):',
      validate: (value: string) => {
        if (!value || value.trim() === '') return true;
        const trimmed = value.trim();
        const validValues = ['ai.artificial', 'ai.natural', 'ai.all'];
        if (validValues.includes(trimmed)) return true;
        return 'Must be "ai.artificial", "ai.natural", or "ai.all"';
      }
    }
  ]);
  responses.layout = layout;

  // === SPACING & MARGINS ===
  console.log('\n📏 Spacing & Margins');

  // Margin configuration
  const marginConfig = (await enquirer.prompt({
    type: 'confirm',
    name: 'setMargins',
    message: 'Do you want to set margins?'
  })) as { setMargins: boolean };

  if (marginConfig.setMargins) {
    const marginStyle = (await enquirer.prompt({
      type: 'select',
      name: 'marginStyle',
      message: 'Margin configuration:',
      choices: [
        { name: 'uniform', message: 'Same margin for all sides' },
        { name: 'individual', message: 'Individual margins for each side' }
      ]
    })) as { marginStyle: 'uniform' | 'individual' };

    if (marginStyle.marginStyle === 'uniform') {
      const uniformMargin = await enquirer.prompt({
        type: 'input',
        name: 'margin',
        message: 'Margin for all sides (0-0.49, 0%-49%, or 100px):',
        initial: '0',
        validate: (value: string) => {
          if (!value || value.trim() === '') return true;
          const trimmed = value.trim();

          // Check percentage format
          if (trimmed.endsWith('%')) {
            const num = Number.parseFloat(trimmed.slice(0, -1));
            if (Number.isNaN(num) || num < 0 || num > 49)
              return 'Percentage must be between 0% and 49%';
            return true;
          }

          // Check pixel format
          if (trimmed.endsWith('px')) {
            const num = Number.parseFloat(trimmed.slice(0, -2));
            if (Number.isNaN(num) || num < 0) return 'Pixel value must be positive';
            return true;
          }

          // Check number format
          const num = Number.parseFloat(trimmed);
          if (Number.isNaN(num) || num < 0 || num > 0.49)
            return 'Number must be between 0 and 0.49';

          return true;
        }
      });
      responses.margin = (uniformMargin as { margin: string }).margin;
    } else {
      const marginValidation = (value: string) => {
        if (!value || value.trim() === '') return true;
        const trimmed = value.trim();

        // Check percentage format
        if (trimmed.endsWith('%')) {
          const num = Number.parseFloat(trimmed.slice(0, -1));
          if (Number.isNaN(num) || num < 0 || num > 49)
            return 'Percentage must be between 0% and 49%';
          return true;
        }

        // Check pixel format
        if (trimmed.endsWith('px')) {
          const num = Number.parseFloat(trimmed.slice(0, -2));
          if (Number.isNaN(num) || num < 0) return 'Pixel value must be positive';
          return true;
        }

        // Check number format
        const num = Number.parseFloat(trimmed);
        if (Number.isNaN(num) || num < 0 || num > 0.49) return 'Number must be between 0 and 0.49';

        return true;
      };

      const individualMargins = await enquirer.prompt([
        {
          type: 'input',
          name: 'marginTop',
          message: 'Top margin (0-0.49, 0%-49%, or 100px):',
          validate: marginValidation
        },
        {
          type: 'input',
          name: 'marginRight',
          message: 'Right margin (0-0.49, 0%-49%, or 100px):',
          validate: marginValidation
        },
        {
          type: 'input',
          name: 'marginBottom',
          message: 'Bottom margin (0-0.49, 0%-49%, or 100px):',
          validate: marginValidation
        },
        {
          type: 'input',
          name: 'marginLeft',
          message: 'Left margin (0-0.49, 0%-49%, or 100px):',
          validate: marginValidation
        }
      ]);
      responses.margins = individualMargins;
    }
  }

  // Padding configuration
  const paddingConfig = (await enquirer.prompt({
    type: 'confirm',
    name: 'setPadding',
    message: 'Do you want to set padding?'
  })) as { setPadding: boolean };

  if (paddingConfig.setPadding) {
    const paddingStyle = (await enquirer.prompt({
      type: 'select',
      name: 'paddingStyle',
      message: 'Padding configuration:',
      choices: [
        { name: 'uniform', message: 'Same padding for all sides' },
        { name: 'individual', message: 'Individual padding for each side' }
      ]
    })) as { paddingStyle: 'uniform' | 'individual' };

    if (paddingStyle.paddingStyle === 'uniform') {
      const uniformPadding = await enquirer.prompt({
        type: 'input',
        name: 'padding',
        message: 'Padding for all sides (0-0.49, 0%-49%, or 100px):',
        initial: '0',
        validate: (value: string) => {
          if (!value || value.trim() === '') return true;
          const trimmed = value.trim();

          // Check percentage format
          if (trimmed.endsWith('%')) {
            const num = Number.parseFloat(trimmed.slice(0, -1));
            if (Number.isNaN(num) || num < 0 || num > 49)
              return 'Percentage must be between 0% and 49%';
            return true;
          }

          // Check pixel format
          if (trimmed.endsWith('px')) {
            const num = Number.parseFloat(trimmed.slice(0, -2));
            if (Number.isNaN(num) || num < 0) return 'Pixel value must be positive';
            return true;
          }

          // Check number format
          const num = Number.parseFloat(trimmed);
          if (Number.isNaN(num) || num < 0 || num > 0.49)
            return 'Number must be between 0 and 0.49';

          return true;
        }
      });
      responses.padding = (uniformPadding as { padding: string }).padding;
    } else {
      const paddingValidation = (value: string) => {
        if (!value || value.trim() === '') return true;
        const trimmed = value.trim();

        // Check percentage format
        if (trimmed.endsWith('%')) {
          const num = Number.parseFloat(trimmed.slice(0, -1));
          if (Number.isNaN(num) || num < 0 || num > 49)
            return 'Percentage must be between 0% and 49%';
          return true;
        }

        // Check pixel format
        if (trimmed.endsWith('px')) {
          const num = Number.parseFloat(trimmed.slice(0, -2));
          if (Number.isNaN(num) || num < 0) return 'Pixel value must be positive';
          return true;
        }

        // Check number format
        const num = Number.parseFloat(trimmed);
        if (Number.isNaN(num) || num < 0 || num > 0.49) return 'Number must be between 0 and 0.49';

        return true;
      };

      const individualPadding = await enquirer.prompt([
        {
          type: 'input',
          name: 'paddingTop',
          message: 'Top padding (0-0.49, 0%-49%, or 100px):',
          validate: paddingValidation
        },
        {
          type: 'input',
          name: 'paddingRight',
          message: 'Right padding (0-0.49, 0%-49%, or 100px):',
          validate: paddingValidation
        },
        {
          type: 'input',
          name: 'paddingBottom',
          message: 'Bottom padding (0-0.49, 0%-49%, or 100px):',
          validate: paddingValidation
        },
        {
          type: 'input',
          name: 'paddingLeft',
          message: 'Left padding (0-0.49, 0%-49%, or 100px):',
          validate: paddingValidation
        }
      ]);
      responses.padding = individualPadding;
    }
  }

  // === ADVANCED OPTIONS ===
  console.log('\n⚙️ Advanced Options');
  const expandResult = (await enquirer.prompt({
    type: 'confirm',
    name: 'configureExpand',
    message: 'Do you want to configure expand mode?'
  })) as { configureExpand: boolean };
  responses.configureExpand = expandResult.configureExpand;

  if (expandResult.configureExpand) {
    const expand = await enquirer.prompt([
      {
        type: 'select',
        name: 'mode',
        message: 'Expand mode (fills transparent pixels automatically):',
        choices: ['ai.auto']
      },
      {
        type: 'input',
        name: 'seed',
        message: 'Expand seed (integer for reproducible results, e.g. 123456):',
        validate: (value: string) => {
          if (!value || value.trim() === '') return true;
          const trimmed = value.trim();
          const num = Number.parseInt(trimmed, 10);

          if (Number.isNaN(num) || !Number.isInteger(num)) return 'Must be an integer';
          if (num < 0) return 'Must be a positive integer';

          return true;
        }
      }
    ]);
    responses.expand = expand;
  }

  // === OUTPUT & EXPORT SETTINGS ===
  console.log('\n💾 Output & Export Settings');
  const exportResult = (await enquirer.prompt({
    type: 'confirm',
    name: 'configureExport',
    message: 'Do you want to set export options?'
  })) as { configureExport: boolean };
  responses.configureExport = exportResult.configureExport;

  if (exportResult.configureExport) {
    const exportOptions = await enquirer.prompt([
      {
        type: 'input',
        name: 'dpi',
        message: 'DPI (72-1200, e.g. 300 for print, 96 for web):',
        validate: (value: string) => {
          if (!value || value.trim() === '') return true;
          const trimmed = value.trim();
          const num = Number.parseInt(trimmed, 10);

          if (Number.isNaN(num) || !Number.isInteger(num)) return 'Must be an integer';
          if (num < 72 || num > 1200) return 'Must be between 72 and 1200 DPI';

          return true;
        }
      },
      {
        type: 'input',
        name: 'format',
        message: 'Export format (png/jpeg/jpg/webp):',
        initial: 'png',
        validate: (value: string) => {
          if (!value || value.trim() === '') return true;
          const trimmed = value.trim().toLowerCase();
          const validFormats = ['png', 'jpeg', 'jpg', 'webp'];
          if (validFormats.includes(trimmed)) return true;
          return 'Must be one of: png, jpeg, jpg, webp';
        }
      }
    ]);
    responses.export = exportOptions;
  }

  const output = await enquirer.prompt([
    {
      type: 'input',
      name: 'outputImageMimeType',
      message: 'Output MIME type (optional):'
    },
    {
      type: 'input',
      name: 'maxWidth',
      message: 'Max width (resize while keeping aspect ratio, e.g. 200):',
      validate: (value: string) => {
        if (!value || value.trim() === '') return true;
        const trimmed = value.trim();
        const num = Number.parseInt(trimmed, 10);

        if (Number.isNaN(num) || !Number.isInteger(num)) return 'Must be an integer';
        if (num <= 0) return 'Must be a positive integer';

        return true;
      }
    },
    {
      type: 'input',
      name: 'maxHeight',
      message: 'Max height (resize while keeping aspect ratio, e.g. 200):',
      validate: (value: string) => {
        if (!value || value.trim() === '') return true;
        const trimmed = value.trim();
        const num = Number.parseInt(trimmed, 10);

        if (Number.isNaN(num) || !Number.isInteger(num)) return 'Must be an integer';
        if (num <= 0) return 'Must be a positive integer';

        return true;
      }
    },
    {
      type: 'input',
      name: 'outputSize',
      message: 'Output size (auto/originalImage/croppedSubject/200x400):',
      initial: 'auto',
      validate: (value: string) => {
        if (!value || value.trim() === '') return true;
        const trimmed = value.trim();

        // Check predefined values
        const predefinedValues = ['auto', 'originalImage', 'croppedSubject'];
        if (predefinedValues.includes(trimmed)) return true;

        // Check widthxheight format
        const dimensionPattern = /^\d+x\d+$/;
        if (dimensionPattern.test(trimmed)) {
          const parts = trimmed.split('x');
          if (parts.length === 2) {
            const width = Number(parts[0]);
            const height = Number(parts[1]);
            if (!Number.isNaN(width) && !Number.isNaN(height) && width > 0 && height > 0)
              return true;
          }
          return 'Width and height must be positive numbers';
        }

        return 'Must be "auto", "originalImage", "croppedSubject", or "widthxheight" (e.g., 200x400)';
      }
    },
    {
      type: 'input',
      name: 'sizeWidth',
      message: 'Output size width (optional, alternative to outputSize):'
    },
    {
      type: 'input',
      name: 'sizeHeight',
      message: 'Output size height (optional, alternative to outputSize):'
    }
  ]);
  responses.output = output;

  return responses;
}
