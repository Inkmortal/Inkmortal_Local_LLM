# Project Seadragon LLM Server

## Project Overview
A self-hosted LLM server system running on a Mac Mini M4 Pro, designed to provide controlled access to local LLM capabilities through a priority-based queue system. The system serves multiple user types through different interfaces while maintaining control over resource allocation and access.

## Project Context
This is a personal hobby project designed to provide LLM capabilities primarily for:
- Educational assistance (solving math problems, answering textbook questions)
- Coding help for personal projects
- Creating a "tutor-like" experience in the chat interface

The web interface is designed to be fun, beautiful, and functional, allowing friends and family to upload images of textbooks, get help with math problems, receive coding assistance, and more. While not designed as an enterprise-level system, the architecture ensures efficient resource usage and provides a solid foundation for personal educational needs.

## Hardware Specifications
- Mac Mini M4 Pro
- 12-core CPU (8 performance cores, 4 efficiency cores)
- 16-core GPU
- 16-core Neural Engine
- 64GB unified RAM
- 1TB storage
- 273GB/s memory bandwidth
- Hardware-accelerated media capabilities

## Core Goals
1. Host and serve large language models locally (targeting 70B parameter models)
2. Provide remote access to LLM capabilities from anywhere
3. Manage multiple types of access with priority-based queuing
4. Maintain control over user access and resource allocation

## System Components

### LLM Backend
- Running Ollama for model serving
- Supporting large models (Llama 70B or Qwen 32B)
- Transparent proxy system for request management
- Priority-based queue system for request handling

### Access Control
- Registration token system for new users
- IP whitelisting for direct API access
- Custom API key system with assignable priorities
- Admin interface for access management

### User Interfaces
1. Direct API Access (Priority 1)
    - Support for coding tools (Cline, Roo)
    - IP whitelist controlled
    - Transparent Ollama API compatibility

2. Custom Applications (Priority 2)
    - API key-based access
    - Configurable priority levels
    - Usage tracking and monitoring

3. Web Interface (Priority 3)
    - Chat interface for friends and family
    - Token-based registration system
    - User authentication

### Queue Management
- Priority-based request processing
- Request source identification
- Request aging to prevent starvation
- Multiple priority levels
    - Level 1: Direct API (coding tools)
    - Level 2: Custom applications (configurable)
    - Level 3: Web interface users

### Administration
- Admin panel for system management
- Registration token generation
- IP whitelist management
- API key management and monitoring
- Queue monitoring and control
- System statistics and usage tracking

## Technical Architecture

### Domain Structure
- Main domain: seadragoninkmortal.com
- Subdomains:
    - local-llm.seadragoninkmortal.com (API access)
    - chat.seadragoninkmortal.com (Web interface)
    - admin.seadragoninkmortal.com (Admin panel)

### Network Architecture
- Cloudflare tunnel for secure remote access
- Nginx reverse proxy for request routing
- FastAPI backend for request management
- React frontend for web interfaces

### Security Features
- Token-based registration system
- IP whitelisting for direct API access
- API key authentication for custom applications
- JWT-based user authentication
- Request source validation
- Cloudflare tunnel encryption

## Implementation Priorities
1. Core LLM serving capabilities
2. Queue management system
3. Authentication and access control
4. Admin interface and monitoring
5. Web interface for users
6. Custom application support

## Key Requirements

### Performance
- Support for simultaneous request queuing
- Efficient request prioritization
- Minimal latency for high-priority requests
- Resource optimization for M4 Mac Mini

### Security
- Secure remote access
- Controlled user registration
- API access management
- Request validation and monitoring

### Usability
- Simple registration process
- Easy API integration
- Intuitive admin interface
- Responsive web chat interface

### Monitoring
- Queue status monitoring
- System resource tracking
- Usage statistics
- API key usage tracking

## Future Considerations
- Support for multiple models
- Advanced queue optimization
- Enhanced monitoring capabilities
- Custom model fine-tuning support
- Automated scaling and load management

## Project Success Metrics
1. Successful remote access to LLM capabilities
2. Effective priority-based request handling
3. Controlled user access management
4. System stability and performance
5. User satisfaction (both API and web interface)

## Development Guidelines
1. Focus on maintainability and clarity
2. Implement robust error handling
3. Ensure comprehensive logging
4. Follow security best practices
5. Maintain modular architecture

## Technical Stack
- Backend: Python (FastAPI)
- Frontend: React with TypeScript
- Database: PostgreSQL
- LLM Server: Ollama
- Proxy: Nginx
- Network: Cloudflare Tunnel
- Authentication: JWT
- Monitoring: Custom implementation using FastAPI and React