// Replace from line 390-403 in useChatState.tsx
      
      // Update the user message to show the error
      updateMessageStatus(messageId, MessageStatus.ERROR, 'Failed to send message');
      
      // Create user-friendly error message
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Show notification to user
      showError(errorMsg, 'Message Error');
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: `Sorry, there was an error: ${errorMsg}. Please try again or refresh the page.`,
        timestamp: new Date(),
        status: MessageStatus.ERROR
      };
      
      setMessages(prev => [...prev, errorMessage]);