/**
 * Force-apply styling fixes to ChatMessage components regardless of CSS issues
 * This script ensures that InkMortal chat styling works properly by directly manipulating DOM elements
 */
(function() {
  // Function to apply styling to assistant messages
  function applyMessageStyling() {
    // Get current theme colors from CSS variables
    const bgSecondary = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim();
    const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
    const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
    
    // Fix assistant message bubbles
    document.querySelectorAll('[class*="message-in"]').forEach(el => {
      // Force background color
      el.style.backgroundColor = bgSecondary || '#1e2030';
      // Force text color for readability
      el.style.color = textPrimary || '#cad3f5';
      // Add border for definition
      el.style.border = `1px solid ${borderColor || '#494d64'}40`;
      // Ensure proper padding
      el.style.padding = '20px';
      
      // Find and style all text elements inside
      el.querySelectorAll('p, span, div').forEach(textEl => {
        if (!textEl.querySelector('svg, img')) { // Don't change color of containers with icons
          textEl.style.color = textPrimary || '#cad3f5';
        }
      });
    });
    
    // Ensure dragon icons are visible
    document.querySelectorAll('.dragon-icon').forEach(icon => {
      icon.style.color = '#FFFFFF';
      icon.style.fill = '#FFFFFF';
    });
    
    // Replace any "SeaDragon" text with "InkMortal"
    document.querySelectorAll('span, h1, div, p').forEach(el => {
      if (el.childNodes && el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
        if (el.textContent?.includes('SeaDragon')) {
          el.textContent = el.textContent.replace('SeaDragon', 'InkMortal');
        }
        if (el.textContent?.includes('Artificial Intelligence')) {
          el.textContent = el.textContent.replace('Artificial Intelligence', 'Cultivation Arts');
        }
      }
    });
  }

  // Run immediately and then on a regular interval
  // This ensures that dynamically loaded content also gets styled
  applyMessageStyling();
  setInterval(applyMessageStyling, 1000);
  
  // Add event listeners for dynamic content
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        applyMessageStyling();
      }
    });
  });
  
  // Start observing document for DOM changes
  observer.observe(document.body, { childList: true, subtree: true });
})();