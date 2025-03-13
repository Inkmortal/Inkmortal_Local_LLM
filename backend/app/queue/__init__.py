"""
Queue module for managing LLM requests.
"""

from importlib import import_module
from typing import Type, Union

from .models import RequestPriority, QueuedRequest, QueueStats
from .interface import QueueManagerInterface
from ..config import settings

def get_queue_manager() -> QueueManagerInterface:
    """
    Factory function to get the appropriate queue manager implementation
    based on the current environment.
    
    Returns:
        QueueManagerInterface: An instance of the appropriate queue manager
    """
    # Import the appropriate implementation based on settings
    module_path, class_name = settings.queue_manager_class.rsplit('.', 1)
    print(f"Queue Manager Debug: Using module={module_path}, class={class_name}")
    module = import_module(module_path)
    manager_class = getattr(module, class_name)
    
    # Call the implementation's factory function
    if hasattr(module, 'get_queue_manager'):
        return getattr(module, 'get_queue_manager')()
    
    # Or create a new instance if no factory function exists
    return manager_class()

__all__ = [
    'RequestPriority',
    'QueuedRequest',
    'QueueStats',
    'QueueManagerInterface',
    'get_queue_manager'
]