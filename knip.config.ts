import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'src/index.ts',
    // Entry points for each API module
    'src/apis/*/index.ts'
  ],
  project: ['src/**/*.ts'],
  ignore: [
    'dist/**',
    'node_modules/**',
    '**/*.d.ts',
    // Ignore files outside src for dependency checking
    '*.config.*',
    'package.json'
  ],
  ignoreDependencies: [
    // Dependencies used by build tools, not src code
    '@octokit/rest',
    'conventional-changelog-cli',
    'husky',
    'standard-version'
  ],
  ignoreExportsUsedInFile: true,
  // Don't report types as unused if they might be part of public API
  includeEntryExports: true,
  typescript: {
    config: 'tsconfig.json'
  }
};

export default config;