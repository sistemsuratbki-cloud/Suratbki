const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 5000 });
    
    // Check if there is an error overlay (like Vite's)
    const viteError = await page.evaluate(() => {
      const overlay = document.querySelector('vite-error-overlay');
      return overlay ? overlay.shadowRoot.innerHTML : null;
    });
    if (viteError) {
      console.log('VITE ERROR OVERLAY DETECTED:', viteError);
    }
    
    await browser.close();
  } catch (err) {
    console.error('SCRIPT ERROR:', err);
    process.exit(1);
  }
})();
