"""
Queue consumer implementation for processing messages from RabbitMQ.
"""
import logging
import asyncio
import traceback
from typing import Set

from ..queue.interface import QueueManagerInterface
from ..api.chat.websocket import manager

logger = logging.getLogger("app.queue_consumer")

# Track processed requests to avoid duplicates
processed_requests: Set[str] = set()
max_processed_history = 1000  # Limit memory usage

async def start_message_consumer(queue_manager: QueueManagerInterface):
    """Background task to continuously process messages from the queue"""
    global processed_requests
    
    logger.info("Starting background message consumer")
    
    while True:
        try:
            # Get next message from queue
            request = await queue_manager.get_next_request()
            if request:
                # Generate a unique identifier for this request
                request_id = f"{request.timestamp.timestamp()}-{request.user_id}"
                
                # Skip if already processed (prevents double processing)
                if request_id in processed_requests:
                    logger.warning(f"Skipping already processed request: {request_id}")
                    continue
                
                # Process the message based on request type
                logger.info(f"Processing request: {request.endpoint} from user {request.user_id}")
                
                # Check if this is a streaming request
                is_streaming = request.body.get("stream", False) or "streaming" in request.endpoint
                if is_streaming:
                    # For streaming requests, create a task to handle streaming
                    asyncio.create_task(process_streaming_request(queue_manager, request))
                else:
                    # For non-streaming requests, process normally
                    await queue_manager.process_request(request)
                
                # Mark as processed
                processed_requests.add(request_id)
                if len(processed_requests) > max_processed_history:
                    # Keep memory usage bounded by removing oldest entries
                    processed_requests = set(list(processed_requests)[-max_processed_history:])
            else:
                # No messages, sleep briefly before checking again
                await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"Error in message consumer: {str(e)}")
            logger.error(f"Exception details: {traceback.format_exc()}")
            # Sleep briefly to prevent tight loop on persistent errors
            await asyncio.sleep(1)

async def process_streaming_request(queue_manager, request):
    """Process a streaming request asynchronously"""
    try:
        # Get user ID for WebSocket updates
        user_id = request.user_id
        
        # Get necessary IDs from request
        conversation_id = request.body.get("conversation_id")
        message_id = request.body.get("assistant_message_id") or request.body.get("message_id")
        
        # Log this processing event
        logger.info(f"Processing streaming request for user {user_id}, message {message_id}")
        
        # Process the streaming request
        chunk_count = 0
        async for chunk in queue_manager.process_streaming_request(request):
            chunk_count += 1
            if chunk_count == 1 or chunk_count % 50 == 0:
                logger.info(f"Processed {chunk_count} chunks for message {message_id}")
        
        logger.info(f"Completed streaming request for message {message_id}, processed {chunk_count} chunks")
    except Exception as e:
        logger.error(f"Error processing streaming request: {str(e)}")
        logger.error(f"Exception details: {traceback.format_exc()}")