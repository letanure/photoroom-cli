import { promises as fs } from 'node:fs';
import { join } from 'node:path';

export interface ImageInfo {
  path: string;
  name: string;
  size: number;
  isValid: boolean;
  validationMessage?: string;
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.gif'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_RESOLUTION = 6000; // Max side in pixels

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export async function getImageDimensions(
  _imagePath: string
): Promise<{ width: number; height: number } | null> {
  try {
    // This is a simplified check - in a real implementation, you'd use an image library
    // For now, just return null to skip dimension validation
    return null;
  } catch {
    return null;
  }
}

async function validateImage(
  imagePath: string,
  size: number
): Promise<{ isValid: boolean; message?: string }> {
  // Check file size
  if (size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      message: `File too large (${formatFileSize(size)} > ${formatFileSize(MAX_FILE_SIZE)})`
    };
  }

  // Check dimensions (simplified - would need image library for real implementation)
  const dimensions = await getImageDimensions(imagePath);
  if (dimensions) {
    const maxSide = Math.max(dimensions.width, dimensions.height);
    if (maxSide > MAX_RESOLUTION) {
      return {
        isValid: false,
        message: `Resolution too high (${maxSide}px > ${MAX_RESOLUTION}px)`
      };
    }
  }

  return { isValid: true };
}

export async function findImages(directory: string = process.cwd()): Promise<ImageInfo[]> {
  try {
    const files = await fs.readdir(directory);
    const imageInfos: ImageInfo[] = [];

    for (const file of files) {
      const filePath = join(directory, file);
      const stat = await fs.stat(filePath);

      if (stat.isFile()) {
        const extension = file.toLowerCase().substring(file.lastIndexOf('.'));

        if (IMAGE_EXTENSIONS.includes(extension)) {
          const validation = await validateImage(filePath, stat.size);

          imageInfos.push({
            path: filePath,
            name: file,
            size: stat.size,
            isValid: validation.isValid,
            validationMessage: validation.message
          });
        }
      }
    }

    // Sort by validity first, then by name
    return imageInfos.sort((a, b) => {
      if (a.isValid !== b.isValid) {
        return a.isValid ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
}

export function formatImageChoice(image: ImageInfo): string {
  const sizeStr = formatFileSize(image.size);
  const status = image.isValid ? '✓' : '✗';
  const statusInfo = image.isValid ? '' : ` (${image.validationMessage})`;

  return `${status} ${image.name.padEnd(30)} ${sizeStr}${statusInfo}`;
}
