#!/bin/bash

# Seadragon LLM Server Setup Script (macOS/Linux)
# ===============================================

# ANSI color codes for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ASCII art logo
echo -e "${MAGENTA}"
cat << "EOF"
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║  ███████╗███████╗ █████╗ ██████╗ ██████╗  █████╗  ██████╗  ██████╗ ███╗   ██╗  ║
║  ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔════╝ ██╔═══██╗████╗  ██║  ║
║  ███████╗█████╗  ███████║██║  ██║██████╔╝███████║██║  ███╗██║   ██║██╔██╗ ██║  ║
║  ╚════██║██╔══╝  ██╔══██║██║  ██║██╔══██╗██╔══██║██║   ██║██║   ██║██║╚██╗██║  ║
║  ███████║███████╗██║  ██║██████╔╝██║  ██║██║  ██║╚██████╔╝╚██████╔╝██║ ╚████║  ║
║  ╚══════╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝  ║
║                                                                                ║
║                     𝕃𝕃𝕄 𝕊𝔼ℝ𝕍𝔼ℝ                                               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${RESET}"

echo -e "${CYAN}Initializing Seadragon LLM Server project setup...${RESET}"
sleep 0.5
echo -e "${YELLOW}Your personal AI tutor powered by Llama 3${RESET}"
sleep 0.5
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to display a spinner while a command is running
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Function to display progress bar
progress_bar() {
    local title=$1
    local duration=$2
    local width=30
    
    echo -e "${MAGENTA}[$title] ${RESET}"
    for ((i=0; i<=$width; i++)); do
        local percent=$((i*100/width))
        local progress=$(printf "%${i}s" | tr ' ' '█')
        local remaining=$(printf "%$((width-i))s" | tr ' ' ' ')
        echo -ne "\r[$title] |${progress}${remaining}| ${percent}%"
        sleep $(echo "scale=3; $duration/$width" | bc)
    done
    echo -e "\r[$title] |$(printf "%${width}s" | tr ' ' '█')| 100% ${GREEN}✓${RESET}"
}

# Check for required tools
echo -e "${BLUE}🔍 ${RESET}Checking for required tools..."

# Check Python
if command_exists python3; then
    PYTHON_CMD="python3"
elif command_exists python; then
    PYTHON_CMD="python"
else
    echo -e "${RED}❌ Python not found. Please install Python 3.9+ and try again.${RESET}"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
echo -e "${GREEN}✓ ${RESET}Found $PYTHON_VERSION"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ ${RESET}Found Node.js $NODE_VERSION"
else
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+ and try again.${RESET}"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ ${RESET}Found npm $NPM_VERSION"
else
    echo -e "${RED}❌ npm not found. Please install npm and try again.${RESET}"
    exit 1
fi

# Check PostgreSQL
if command_exists psql; then
    PSQL_VERSION=$(psql --version)
    echo -e "${GREEN}✓ ${RESET}Found $PSQL_VERSION"
else
    echo -e "${YELLOW}⚠️ ${RESET}PostgreSQL not found. You'll need to install PostgreSQL for database functionality."
    echo -e "   The application will use SQLite for development if PostgreSQL is not available."
    
    # Check if we're on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "   Install with: brew install postgresql"
    else
        echo -e "   Install with: sudo apt-get install postgresql (Debian/Ubuntu)"
        echo -e "   or: sudo yum install postgresql (RHEL/CentOS)"
    fi
fi

# Check RabbitMQ
if command_exists rabbitmqctl; then
    echo -e "${GREEN}✓ ${RESET}Found RabbitMQ"
else
    echo -e "${YELLOW}⚠️ ${RESET}RabbitMQ not found. You'll need to install RabbitMQ for queue functionality."
    
    # Check if we're on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "   Install with: brew install rabbitmq"
    else
        echo -e "   Install with: sudo apt-get install rabbitmq-server (Debian/Ubuntu)"
        echo -e "   or: sudo yum install rabbitmq-server (RHEL/CentOS)"
        echo -e "   or visit: https://www.rabbitmq.com/download.html"
    fi
fi

# Check Ollama
if command_exists ollama; then
    echo -e "${GREEN}✓ ${RESET}Found Ollama"
    
    # Check if Llama 3 model is installed
    echo -e "${BLUE}🤖 ${RESET}Checking for Llama 3 model..."
    if ollama list 2>/dev/null | grep -q "llama3.3"; then
        echo -e "${GREEN}✓ ${RESET}Found Llama 3 model"
    else
        echo -e "${YELLOW}⚠️ ${RESET}Llama 3 model not found. Installing..."
        echo -e "   This may take a while..."
        ollama pull llama3.3:70b
    fi
else
    echo -e "${YELLOW}⚠️ ${RESET}Ollama not found. You'll need to install Ollama for LLM functionality."
    
    # Check if we're on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "   Install with: brew install ollama"
    else
        echo -e "   Download from: https://ollama.ai/download"
    fi
fi

# Check if we're on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${BLUE}🍎 ${RESET}macOS detected"
    
    # Check for Homebrew
    if command_exists brew; then
        BREW_VERSION=$(brew --version | head -n 1)
        echo -e "${GREEN}✓ ${RESET}Found $BREW_VERSION"
    else
        echo -e "${YELLOW}⚠️ ${RESET}Homebrew not found. It's recommended for managing dependencies on macOS."
        echo -e "   Install from https://brew.sh if desired."
    fi
    
    # Check for pyenv
    if command_exists pyenv; then
        PYENV_VERSION=$(pyenv --version)
        echo -e "${GREEN}✓ ${RESET}Found $PYENV_VERSION"
    else
        echo -e "${YELLOW}⚠️ ${RESET}pyenv not found. It's recommended for managing Python versions."
        echo -e "   Install with: brew install pyenv"
    fi
fi

echo ""
echo -e "${CYAN}🚀 ${RESET}Setting up project structure..."

# Create directory structure if it doesn't exist
mkdir -p backend/app/{api,auth,queue} frontend/{public,src/{components,pages}} nginx scripts

# Create empty __init__.py files for Python packages
touch backend/app/__init__.py backend/app/api/__init__.py backend/app/auth/__init__.py backend/app/queue/__init__.py

echo -e "${GREEN}✓ ${RESET}Project structure created"

# Setup Backend
echo ""
echo -e "${CYAN}🐍 ${RESET}Setting up backend environment..."

cd backend

# Create virtual environment
echo -e "${BLUE}Creating Python virtual environment...${RESET}"
$PYTHON_CMD -m venv venv
echo -e "${GREEN}✓ ${RESET}Virtual environment created"

# Activate virtual environment
echo -e "${BLUE}Activating virtual environment...${RESET}"
source venv/bin/activate

# Install backend dependencies
echo -e "${BLUE}Installing Python dependencies...${RESET}"
progress_bar "Installing backend dependencies" 2

# Check if requirements.txt exists
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    pip install fastapi uvicorn sqlalchemy psycopg2-binary httpx python-jose[cryptography] python-multipart python-dotenv aio-pika pika
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo -e "${BLUE}Creating .env file from example...${RESET}"
    cp .env.example .env
    echo -e "${GREEN}✓ ${RESET}Created .env file"
elif [ ! -f ".env" ]; then
    echo -e "${BLUE}Creating .env file...${RESET}"
    cat > .env << EOF
# Database configuration
DATABASE_URL=postgresql://postgres:postgres@localhost/seadragon
# For SQLite (fallback)
# DATABASE_URL=sqlite:///./seadragon.db

# JWT configuration
JWT_SECRET_KEY=CHANGE_ME_IN_PRODUCTION
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Ollama configuration
OLLAMA_API_URL=http://localhost:11434

# RabbitMQ configuration
RABBITMQ_URL=amqp://guest:guest@localhost/

# IP whitelist for direct API access (comma-separated)
WHITELISTED_IPS=127.0.0.1,::1
EOF
    echo -e "${GREEN}✓ ${RESET}Created .env file"
fi

# Return to project root
cd ..

# Setup Frontend
echo ""
echo -e "${CYAN}🎨 ${RESET}Setting up frontend environment..."

cd frontend

# Install frontend dependencies
echo -e "${BLUE}Installing Node.js dependencies...${RESET}"
progress_bar "Installing React and dependencies" 3
npm install

# Create .env file for frontend
if [ ! -f ".env" ]; then
    echo -e "${BLUE}Creating frontend .env file...${RESET}"
    cat > .env << EOF
VITE_API_URL=http://localhost:8000
VITE_WEBSOCKET_URL=ws://localhost:8000/ws
EOF
    echo -e "${GREEN}✓ ${RESET}Created frontend .env file"
fi

# Return to project root
cd ..

# Setup completion
echo ""
echo -e "${GREEN}✨ ${RESET}Setup completed successfully!"

cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║               🌟  Setup complete! Ready to go!  🌟           ║
║                                                               ║
║  To start the development server:                             ║
║                                                               ║
║  1. Ollama:                                                   ║
║     - Ensure Ollama is running                                ║
║     - Model llama3.3:70b should be downloaded                 ║
║                                                               ║
║  2. RabbitMQ:                                                 ║
║     - Ensure RabbitMQ service is running                      ║
║     - Default credentials: guest/guest                        ║
║                                                               ║
║  3. Database:                                                 ║
║     - Create a PostgreSQL database named 'seadragon'          ║
║     - Or use SQLite by updating the DATABASE_URL in .env      ║
║                                                               ║
║  4. Backend:                                                  ║
║     cd backend                                                ║
║     source venv/bin/activate                                  ║
║     uvicorn app.main:app --reload                             ║
║                                                               ║
║  5. Frontend:                                                 ║
║     cd frontend                                               ║
║     npm run dev                                               ║
║                                                               ║
║  6. API Documentation:                                        ║
║     - Visit http://localhost:8000/docs when backend is running║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF

echo ""
echo -e "${MAGENTA}Happy coding! 🚀${RESET}"