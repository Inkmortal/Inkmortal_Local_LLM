from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Seadragon LLM API",
    description="API for the Seadragon LLM Server",
    version="0.1.0",
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://chat.seadragoninkmortal.com",
        "https://admin.seadragoninkmortal.com",
        "http://localhost:3000"  # For local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Seadragon LLM Server"}