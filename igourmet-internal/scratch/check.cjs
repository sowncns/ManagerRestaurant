const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });
  page.on('pageerror', error => {
    console.log('PAGE EXCEPTION:', error.message);
  });
  
  await page.goto('http://localhost:5173');
  // wait 2 seconds
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
