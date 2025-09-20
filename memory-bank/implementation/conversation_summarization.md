# Conversation Summarization Implementation Plan

## Overview

This document outlines the implementation plan for adding conversation summarization to effectively manage context windows for LLMs up to 128k tokens. Rather than showing context management in the frontend, this implementation focuses on backend management with seamless summarization that's transparent to users.

## Core Concept

The system will:
1. Add a summary field to store the conversation context up to a certain point
2. Track which messages have already been summarized
3. When context exceeds a threshold, summarize messages and update the marker
4. Send context as: `conversation_summary + unsummarized_messages`
5. Never delete messages - only update what's included directly in the context

## Database Schema Changes

### Conversation Model Updates

Add to the `Conversation` model:
```python
conversation_summary = Column(Text, nullable=True)
last_summarized_message_id = Column(String(36), nullable=True)
```

### Config Table Updates

Add settings to the admin-configurable `config` table:
```sql
-- Add to config table for admin control
INSERT INTO config (key, value, description) 
VALUES ('summarization_model', 'llama3.3:latest', 'Model used for conversation summarization');

INSERT INTO config (key, value, description) 
VALUES ('max_context_tokens', '120000', 'Maximum context window size in tokens');

INSERT INTO config (key, value, description) 
VALUES ('summarization_threshold', '70', 'Percentage of max context at which to trigger summarization');
```

## New Components

### 1. Token Counting Service

Create a new token counting service using tiktoken for accurate token counting:

- Functions to count tokens for single message and full conversations
- Support for different model encodings (different models use different tokenizers)
- Fallback mechanism for when tokenizer isn't available
- Token counting optimizations for performance

### 2. Summarization Service

Create a summarization service with these key methods:

- `check_conversation_needs_summary(conversation_id)`: Calculate if context size exceeds threshold
- `generate_summary(conversation_id)`: Create a summary of messages up to last_summarized_message_id
- `get_optimized_context(conversation_id)`: Build optimized context combining summary with recent messages

### 3. Integration with Message Processing

Modify the streaming message flow:

1. Check if conversation needs summarization before sending to LLM
2. If needed, generate a summary asynchronously 
3. Build the context using summary + recent messages
4. Use token estimations to ensure context fits within limits

## Admin Panel Updates

Add new settings to the admin panel:
- Ability to select different summarization models
- Configure context window size limits
- Set summarization thresholds

## Implementation Flow

1. User sends a message
2. System checks if context exceeds threshold
3. If needed, summarization service creates a new summary
4. Context builder creates efficient context with summary + recent messages
5. LLM receives optimized context and generates response
6. All UI interactions remain unchanged - process is transparent to users

## Advantages of This Approach

1. **Elegant and Clean**: Clear separation of concerns with dedicated services
2. **Transparent to Users**: No UI changes necessary
3. **Scalable**: Works with any model regardless of context size
4. **Configurable**: Admin can adjust settings based on needs
5. **Preservation of History**: Maintains full message history
6. **Efficient**: Only summarizes when necessary

## Technical Requirements

1. Add `tiktoken` to requirements.txt
2. Create database migration for schema changes
3. Implement token counting service
4. Implement summarization service
5. Update context building logic in message processing
6. Add admin panel configuration options

This plan provides a maintainable, elegant solution that scales well with longer conversations while preserving complete history and ensuring efficient context management.