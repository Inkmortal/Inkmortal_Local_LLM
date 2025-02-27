import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// DOM manipulation to replace "SeaDragon" with "InkMortal" in the UI
// This runs after the app renders
const replaceText = () => {
  // Replace all instances of "SeaDragon" with "InkMortal"
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
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Run the replacement after the app loads and every 2 seconds to catch dynamic content
setTimeout(replaceText, 500);
setInterval(replaceText, 2000);