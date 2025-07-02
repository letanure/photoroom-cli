import { promises as fs } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { askQuestions, type SelectQuestion } from './question-handler.js';

type ConflictOptions = readonly ['overwrite', 'overwriteAll', 'rename', 'renameAll', 'cancel'];

export interface ConflictResolution {
  action: 'overwrite' | 'overwriteAll' | 'rename' | 'renameAll' | 'cancel';
  newPath?: string;
}

export interface ConflictState {
  overwriteAll: boolean;
  renameAll: boolean;
}

const conflictQuestions: SelectQuestion<ConflictOptions>[] = [
  {
    type: 'select',
    name: 'conflictAction',
    label: 'File already exists. What would you like to do?',
    hint: 'Choose how to handle the file conflict',
    choices: [
      { message: 'Overwrite this file', name: 'overwrite', value: 'overwrite' },
      { message: "Overwrite all (don't ask again)", name: 'overwriteAll', value: 'overwriteAll' },
      { message: 'Rename this file (add suffix)', name: 'rename', value: 'rename' },
      { message: "Rename all (don't ask again)", name: 'renameAll', value: 'renameAll' },
      { message: 'Cancel operation', name: 'cancel', value: 'cancel' }
    ],
    default: 'rename'
  }
];

async function generateNewFileName(originalPath: string): Promise<string> {
  const dir = dirname(originalPath);
  const ext = originalPath.substring(originalPath.lastIndexOf('.'));
  const nameWithoutExt = basename(originalPath, ext);

  let counter = 2;
  let newPath: string;

  do {
    const newName = `${nameWithoutExt}-${counter}${ext}`;
    newPath = join(dir, newName);
    counter++;
  } while (await fileExists(newPath));

  return newPath;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function handleFileConflict(
  outputPath: string,
  conflictState: ConflictState
): Promise<ConflictResolution> {
  const exists = await fileExists(outputPath);

  if (!exists) {
    return { action: 'overwrite', newPath: outputPath };
  }

  // Apply automatic actions if already decided
  if (conflictState.overwriteAll) {
    return { action: 'overwriteAll', newPath: outputPath };
  }

  if (conflictState.renameAll) {
    const newPath = await generateNewFileName(outputPath);
    return { action: 'renameAll', newPath };
  }

  // Ask user what to do
  console.log(`\n⚠️  File exists: ${outputPath}`);
  const answers = await askQuestions(conflictQuestions);
  const action = answers.conflictAction as ConflictOptions[number];

  switch (action) {
    case 'overwrite':
      return { action: 'overwrite', newPath: outputPath };

    case 'overwriteAll':
      conflictState.overwriteAll = true;
      return { action: 'overwriteAll', newPath: outputPath };

    case 'rename': {
      const renamedPath = await generateNewFileName(outputPath);
      return { action: 'rename', newPath: renamedPath };
    }

    case 'renameAll': {
      conflictState.renameAll = true;
      const autoRenamedPath = await generateNewFileName(outputPath);
      return { action: 'renameAll', newPath: autoRenamedPath };
    }

    case 'cancel':
      return { action: 'cancel' };

    default:
      return { action: 'cancel' };
  }
}
