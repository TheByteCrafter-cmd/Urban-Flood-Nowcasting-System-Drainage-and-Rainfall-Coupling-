const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\MADHUSUDAN\\.gemini\\antigravity\\brain\\01a92798-f431-478f-b783-9e196efdd66d';

(async () => {
  console.log('Starting Phase 3B Playwright UI Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Navigate to GIS dashboard
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000); // Wait for weather ingestion & map rendering

  console.log('GIS Dashboard loaded. Checking 2D Surface Flow layer toggle...');
  
  // Verify 2D Surface Flow toggle exists
  const flowLabel = page.locator('text=2D Surface Flow');
  console.log('Found 2D Surface Flow label:', (await flowLabel.count()) > 0);

  // Take Screenshot 1: T+0 Surface Flow view with Legend and Summary Card
  const t0Path = path.join(ARTIFACT_DIR, 'screenshot_phase3b_t0_surface_flow.png');
  await page.screenshot({ path: t0Path, fullPage: false });
  console.log('Saved Screenshot 1 (T+0):', t0Path);

  // Click on a cell on the map to trigger popup (e.g. around Kurla / Santacruz)
  console.log('Clicking on map cell to inspect popup...');
  // Click in center-east area of map
  await page.mouse.click(750, 480);
  await page.waitForTimeout(1500);

  // Check if popup opened
  const popup = page.locator('.leaflet-popup-content');
  if (await popup.count() > 0) {
    console.log('Popup opened successfully!');
    const popupText = await popup.innerText();
    console.log('Popup snippet:\n', popupText.split('\n').slice(0, 10).join('\n'));
  } else {
    // Try clicking another spot
    await page.mouse.click(700, 520);
    await page.waitForTimeout(1500);
  }

  // Take Screenshot 2: Popup inspection
  const popupPath = path.join(ARTIFACT_DIR, 'screenshot_phase3b_popup.png');
  await page.screenshot({ path: popupPath, fullPage: false });
  console.log('Saved Screenshot 2 (Popup):', popupPath);

  // Close popup or click elsewhere
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Click on T+3 nowcast button
  console.log('Switching to T+3 (+3h)...');
  const t3Button = page.locator('button', { hasText: 'T+3' });
  if (await t3Button.count() > 0) {
    await t3Button.click();
    await page.waitForTimeout(1500);
    console.log('T+3 selected.');
  }

  // Take Screenshot 3: T+3 Horizon
  const t3Path = path.join(ARTIFACT_DIR, 'screenshot_phase3b_t3_surface_flow.png');
  await page.screenshot({ path: t3Path, fullPage: false });
  console.log('Saved Screenshot 3 (T+3):', t3Path);

  // Switch HUD tab from [2D Surface Flow] to [Runoff Engine]
  console.log('Testing HUD tab switch to [Runoff Engine]...');
  const runoffTab = page.locator('button', { hasText: 'Runoff Engine' });
  if (await runoffTab.count() > 0) {
    await runoffTab.click();
    await page.waitForTimeout(1000);
    console.log('Switched to Runoff Engine tab.');
  }

  // Take Screenshot 4: HUD switch view
  const hudPath = path.join(ARTIFACT_DIR, 'screenshot_phase3b_hud_switch.png');
  await page.screenshot({ path: hudPath, fullPage: false });
  console.log('Saved Screenshot 4 (HUD Switch):', hudPath);

  await browser.close();
  console.log('Phase 3B Playwright Verification finished successfully!');
})();
