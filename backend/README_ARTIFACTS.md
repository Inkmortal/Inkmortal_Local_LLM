# Artifacts Processing API

This module provides server-side rendering for math expressions, PDF previews, and image processing.

## Setup

1. Install the required dependencies:

```bash
pip install katex pdf2image Pillow
```

2. For PDF processing, you'll need poppler-utils:

   - On Ubuntu/Debian:
     ```bash
     apt-get install poppler-utils
     ```
   
   - On macOS with Homebrew:
     ```bash
     brew install poppler
     ```
   
   - On Windows, download from: https://github.com/oschwartz10612/poppler-windows/releases
     Add the bin directory to your PATH

## API Endpoints

### Math Rendering

- **URL**: `/api/artifacts/render-math`
- **Method**: `POST`
- **Auth Required**: Yes
- **Form Parameters**:
  - `math_expression`: The LaTeX math string to render
  - `display_mode`: Boolean (true for display mode, false for inline)
- **Response**:
  ```json
  {
    "success": true,
    "html": "<span class=\"katex\">...</span>"
  }
  ```

### PDF Preview

- **URL**: `/api/artifacts/render-pdf`
- **Method**: `POST`
- **Auth Required**: Yes
- **Form Parameters**:
  - `file`: The PDF file
  - `page`: Page number to render (default: 1)
- **Response**:
  ```json
  {
    "success": true,
    "image": "data:image/jpeg;base64,...",
    "page_count": 10
  }
  ```

### Image Processing

- **URL**: `/api/artifacts/process-image`
- **Method**: `POST`
- **Auth Required**: Yes
- **Form Parameters**:
  - `file`: The image file
  - `resize`: Boolean whether to resize (default: false)
  - `max_width`: Maximum width for resizing (default: 800)
  - `max_height`: Maximum height for resizing (default: 800)
- **Response**:
  ```json
  {
    "success": true,
    "image": "data:image/jpeg;base64,...",
    "width": 800,
    "height": 600,
    "format": "JPEG"
  }
  ```

### Health Check

- **URL**: `/api/artifacts/health`
- **Method**: `GET`
- **Auth Required**: No
- **Response**:
  ```json
  {
    "status": "healthy",
    "features": {
      "math_rendering": true,
      "pdf_processing": true,
      "image_processing": true
    }
  }
  ```

## Frontend Integration

Import the service functions from `mathService.ts`:

```typescript
import { renderMathExpression, renderPdfPreview, processImage } from '../services/mathService';

// Render math expression
const html = await renderMathExpression('E = mc^2', true);

// Generate PDF preview
const pdfResult = await renderPdfPreview(pdfFile, 1);

// Process image
const imageResult = await processImage(imageFile, true, 800, 600);
```

## Error Handling

Each endpoint includes error handling. If the server encounters issues:

1. For math rendering, it returns the original LaTeX expression
2. For PDF and image processing, it returns error details
3. The client-side service handles fallbacks automatically