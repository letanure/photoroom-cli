import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import enquirer from 'enquirer';
import type { RemoveBackgroundConfig } from './types.js';

const { prompt } = enquirer;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}

function getFileType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const typeMap: Record<string, string> = {
    '.jpg': 'JPEG',
    '.jpeg': 'JPEG',
    '.png': 'PNG',
    '.webp': 'WebP',
    '.bmp': 'BMP',
    '.gif': 'GIF',
    '.tiff': 'TIFF'
  };
  return typeMap[ext] || ext.substring(1).toUpperCase();
}

function formatImageChoice(filePath: string): string {
  const filename = basename(filePath);
  const fileType = getFileType(filePath);
  const stats = statSync(filePath);
  const fileSize = formatFileSize(stats.size);

  // Create a table-like format with consistent spacing
  const nameWidth = 25;
  const typeWidth = 6;

  const paddedName = filename.padEnd(nameWidth);
  const paddedType = fileType.padEnd(typeWidth);

  return `${paddedName} ${paddedType} ${fileSize}`;
}

export async function askRemoveBackgroundQuestions(
  config: Partial<RemoveBackgroundConfig>
): Promise<RemoveBackgroundConfig> {
  const questions = [];

  if (!config.imageFile) {
    // Check if current directory has images
    const currentDir = process.cwd();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.tiff'];
    const imagesInCurrentDir = readdirSync(currentDir)
      .filter((file) => imageExtensions.includes(extname(file).toLowerCase()))
      .map((file) => join(currentDir, file));

    // Create choices for multiselect
    const imageChoices = [];

    // Add "Select All" option first if there are images in current directory
    if (imagesInCurrentDir.length > 0) {
      imageChoices.push({
        name: 'SELECT_ALL',
        message: `✅ Select all ${imagesInCurrentDir.length} images`
      });

      // Add individual images from current directory with formatted display
      imageChoices.push(
        ...imagesInCurrentDir.map((filePath) => ({
          name: filePath,
          message: formatImageChoice(filePath)
        }))
      );
    }

    // If no images in current directory, ask for manual input
    if (imageChoices.length === 0) {
      const { firstImage } = (await prompt({
        type: 'input',
        name: 'firstImage',
        message: 'Enter first image path:',
        validate: (value: string) => {
          if (value.length === 0) return 'First image path is required';
          if (!existsSync(value)) return 'File does not exist';
          return true;
        }
      })) as { firstImage: string };

      const images = [firstImage];

      // Keep asking for more images until user enters empty string
      while (true) {
        const { nextImage } = (await prompt({
          type: 'input',
          name: 'nextImage',
          message: `Enter next image path (or press Enter to finish - ${images.length} selected):`,
          validate: (value: string) => {
            if (value === '') return true; // Empty means done
            if (!existsSync(value)) return 'File does not exist';
            return true;
          }
        })) as { nextImage: string };

        if (nextImage === '') break;
        images.push(nextImage);
      }

      console.log(`\n📸 Selected ${images.length} image(s)`);
      config.imageFiles = images;
      config.imageFile = images[0];
    } else {
      // Show multiselect with images from current directory
      const { selectedImages } = (await prompt({
        type: 'multiselect' as const,
        name: 'selectedImages',
        message: `Select images to process (Found ${imagesInCurrentDir.length} images - Format: Filename Type Size):`,
        choices: imageChoices,
        initial: ['SELECT_ALL'] // Pre-select "Select All" by default
      } as {
        type: 'multiselect';
        name: string;
        message: string;
        choices: Array<{ name: string; message: string }>;
        initial: string[];
      })) as { selectedImages: string[] };

      let finalImages: string[];
      if (selectedImages.includes('SELECT_ALL')) {
        // If "Select All" is chosen, use all images from current directory
        finalImages = imagesInCurrentDir;
        console.log(`\n✅ Selected all ${finalImages.length} images from current directory`);
      } else {
        finalImages = selectedImages;
        console.log(`\n📸 Selected ${finalImages.length} image(s)`);
      }

      if (finalImages.length === 0) {
        console.log('\n❌ No images selected');
        process.exit(1);
      }

      config.imageFiles = finalImages;
      config.imageFile = finalImages[0];
    }
  }

  if (!config.outputPath) {
    // Always ask for output directory since user might process multiple images
    questions.push({
      type: 'input',
      name: 'outputPath',
      message: 'Output directory (where processed images will be saved):',
      initial: './output',
      validate: (value: string) => value.length > 0 || 'Output directory is required'
    });
  }

  questions.push({
    type: 'select',
    name: 'format',
    message: 'Output format (the format of the resulting image):',
    choices: [
      { name: 'png', message: 'PNG (default, best quality with transparency)' },
      { name: 'jpg', message: 'JPG (smaller file size, no transparency)' },
      { name: 'webp', message: 'WebP (modern format, good compression)' }
    ],
    initial: config.format || 'png'
  });

  questions.push({
    type: 'select',
    name: 'channels',
    message: 'Output channels (the channels of the resulting image):',
    choices: [
      { name: 'rgba', message: 'RGBA (default, full color with transparency)' },
      { name: 'alpha', message: 'Alpha (only transparency channel, grayscale)' }
    ],
    initial: config.channels || 'rgba'
  });

  questions.push({
    type: 'input',
    name: 'bgColor',
    message: 'Background color (optional - replaces transparent areas with solid color):',
    hint: 'Can be hex code (#FF00FF) or HTML color (red, green, blue, etc.). Leave empty for transparency.',
    initial: config.bgColor || '',
    validate: (value: string) => {
      if (value === '') return true;
      if (value.match(/^#[0-9A-Fa-f]{6}$/)) return true;
      if (
        ['red', 'green', 'blue', 'black', 'white', 'yellow', 'cyan', 'magenta'].includes(
          value.toLowerCase()
        )
      )
        return true;
      return 'Please enter a valid hex color (#FF00FF) or HTML color name';
    }
  });

  questions.push({
    type: 'select',
    name: 'size',
    message: 'Output size (resizes the output to specified size, useful for mobile apps):',
    choices: [
      { name: 'preview', message: 'Preview (0.25 MP - smallest, fastest)' },
      { name: 'medium', message: 'Medium (1.5 MP - balanced)' },
      { name: 'hd', message: 'HD (4 MP - high quality)' },
      { name: 'full', message: 'Full (36 MP - original size, can be slower)' }
    ],
    initial: config.size || 'full'
  });

  questions.push({
    type: 'confirm',
    name: 'crop',
    message: 'Crop to cutout border? (removes transparent pixels from edges, tighter framing)',
    initial: config.crop || false
  });

  questions.push({
    type: 'confirm',
    name: 'despill',
    message:
      'Remove green screen reflections? (automatically removes green reflections on subject)',
    initial: config.despill || false
  });

  try {
    const answers = await prompt(questions);
    const finalConfig = { ...config, ...answers } as RemoveBackgroundConfig;

    if (finalConfig.bgColor === '') {
      delete finalConfig.bgColor;
    }

    // For single image, generate filename in the output directory
    if (!finalConfig.imageFiles || finalConfig.imageFiles.length <= 1) {
      const inputFile = finalConfig.imageFile;
      const inputBasename = basename(inputFile, extname(inputFile));
      const outputFilename = `${inputBasename}_processed.${finalConfig.format}`;
      finalConfig.outputPath = join(finalConfig.outputPath, outputFilename);
    }

    return finalConfig;
  } catch (_error) {
    // User cancelled with Ctrl+C
    console.log('\n👋 Goodbye!');
    process.exit(0);
  }
}
