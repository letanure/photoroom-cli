import enquirer from 'enquirer';
import type { Question } from '../shared/question-handler.js';
import { askQuestions } from '../shared/question-handler.js';

interface ImageEditingParams {
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
        message: 'Background color (optional):'
      },
      {
        type: 'input',
        name: 'imageUrl',
        message: 'Background image URL (optional):'
      },
      {
        type: 'input',
        name: 'prompt',
        message: 'Background prompt (optional):'
      },
      {
        type: 'input',
        name: 'negativePrompt',
        message: 'Negative prompt (optional):'
      },
      {
        type: 'input',
        name: 'expandPrompt',
        message: 'Expand prompt (optional):'
      },
      {
        type: 'input',
        name: 'scaling',
        message: 'Background scaling (number, optional):'
      },
      {
        type: 'input',
        name: 'seed',
        message: 'Background seed (integer, optional):'
      }
    ]);
    responses.background = background;
  }

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
        message: 'Select expand mode:',
        choices: ['ai.auto']
      },
      {
        type: 'input',
        name: 'seed',
        message: 'Expand seed (integer, optional):'
      }
    ]);
    responses.expand = expand;
  }

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
        message: 'DPI (optional):'
      },
      {
        type: 'select',
        name: 'format',
        message: 'Select export format:',
        choices: ['png', 'jpeg']
      }
    ]);
    responses.export = exportOptions;
  }

  const layout = await enquirer.prompt([
    {
      type: 'select',
      name: 'horizontalAlignment',
      message: 'Horizontal alignment:',
      choices: ['left', 'center', 'right']
    },
    {
      type: 'select',
      name: 'verticalAlignment',
      message: 'Vertical alignment:',
      choices: ['top', 'center', 'bottom']
    },
    {
      type: 'confirm',
      name: 'keepExistingAlphaChannel',
      message: 'Keep existing alpha channel?'
    },
    {
      type: 'confirm',
      name: 'ignorePaddingAndSnapOnCroppedSides',
      message: 'Ignore padding and snap?'
    },
    {
      type: 'select',
      name: 'lightingMode',
      message: 'Lighting mode:',
      choices: ['original', 'enhanced']
    }
  ]);
  responses.layout = layout;

  const margins = await enquirer.prompt([
    {
      type: 'input',
      name: 'margin',
      message: 'Margin (optional):'
    },
    {
      type: 'input',
      name: 'padding',
      message: 'Padding (optional):'
    }
  ]);
  responses.margins = margins;

  const output = await enquirer.prompt([
    {
      type: 'input',
      name: 'outputImageMimeType',
      message: 'Output MIME type (optional):'
    },
    {
      type: 'input',
      name: 'maxWidth',
      message: 'Max width (optional):'
    },
    {
      type: 'input',
      name: 'maxHeight',
      message: 'Max height (optional):'
    },
    {
      type: 'input',
      name: 'sizeWidth',
      message: 'Output size width (optional):'
    },
    {
      type: 'input',
      name: 'sizeHeight',
      message: 'Output size height (optional):'
    }
  ]);
  responses.output = output;

  return responses;
}
