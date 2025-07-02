import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import enquirer from 'enquirer';

const { prompt } = enquirer;

export interface ImageSelectionResult {
  imageFile: string;
  imageFiles: string[];
}

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

  const nameWidth = 25;
  const typeWidth = 6;

  const paddedName = filename.padEnd(nameWidth);
  const paddedType = fileType.padEnd(typeWidth);

  return `${paddedName} ${paddedType} ${fileSize}`;
}

export async function selectImages(): Promise<ImageSelectionResult> {
  const currentDir = process.cwd();
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.tiff'];
  const imagesInCurrentDir = readdirSync(currentDir)
    .filter((file) => imageExtensions.includes(extname(file).toLowerCase()))
    .map((file) => join(currentDir, file));

  const imageChoices = [];

  if (imagesInCurrentDir.length > 0) {
    imageChoices.push({
      name: 'SELECT_ALL',
      message: `✅ Select all ${imagesInCurrentDir.length} images`
    });

    imageChoices.push(
      ...imagesInCurrentDir.map((filePath) => ({
        name: filePath,
        message: formatImageChoice(filePath)
      }))
    );
  }

  if (imageChoices.length === 0) {
    // No images in current directory, ask for manual input
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

    const images: string[] = [firstImage];

    while (true) {
      const { nextImage } = (await prompt({
        type: 'input',
        name: 'nextImage',
        message: `Enter next image path (or press Enter to finish - ${images.length} selected):`,
        validate: (value: string) => {
          if (value === '') return true;
          if (!existsSync(value)) return 'File does not exist';
          return true;
        }
      })) as { nextImage: string };

      if (nextImage === '') break;
      images.push(nextImage);
    }

    console.log(`\n📸 Selected ${images.length} image(s)`);

    if (images.length === 0) {
      console.log('\n❌ No images selected');
      process.exit(1);
    }

    const firstImageFile = images[0];
    if (!firstImageFile) {
      throw new Error('No images selected');
    }

    return {
      imageFile: firstImageFile,
      imageFiles: images
    };
  }

  // Show multiselect with images from current directory
  const { selectedImages } = (await prompt({
    type: 'multiselect' as const,
    name: 'selectedImages',
    message: `Select images to process (Found ${imagesInCurrentDir.length} images - Format: Filename Type Size):`,
    choices: imageChoices,
    initial: ['SELECT_ALL']
  } as {
    type: 'multiselect';
    name: string;
    message: string;
    choices: Array<{ name: string; message: string }>;
    initial: string[];
  })) as { selectedImages: string[] };

  let finalImages: string[];
  if (selectedImages.includes('SELECT_ALL')) {
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

  const selectedFirstImage = finalImages[0];
  if (!selectedFirstImage) {
    throw new Error('No images selected');
  }

  return {
    imageFile: selectedFirstImage,
    imageFiles: finalImages
  };
}
