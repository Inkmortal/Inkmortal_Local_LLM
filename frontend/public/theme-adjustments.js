// This file contains runtime adjustments for the Inkmortal Dragon/Cultivator theme

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // 1. Update the logo text from SeaDragon to InkMortal
  const logoElements = document.querySelectorAll('span.text-lg.font-semibold');
  logoElements.forEach(element => {
    if (element.textContent.trim() === 'SeaDragon') {
      element.textContent = 'InkMortal';
      
      // Update the styling
      element.style.background = 'linear-gradient(135deg, #d4af37, #a57c1b)';
      element.style.WebkitBackgroundClip = 'text';
      element.style.WebkitTextFillColor = 'transparent';
      
      // Add cultivator-themed glow
      element.style.textShadow = '0 0 5px rgba(212, 175, 55, 0.3)';
    }
  });
  
  // 2. Update the app description
  const appDescriptions = document.querySelectorAll('div.text-xs.font-light');
  appDescriptions.forEach(element => {
    if (element.textContent.includes('Artificial Intelligence')) {
      element.textContent = 'Powered by Cultivation Arts';
      element.style.color = 'rgba(212, 175, 55, 0.7)';
    }
  });
  
  // 3. Add dragon/cultivator theme classes to all assistant message elements
  const assistantMessages = document.querySelectorAll('[class*="message-in"]');
  assistantMessages.forEach(element => {
    element.classList.add('assistant-message');
    
    // Add decorative elements
    const decoration = document.createElement('div');
    decoration.className = 'message-decoration';
    decoration.style.position = 'absolute';
    decoration.style.top = '0';
    decoration.style.left = '0';
    decoration.style.right = '0';
    decoration.style.height = '1px';
    decoration.style.background = 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent)';
    element.appendChild(decoration);
  });
  
  // 4. Update assistant avatars
  const assistantAvatars = document.querySelectorAll('div.rounded-full.flex-shrink-0.mr-3');
  assistantAvatars.forEach(avatar => {
    avatar.classList.add('assistant-avatar', 'cultivator-avatar');
    
    // Replace SVG with dragon icon
    const svgContainer = avatar.querySelector('div.absolute.inset-0.flex');
    if (svgContainer) {
      svgContainer.innerHTML = `
        <svg class="w-6 h-6 dragon-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3C7 3 3 7 3 12C3 17 7 21 12 21C17 21 21 17 21 12C21 7 17 3 12 3Z" fill="currentColor" fill-opacity="0.2"/>
          <path d="M14.5 6.5C14.5 7.33 13.83 8 13 8C12.17 8 11.5 7.33 11.5 6.5C11.5 5.67 12.17 5 13 5C13.83 5 14.5 5.67 14.5 6.5Z" fill="#FFD700"/>
          <path d="M16 11.5C16 12.33 15.33 13 14.5 13C13.67 13 13 12.33 13 11.5C13 10.67 13.67 10 14.5 10C15.33 10 16 10.67 16 11.5Z" fill="#FFD700"/>
          <path d="M9 10C9.83 10 10.5 9.33 10.5 8.5C10.5 7.67 9.83 7 9 7C8.17 7 7.5 7.67 7.5 8.5C7.5 9.33 8.17 10 9 10Z" fill="#FFD700"/>
          <path d="M7.13 17C7.05 16.86 7 16.69 7 16.5C7 15.67 7.67 15 8.5 15C9.33 15 10 15.67 10 16.5C10 16.97 9.8 17.4 9.47 17.66L12 17L15 14L14.5 11.5L12 13L9 10L7.5 13L11 16L7.13 17Z" fill="currentColor"/>
          <path d="M12 3C7 3 3 7 3 12C3 17 7 21 12 21C17 21 21 17 21 12C21 7 17 3 12 3ZM14.5 6.5C14.5 7.33 13.83 8 13 8C12.17 8 11.5 7.33 11.5 6.5C11.5 5.67 12.17 5 13 5C13.83 5 14.5 5.67 14.5 6.5ZM16 11.5C16 12.33 15.33 13 14.5 13C13.67 13 13 12.33 13 11.5C13 10.67 13.67 10 14.5 10C15.33 10 16 10.67 16 11.5ZM9 10C9.83 10 10.5 9.33 10.5 8.5C10.5 7.67 9.83 7 9 7C8.17 7 7.5 7.67 7.5 8.5C7.5 9.33 8.17 10 9 10ZM7.13 17C7.05 16.86 7 16.69 7 16.5C7 15.67 7.67 15 8.5 15C9.33 15 10 15.67 10 16.5C10 16.97 9.8 17.4 9.47 17.66L12 17L15 14L14.5 11.5L12 13L9 10L7.5 13L11 16L7.13 17Z" stroke="#d4af37" stroke-width="0.5"/>
        </svg>
      `;
    }
    
    // Update gradient background
    const gradientBg = avatar.querySelector('div.absolute.inset-0.bg-gradient-to-br');
    if (gradientBg) {
      gradientBg.style.background = 'linear-gradient(135deg, #b8860b, #a0522d)';
    }
  });
  
  // 5. Add max-width constraints to chat containers
  const chatContainers = document.querySelectorAll('.w-full.mx-auto');
  chatContainers.forEach(container => {
    container.classList.add('max-w-chat');
  });
  
  // 6. Adjust the chat message bubble styling for better readability
  const messageBubbles = document.querySelectorAll('[class*="rounded-2xl"]');
  messageBubbles.forEach(bubble => {
    const isAssistantBubble = !bubble.parentElement.classList.contains('justify-end');
    
    if (isAssistantBubble) {
      // Improve assistant message styling
      bubble.style.backgroundColor = 'rgba(35, 35, 45, 0.85)';
      bubble.style.border = '1px solid rgba(150, 120, 40, 0.3)';
      bubble.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.15), inset 0 0 1px rgba(255, 215, 0, 0.2)';
    }
  });
  
  // 7. Update the chat input with cultivator theme
  const chatInputs = document.querySelectorAll('textarea');
  chatInputs.forEach(input => {
    input.classList.add('chat-input');
  });

  // 8. Adjust the send button
  const sendButtons = document.querySelectorAll('button[type="submit"]');
  sendButtons.forEach(button => {
    button.classList.add('submit-button');
  });
  
  // 9. Set the timeline decoration
  const timelineDecorations = document.querySelectorAll('div[class*="absolute left-4 top-5 bottom-5"]');
  timelineDecorations.forEach(timeline => {
    timeline.classList.add('timeline-decoration');
  });
  
  console.log('InkMortal themes and adjustments have been applied');
});

// Add MutationObserver to handle dynamically added elements
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach(node => {
        // Check if the node is an element
        if (node.nodeType === 1) {
          // Apply assistant message styling if needed
          if (node.classList && node.classList.contains('message-in')) {
            node.classList.add('assistant-message');
            
            // Add decorative elements
            const decoration = document.createElement('div');
            decoration.className = 'message-decoration';
            decoration.style.position = 'absolute';
            decoration.style.top = '0';
            decoration.style.left = '0';
            decoration.style.right = '0';
            decoration.style.height = '1px';
            decoration.style.background = 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent)';
            node.appendChild(decoration);
          }
        }
      });
    }
  });
});

// Start observing
observer.observe(document.body, { childList: true, subtree: true });