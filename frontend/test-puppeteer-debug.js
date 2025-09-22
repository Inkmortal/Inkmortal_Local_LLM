const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting Puppeteer test with detailed debugging...');

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[Browser ${type.toUpperCase()}]:`, text);
  });

  // Log errors
  page.on('error', err => {
    console.error('[Browser ERROR]:', err);
  });

  page.on('pageerror', err => {
    console.error('[Page ERROR]:', err);
  });

  // Log requests for debugging
  page.on('request', request => {
    if (request.url().includes('/api/') || request.url().includes('/chat/')) {
      console.log('[Request]:', request.method(), request.url());
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/') || response.url().includes('/chat/')) {
      console.log('[Response]:', response.status(), response.url());
    }
  });

  try {
    // 1. Navigate to login page
    console.log('\n1. Navigating to login page...');
    await page.goto('http://localhost:3000/auth/admin/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // 2. Login
    console.log('\n2. Logging in with admin/firesnake...');

    // Wait for form elements
    await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 5000 });

    // Use evaluate to directly set values and bypass any Chrome password manager popups
    await page.evaluate(() => {
      const usernameInput = document.querySelector('input[name="username"]') || document.querySelector('input[type="text"]');
      const passwordInput = document.querySelector('input[name="password"]') || document.querySelector('input[type="password"]');

      if (usernameInput && passwordInput) {
        // Use native setters to bypass React
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

        nativeInputValueSetter.call(usernameInput, 'admin');
        usernameInput.dispatchEvent(new Event('input', { bubbles: true }));

        nativeInputValueSetter.call(passwordInput, 'firesnake');
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));

        console.log('Credentials entered');
      }
    });

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForFunction(
      () => window.location.pathname === '/chat' || window.location.pathname.startsWith('/chat/'),
      { timeout: 10000 }
    );

    console.log('\n3. Login successful, now on:', await page.url());

    // Wait a bit for React to initialize
    await page.waitForTimeout(2000);

    // 4. Create a new conversation
    console.log('\n4. Creating a new conversation...');

    // Check current state
    const currentUrl = await page.url();
    console.log('Current URL:', currentUrl);

    // Wait for the input to be ready
    await page.waitForSelector('textarea, input[type="text"]:not([name="username"])', { timeout: 10000 });

    // Type a message
    const testMessage = 'Hello, testing navigation issue';
    console.log('Typing message:', testMessage);

    await page.evaluate((msg) => {
      const textarea = document.querySelector('textarea') || document.querySelector('input[type="text"]:not([name="username"])');
      if (textarea) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        ).set || Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        ).set;

        nativeInputValueSetter.call(textarea, msg);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('Message typed');
      }
    }, testMessage);

    // Find and click send button
    console.log('Looking for send button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const sendButton = buttons.find(b =>
        b.textContent.toLowerCase().includes('send') ||
        b.getAttribute('aria-label')?.toLowerCase().includes('send')
      );
      if (sendButton) {
        console.log('Found send button, clicking...');
        sendButton.click();
      } else {
        console.error('Send button not found');
        // Try Enter key as fallback
        const textarea = document.querySelector('textarea');
        if (textarea) {
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
          });
          textarea.dispatchEvent(enterEvent);
        }
      }
    });

    // Wait for navigation or state change
    console.log('\n5. Waiting for conversation to be created...');

    // Monitor URL changes
    let navigationOccurred = false;
    const initialUrl = await page.url();

    // Wait for URL to change to include a conversation ID
    try {
      await page.waitForFunction(
        (initial) => {
          const current = window.location.href;
          const changed = current !== initial && current.includes('/chat/');
          if (changed) {
            console.log('URL changed to:', current);
          }
          return changed;
        },
        { timeout: 10000 },
        initialUrl
      );
      navigationOccurred = true;
    } catch (e) {
      console.log('No URL change detected after 10 seconds');
    }

    const finalUrl = await page.url();
    console.log('\n6. Final URL:', finalUrl);
    console.log('Navigation occurred:', navigationOccurred);

    // Check what's actually rendered
    console.log('\n7. Checking rendered content...');

    const pageState = await page.evaluate(() => {
      const root = document.getElementById('root');
      const hasContent = root && root.children.length > 0;
      const innerHTMLLength = root ? root.innerHTML.length : 0;

      // Check for React fiber
      const reactFiber = root && root._reactRootContainer;

      // Check for specific elements
      const hasChatWindow = !!document.querySelector('.chat-window, .chat-message, [class*="chat"]');
      const hasMessages = !!document.querySelector('.message, [class*="message"]');
      const hasInput = !!document.querySelector('textarea, input[type="text"]:not([name="username"])');

      // Get React Router state if available
      let routerState = null;
      try {
        if (window.__reactRouterContext) {
          routerState = window.__reactRouterContext;
        }
      } catch (e) {}

      // Check for error boundaries
      const errorBoundary = document.querySelector('[class*="error"], .error-boundary');

      return {
        hasRoot: !!root,
        hasContent,
        innerHTMLLength,
        hasReactFiber: !!reactFiber,
        hasChatWindow,
        hasMessages,
        hasInput,
        routerState: routerState ? 'present' : 'absent',
        errorBoundary: !!errorBoundary,
        rootClasses: root ? root.className : 'no root',
        rootChildren: root ? root.children.length : 0,
        bodyClasses: document.body.className,
        pathname: window.location.pathname,
        reactVersion: window.React ? window.React.version : 'not found'
      };
    });

    console.log('\nPage state:', JSON.stringify(pageState, null, 2));

    // Get any React errors
    const reactErrors = await page.evaluate(() => {
      const errors = [];
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (hook.checkDCE) {
          errors.push('DCE check present');
        }
      }
      return errors;
    });

    if (reactErrors.length > 0) {
      console.log('\nReact errors:', reactErrors);
    }

    // Check network activity
    console.log('\n8. Checking for pending network requests...');
    await page.waitForTimeout(2000);

    // Final state check
    const finalState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasVisibleContent: document.body.offsetHeight > 100,
        reactMounted: !!document.querySelector('#root')._reactRootContainer,
        routerReady: window.location.pathname.includes('/chat/')
      };
    });

    console.log('\n9. Final state:', finalState);

    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    console.log('\nScreenshot saved as debug-screenshot.png');

    // Keep browser open for manual inspection
    console.log('\n10. Browser will stay open for manual inspection. Press Ctrl+C to exit.');

    // Keep the script running
    await new Promise(() => {});

  } catch (error) {
    console.error('\nError during test:', error);

    // Try to get more debugging info
    const debugInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyText: document.body.innerText.substring(0, 200),
        hasRoot: !!document.getElementById('root'),
        errors: window.__errors || []
      };
    }).catch(() => null);

    if (debugInfo) {
      console.log('\nDebug info:', debugInfo);
    }

    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('Error screenshot saved');
  }
})();