/* Simple script to update UI text without modifying components */
document.addEventListener('DOMContentLoaded', function() {
  // Change SeaDragon to InkMortal
  document.querySelectorAll('span').forEach(span => {
    if (span.textContent === 'SeaDragon') {
      span.textContent = 'InkMortal';
    }
  });

  // Update the subtitle text if needed
  document.querySelectorAll('.text-xs.font-light').forEach(element => {
    if (element.textContent === 'Powered by Artificial Intelligence') {
      element.textContent = 'Powered by Cultivation Arts';
    }
  });
  
  // Add the script to the page title as well
  if (document.title.includes('Seadragon')) {
    document.title = document.title.replace('Seadragon', 'InkMortal');
  }
});