const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/dashboard...');
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for map and status bar to render
  await page.waitForSelector('.leaflet-container', { timeout: 10000 });
  await page.waitForTimeout(2000);

  const artifactDir = 'C:\\Users\\MADHUSUDAN\\.gemini\\antigravity\\brain\\01a92798-f431-478f-b783-9e196efdd66d';

  // 1. Capture T+0 view with Runoff layer and Summary Card
  console.log('Capturing T+0 Runoff view...');
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_phase3a_t0_runoff.png'), fullPage: false });

  // 2. Click on a runoff cell on the map to trigger popup
  console.log('Clicking on map cell to open Runoff popup...');
  const mapBox = await page.locator('.leaflet-container').boundingBox();
  if (mapBox) {
    await page.mouse.click(mapBox.x + mapBox.width * 0.52, mapBox.y + mapBox.height * 0.55);
    await page.waitForTimeout(1000);
  }

  console.log('Capturing Runoff cell popup...');
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_phase3a_popup.png'), fullPage: false });

  // 3. Close popup by clicking map background
  if (mapBox) {
    await page.mouse.click(mapBox.x + mapBox.width * 0.2, mapBox.y + mapBox.height * 0.2);
    await page.waitForTimeout(500);
  }

  // 4. Switch to T+3 horizon via NowcastTimeControl
  console.log('Selecting T+3 horizon...');
  const t3Button = page.locator('button[aria-label="Nowcast T plus 3 hours"]').first();
  await t3Button.click();
  await page.waitForTimeout(1500);

  console.log('Capturing T+3 Runoff view...');
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_phase3a_t3_runoff.png'), fullPage: false });

  // 5. Open Status Mode Dropdown and select ERROR fallback to test error propagation
  console.log('Testing ERROR mode propagation...');
  const modeButton = page.locator('button:has-text("Mode")').first();
  if (await modeButton.isVisible()) {
    await modeButton.click();
    await page.waitForTimeout(500);
    const errorOption = page.locator('button:has-text("Simulate Outage (ERROR)")').first();
    if (await errorOption.isVisible()) {
      await errorOption.click();
      await page.waitForTimeout(1500);
      console.log('Capturing ERROR state propagation...');
      await page.screenshot({ path: path.join(artifactDir, 'screenshot_phase3a_error_state.png'), fullPage: false });
    }
  }

  await browser.close();
  console.log('UI Runoff verification screenshots captured successfully!');
})();
