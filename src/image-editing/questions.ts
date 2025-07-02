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

  // === BACKGROUND CONFIGURATION ===
  console.log('\n🎨 Background Configuration');
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

  // === LAYOUT & POSITIONING ===
  console.log('\n📐 Layout & Positioning');
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
        message: 'Margin for all sides:'
      });
      responses.margin = (uniformMargin as { margin: string }).margin;
    } else {
      const individualMargins = await enquirer.prompt([
        {
          type: 'input',
          name: 'marginTop',
          message: 'Top margin:'
        },
        {
          type: 'input',
          name: 'marginRight',
          message: 'Right margin:'
        },
        {
          type: 'input',
          name: 'marginBottom',
          message: 'Bottom margin:'
        },
        {
          type: 'input',
          name: 'marginLeft',
          message: 'Left margin:'
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
        message: 'Padding for all sides:'
      });
      responses.padding = (uniformPadding as { padding: string }).padding;
    } else {
      const individualPadding = await enquirer.prompt([
        {
          type: 'input',
          name: 'paddingTop',
          message: 'Top padding:'
        },
        {
          type: 'input',
          name: 'paddingRight',
          message: 'Right padding:'
        },
        {
          type: 'input',
          name: 'paddingBottom',
          message: 'Bottom padding:'
        },
        {
          type: 'input',
          name: 'paddingLeft',
          message: 'Left padding:'
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
