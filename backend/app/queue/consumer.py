"""
Queue consumer implementation for processing messages from RabbitMQ.
"""
import logging
import asyncio
import traceback
from typing import Set, List, Dict, Any
from datetime import datetime
from collections import deque
import copy

from ..queue.interface import QueueManagerInterface
from ..queue.models import QueuedRequest
from ..api.chat.websocket import manager

logger = logging.getLogger("app.queue_consumer")

# Store processed request history (limited size)
MAX_HISTORY_SIZE = 100
request_history = deque(maxlen=MAX_HISTORY_SIZE)

def get_request_history() -> List[Dict[str, Any]]:
    """Get the request history for admin panel"""
    # Convert deque to list and return a copy to prevent modification
    return list(request_history)

# Track processed requests to avoid duplicates
processed_requests: Set[str] = set()
max_processed_history = 1000  # Limit memory usage

async def start_message_consumer(queue_manager: QueueManagerInterface):
    """Background task to continuously process messages from the queue"""
    global processed_requests
    import time
    from datetime import datetime
    
    logger.info("Starting background message consumer")
    
    # For periodic queue status logging
    last_queue_log_time = time.time()
    log_interval = 10  # Log queue status every 10 seconds
    
    while True:
        try:
            # Periodic logging of queue sizes (every N seconds)
            current_time = time.time()
            if current_time - last_queue_log_time > log_interval:
                queue_sizes = await queue_manager.get_queue_size()
                # Format queue sizes with priority names
                from ..queue.models import RequestPriority
                size_info = []
                for p in sorted(RequestPriority):
                    size = queue_sizes.get(p, 0)
                    size_info.append(f"{p.name}: {size}")
                
                total_messages = sum(queue_sizes.values())
                if total_messages > 0:
                    logger.info(f"Queue status: {', '.join(size_info)}, total: {total_messages}")
                last_queue_log_time = current_time
            
            # Check each priority queue in order
            priorities_checked = []
            from ..queue.models import RequestPriority
            
            # DETAILED DEBUG: Log detailed queue state before trying to get message
            try:
                queue_sizes = await queue_manager.get_queue_size()
                logger.info(f"QUEUE PEEK: Queue sizes before get_next_request: {queue_sizes}")
                if sum(queue_sizes.values()) == 0:
                    logger.debug("QUEUE PEEK: All queues empty, nothing to process")
            except Exception as e:
                logger.error(f"QUEUE PEEK ERROR: {str(e)}")
            
            # Get next message from highest priority queue that has messages
            request = await queue_manager.get_next_request()
            
            # Log which priorities were checked
            if request:
                # Calculate age of message
                age_seconds = (datetime.utcnow() - request.timestamp).total_seconds()
                
                # Get priority info for clearer logging
                if hasattr(request.priority, 'name'):
                    priority_info = f"{request.priority.name} (value: {request.priority.value})"
                else:
                    priority_info = str(request.priority)
                    
                logger.info(f"Processing message with age {age_seconds:.1f}s from priority {priority_info}")
                logger.info(f"QUEUE GOT MESSAGE: Request ID: {request.timestamp.timestamp()}-{request.user_id}, endpoint: {request.endpoint}")
            else:
                logger.debug("No message found in any priority queue")
                logger.debug("QUEUE GOT MESSAGE: No message returned from get_next_request")
            
            if request:
                # Generate a unique identifier for this request
                request_id = f"{request.timestamp.timestamp()}-{request.user_id}"
                
                # Skip if already processed (prevents double processing)
                if request_id in processed_requests:
                    logger.warning(f"Skipping already processed request: {request_id}")
                    
                    # Instead of skipping completely, still tell the frontend we're handling it
                    if request.body.get("assistant_message_id"):
                        assistant_message_id = request.body.get("assistant_message_id")
                        user_id = request.user_id
                        conversation_id = request.body.get("conversation_id")
                        
                        try:
                            # Send a confirmation message via WebSocket to prevent client waiting forever
                            logger.info(f"Sending status update for duplicate request {request_id} to user {user_id}")
                            await manager.send_update(user_id, {
                                "type": "message_update",
                                "message_id": assistant_message_id,
                                "conversation_id": conversation_id,
                                "status": "PROCESSING",
                                "assistant_content": "",
                                "processing": True,
                                "message": "Your message is already being processed."
                            })
                        except Exception as ws_err:
                            logger.error(f"Failed to send duplicate status update: {str(ws_err)}")
                    
                    continue
                
                # Process the message based on request type
                logger.info(f"Processing request: {request.endpoint} from user {request.user_id}")
                
                # Check if this is a streaming request
                is_streaming = request.body.get("stream", False) or "streaming" in request.endpoint
                
                # Make a copy of the request for history before processing
                history_request = copy.deepcopy(request)
                history_request.processing_start = datetime.utcnow()
                
                try:
                    if is_streaming:
                        # For streaming requests, create a task to handle streaming
                        asyncio.create_task(process_streaming_request(queue_manager, request))
                    else:
                        # For non-streaming requests, process normally
                        result = await queue_manager.process_request(request)
                        
                        # Record successful processing in history
                        history_request.status = "completed"
                        history_request.processing_end = datetime.utcnow()
                        request_history.appendleft(history_request)
                        logger.info(f"Added completed request to history: {request.endpoint}")
                except Exception as e:
                    # Record failed processing in history
                    history_request.status = "failed"
                    history_request.error = str(e)
                    history_request.processing_end = datetime.utcnow()
                    request_history.appendleft(history_request)
                    logger.warning(f"Added failed request to history: {request.endpoint}, error: {str(e)}")
                    # Re-raise to be caught by outer exception handler
                    raise
                
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
    # Make a copy of the request for history
    history_request = copy.deepcopy(request)
    history_request.processing_start = datetime.utcnow()
    
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
        
        # Record successful completion in history
        logger.info(f"Completed streaming request for message {message_id}, processed {chunk_count} chunks")
        history_request.status = "completed"
        history_request.processing_end = datetime.utcnow()
        request_history.appendleft(history_request)
        
    except Exception as e:
        # Record failure in history
        logger.error(f"Error processing streaming request: {str(e)}")
        logger.error(f"Exception details: {traceback.format_exc()}")
        
        history_request.status = "failed"
        history_request.error = str(e)
        history_request.processing_end = datetime.utcnow()
        request_history.appendleft(history_request)
