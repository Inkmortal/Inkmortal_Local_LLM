import { API_BASE_URL } from '../config/api';

/**
 * Renders a LaTeX mathematical expression using server-side KaTeX
 * 
 * @param expression - The LaTeX expression to render
 * @param displayMode - Whether to render in display mode (centered, large) or inline mode
 * @returns The HTML string of the rendered expression or null if failed
 */
export async function renderMathExpression(expression: string, displayMode: boolean = false) {
  try {
    // Create form data for the request
    const formData = new FormData();
    formData.append('math_expression', expression);
    formData.append('display_mode', displayMode.toString());
    
    // Get authentication token from localStorage
    const token = localStorage.getItem('token');
    
    // Send request to the server
    const response = await fetch(`${API_BASE_URL}/api/artifacts/render-math`, {
      method: 'POST',
      headers: {
        // No Content-Type header when using FormData (browser sets it automatically)
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.html;
    } else {
      console.error('Error rendering math:', data.error);
      // Return the fallback LaTeX if available
      return data.fallback_latex ? `${displayMode ? '$$' : '$'}${data.fallback_latex}${displayMode ? '$$' : '$'}` : null;
    }
  } catch (error) {
    console.error('Failed to render math expression:', error);
    // Return the original expression wrapped in LaTeX delimiters as fallback
    return `${displayMode ? '$$' : '$'}${expression}${displayMode ? '$$' : '$'}`;
  }
}

/**
 * Generates a preview image for a PDF file
 * 
 * @param file - The PDF file to render
 * @param page - The page number to render (1-based)
 * @returns Object containing the base64 image and page count
 */
export async function renderPdfPreview(file: File, page: number = 1) {
  try {
    // Create form data for the request
    const formData = new FormData();
    formData.append('file', file);
    formData.append('page', page.toString());
    
    // Get authentication token from localStorage
    const token = localStorage.getItem('token');
    
    // Send request to the server
    const response = await fetch(`${API_BASE_URL}/api/artifacts/render-pdf`, {
      method: 'POST',
      headers: {
        // No Content-Type header when using FormData (browser sets it automatically)
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (data.success) {
      return {
        image: data.image,  // Base64 encoded image
        pageCount: data.page_count,
        error: null
      };
    } else {
      console.error('Error rendering PDF:', data.error);
      return {
        image: null,
        pageCount: 0,
        error: data.error
      };
    }
  } catch (error) {
    console.error('Failed to render PDF:', error);
    return {
      image: null,
      pageCount: 0,
      error: 'Failed to render PDF preview'
    };
  }
}

/**
 * Processes an image file (resize, optimize)
 * 
 * @param file - The image file to process
 * @param resize - Whether to resize the image
 * @param maxWidth - Maximum width for resizing
 * @param maxHeight - Maximum height for resizing
 * @returns Object containing the processed image data
 */
export async function processImage(file: File, resize: boolean = false, maxWidth: number = 800, maxHeight: number = 800) {
  try {
    // Create form data for the request
    const formData = new FormData();
    formData.append('file', file);
    formData.append('resize', resize.toString());
    formData.append('max_width', maxWidth.toString());
    formData.append('max_height', maxHeight.toString());
    
    // Get authentication token from localStorage
    const token = localStorage.getItem('token');
    
    // Send request to the server
    const response = await fetch(`${API_BASE_URL}/api/artifacts/process-image`, {
      method: 'POST',
      headers: {
        // No Content-Type header when using FormData (browser sets it automatically)
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (data.success) {
      return {
        image: data.image,  // Base64 encoded image
        width: data.width,
        height: data.height,
        format: data.format,
        error: null
      };
    } else {
      console.error('Error processing image:', data.error);
      return {
        image: null,
        width: 0,
        height: 0,
        format: null,
        error: data.error
      };
    }
  } catch (error) {
    console.error('Failed to process image:', error);
    return {
      image: null,
      width: 0,
      height: 0,
      format: null,
      error: 'Failed to process image'
    };
  }
}