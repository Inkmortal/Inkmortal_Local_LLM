"""
API endpoints for handling artifacts like rendered math, PDF previews, and image processing.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
import json
import io
import os
import uuid
import base64
from pathlib import Path
import mimetypes

from ..db import get_db
from ..auth.utils import get_current_user, validate_api_key
from ..auth.models import User
from ..config import settings

# Create router
router = APIRouter(prefix="/api/artifacts", tags=["artifacts"])

# Directory to store temporary files
TEMP_DIR = Path("./tmp/artifacts")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/render-math", response_class=JSONResponse)
async def render_math(
    math_expression: str = Form(...),
    display_mode: bool = Form(False),
    current_user: User = Depends(get_current_user)
):
    """
    Render LaTeX math expression to HTML using Python-based KaTeX.
    Requires authentication.
    """
    try:
        # Import here to avoid dependency issues if the library is not installed
        import katex
        
        # Use KaTeX to render the LaTeX expression to HTML
        rendered_html = katex.render(
            math_expression, 
            display_mode=display_mode,
            throw_on_error=False
        )
        
        return {
            "success": True,
            "html": rendered_html
        }
    except ImportError:
        return {
            "success": False,
            "error": "KaTeX library not installed on the server",
            "fallback_latex": math_expression
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "fallback_latex": math_expression
        }

@router.post("/render-pdf", response_class=JSONResponse)
async def render_pdf(
    file: UploadFile = File(...),
    page: int = Form(1),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a preview image of a specific page from a PDF file.
    Returns a base64-encoded image.
    """
    try:
        # Import here to avoid dependency issues if the library is not installed
        from pdf2image import convert_from_bytes
        from PIL import Image
        
        # Read the uploaded PDF file
        content = await file.read()
        
        # Generate a unique file ID
        file_id = str(uuid.uuid4())
        temp_path = TEMP_DIR / f"{file_id}.pdf"
        
        # Save the uploaded file temporarily
        with open(temp_path, "wb") as f:
            f.write(content)
        
        try:
            # Convert the specified page of the PDF to an image
            images = convert_from_bytes(
                content,
                first_page=page,
                last_page=page,
                dpi=150,
                fmt="jpeg",
                size=(800, None)  # Width of 800px, height proportional
            )
            
            if not images:
                return {
                    "success": False,
                    "error": "Failed to generate PDF preview"
                }
            
            # Get the first page image (since we only requested one page)
            img = images[0]
            
            # Convert PIL image to base64-encoded JPEG
            buffered = io.BytesIO()
            img.save(buffered, format="JPEG", quality=85)
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            return {
                "success": True,
                "image": f"data:image/jpeg;base64,{img_str}",
                "page_count": len(convert_from_bytes(content, dpi=1))  # Get page count with low dpi for speed
            }
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except ImportError:
        return {
            "success": False,
            "error": "PDF processing libraries not installed on the server"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.post("/process-image", response_class=JSONResponse)
async def process_image(
    file: UploadFile = File(...),
    resize: Optional[bool] = Form(False),
    max_width: Optional[int] = Form(800),
    max_height: Optional[int] = Form(800),
    current_user: User = Depends(get_current_user)
):
    """
    Process an image file - resize if needed and return as base64.
    Supports JPEG, PNG, GIF, and WebP formats.
    """
    try:
        # Import here to avoid dependency issues if the library is not installed
        from PIL import Image
        
        # Read the uploaded image file
        content = await file.read()
        
        # Open the image with PIL
        img = Image.open(io.BytesIO(content))
        
        # Resize if requested
        if resize and (img.width > max_width or img.height > max_height):
            img.thumbnail((max_width, max_height), Image.LANCZOS)
        
        # Convert to RGB if mode is RGBA (for JPEG compatibility)
        if img.mode == 'RGBA':
            # Use white background for transparent images
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])  # 3 is the alpha channel
            img = background
        
        # Convert PIL image to base64
        buffered = io.BytesIO()
        
        # Preserve original format if possible, otherwise use JPEG
        format_name = file.filename.split('.')[-1].upper()
        if format_name not in ['JPEG', 'JPG', 'PNG', 'GIF', 'WEBP']:
            format_name = 'JPEG'
        
        # Convert format name to PIL format string
        if format_name in ['JPG', 'JPEG']:
            format_name = 'JPEG'
            img.save(buffered, format=format_name, quality=85)
        else:
            img.save(buffered, format=format_name)
        
        # Get the MIME type
        mime_type = mimetypes.guess_type(file.filename)[0] or f"image/{format_name.lower()}"
        
        # Convert to base64
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return {
            "success": True,
            "image": f"data:{mime_type};base64,{img_str}",
            "width": img.width,
            "height": img.height,
            "format": format_name
        }
        
    except ImportError:
        return {
            "success": False,
            "error": "Image processing libraries not installed on the server"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.get("/health")
async def artifacts_health():
    """Check if the artifact processing APIs are available"""
    
    status = {
        "math_rendering": False,
        "pdf_processing": False,
        "image_processing": False
    }
    
    # Check KaTeX
    try:
        import katex
        status["math_rendering"] = True
    except ImportError:
        pass
    
    # Check PDF processing
    try:
        from pdf2image import convert_from_bytes
        status["pdf_processing"] = True
    except ImportError:
        pass
    
    # Check image processing
    try:
        from PIL import Image
        status["image_processing"] = True
    except ImportError:
        pass
    
    # Overall status
    overall = all(status.values())
    
    return {
        "status": "healthy" if overall else "degraded",
        "features": status
    }