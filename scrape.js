const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://localhost:8082', { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Evaluate and find all river divs
  const riverLayers = await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    const river = divs.filter(d => d.style.backgroundColor === 'rgba(147, 197, 253, 0.2)');
    return river.map(d => ({
      top: d.style.top,
      left: d.style.left,
      width: d.style.width,
      height: d.style.height
    })).slice(0, 10); // just get first 10
  });

  console.log('RIVER LAYERS:', riverLayers);
  
  await browser.close();
})();
