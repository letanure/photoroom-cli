# PhotoRoom CLI

A command-line interface for the PhotoRoom API, built with Node.js and TypeScript.

## Features

- **Remove Background (Basic Plan)** - Remove backgrounds from images with advanced options
- **Account Details** - View your PhotoRoom account information *(coming soon)*
- **Image Editing v2 (Plus Plan)** - Advanced image editing features *(coming soon)*

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd photoroom-cli

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

### API Key Setup

The CLI will automatically prompt for your API key on first run. You can also set it using:

**Option 1: Save to config (recommended)**
```bash
photoroom-cli config set api-key your-api-key-here
```

**Option 2: Environment variable**
```bash
export PHOTOROOM_API_KEY="your-api-key-here"
```

**Option 3: Command line flag**
```bash
photoroom-cli remove-bg --api-key your-api-key-here --input photo.jpg
```

### Configuration Management

```bash
# View all configuration
photoroom-cli config get

# Set default values
photoroom-cli config set default-format png
photoroom-cli config set default-size hd
photoroom-cli config set default-output ./output

# Get specific config
photoroom-cli config get api-key
photoroom-cli config get default-format

# Reset all configuration
photoroom-cli config reset

# Show config file location
photoroom-cli config path
```

**Config file locations:**
- **macOS/Linux**: `~/.config/photoroom-cli/config.json`
- **Windows**: `%APPDATA%/photoroom-cli/config.json`

## Development

```bash
# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Run built version
npm start
```

## Usage

### Interactive Mode

Run the CLI without arguments to see the action menu:

```bash
npm run dev
# or
node dist/index.js
```

### Remove Background

#### Interactive Mode
```bash
npm run dev -- remove-bg
```

#### Command Line Flags
```bash
npm run dev -- remove-bg \
  --input ./photo.jpg \
  --output ./photo-no-bg.png \
  --format png \
  --size hd \
  --crop \
  --despill
```

#### Dry Run Mode
Test your configuration without making actual API calls:

```bash
# Global dry run (interactive mode)
npm run dev -- --dry-run

# Specific command dry run
npm run dev -- remove-bg --input ./photo.jpg --dry-run
npm run dev -- account --dry-run
npm run dev -- image-editing --dry-run
```

This will display the complete API request details including URL, headers, and form data without executing the request.

### Available Options

| Option | Flag | Description | Values | Default |
|--------|------|-------------|---------|---------|
| Input Image | `-i, --input` | Path to input image | File path | *Required* |
| Output Path | `-o, --output` | Path for output image | File path | `./output.png` |
| Format | `-f, --format` | Output image format | `png`, `jpg`, `webp` | `png` |
| Channels | `-c, --channels` | Output channels | `rgba`, `alpha` | `rgba` |
| Background Color | `-b, --bg-color` | Background color | Hex (`#FF00FF`) or HTML color | *None* |
| Size | `-s, --size` | Output image size | `preview`, `medium`, `hd`, `full` | `full` |
| Crop | `--crop` | Crop to cutout border | Boolean flag | `false` |
| Despill | `--despill` | Remove green background reflections | Boolean flag | `false` |
| Dry Run | `--dry-run` | Log API request without executing | Boolean flag | `false` |
| API Key | `--api-key` | PhotoRoom API key | String | From config/env |

### Size Options

- **preview** - 0.25 Megapixels (fast processing)
- **medium** - 1.5 Megapixels 
- **hd** - 4 Megapixels
- **full** - 36 Megapixels (highest quality, slower processing)

## API Response

The PhotoRoom API returns:

- **Image Data**: The processed image as binary data
- **Uncertainty Score**: A confidence score between 0-1
  - `0` = Very confident about the cutout accuracy
  - `1` = Model is unsure about segmentation
  - `-1` = Human detected in image (no uncertainty score)

### Uncertainty Score Interpretation

- **0.0 - 0.2**: Very confident
- **0.2 - 0.5**: Confident  
- **0.5 - 0.8**: Uncertain
- **0.8 - 1.0**: Very uncertain
- **-1**: Human detected (different processing)

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Scripts

- `npm run dev` - Run in development mode with tsx
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled JavaScript
- `npm test` - Run tests *(coming soon)*

### Code Quality

This project uses:

- **TypeScript** with strict configuration
- **Commitlint** for conventional commit messages
- **Husky** for git hooks
- **ESM modules** for modern JavaScript

### Commit Messages

Follow conventional commit format:

```
feat: add new background removal options
fix: resolve image validation error
docs: update API documentation
chore: setup development environment
```

## API Documentation

### Remove Background Endpoint

**Endpoint**: `POST /v1/segment`  
**Content-Type**: `multipart/form-data`

**Parameters**:
- `image_file` (required) - The image file to process
- `format` (optional) - Output format: `png`, `jpg`, `webp`
- `channels` (optional) - Output channels: `rgba`, `alpha`
- `bg_color` (optional) - Background color (hex or HTML color)
- `size` (optional) - Output size: `preview`, `medium`, `hd`, `full`
- `crop` (optional) - Crop to cutout border: `true`, `false`
- `despill` (optional) - Remove green background reflections: `true`, `false`

**Response**:
- **200 OK**: Returns processed image binary data
- **Headers**: `x-uncertainty-score` - Confidence score (0-1 or -1)
- **400 Bad Request**: Returns error details in JSON format
- **403 Forbidden**: Authentication or permission errors

### Error Response Format

```json
{
  "detail": "Please provide an image.",
  "status_code": 400,
  "type": "missing_image"
}
```

**Common Error Types**:

**400 Bad Request**:
- `missing_image` - No image file provided
- `invalid_format` - Unsupported image format
- `file_too_large` - Image file exceeds size limit
- `invalid_parameter` - Invalid parameter value

**403 Forbidden**:
- `forbidden` - Access denied
- `invalid_api_key` - API key is invalid or expired
- `insufficient_permissions` - API key lacks required permissions
- `plan_limit_exceeded` - Usage limit for current plan exceeded

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper commit messages
4. Build and test locally
5. Submit a pull request

## License

ISC License