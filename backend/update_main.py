"""
Helper script to update main.py
Run this with: python update_main.py
"""

import re

# Read the file
with open('app/main.py', 'r') as f:
    content = f.read()

# Insert the new code after the system_stats_router inclusion
new_code = """app.include_router(system_stats_router)

# Include artifacts router for LaTeX, PDF, and image processing
from .api.artifacts import router as artifacts_router
app.include_router(artifacts_router)"""

# Replace in the file
updated_content = content.replace("app.include_router(system_stats_router)", new_code)

# Write back to the file
with open('app/main.py', 'w') as f:
    f.write(updated_content)

print("Updated main.py successfully!")