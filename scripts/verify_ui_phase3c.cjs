const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\MADHUSUDAN\\.gemini\\antigravity\\brain\\01a92798-f431-478f-b783-9e196efdd66d';

(async () => {
  console.log('Starting Phase 3C Playwright UI Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // 1. Test /drainage Dashboard
  console.log('Navigating to http://localhost:5173/drainage ...');
  await page.goto('http://localhost:5173/drainage', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Take Screenshot 1: /drainage overview at T+0
  const drainageT0Path = path.join(ARTIFACT_DIR, 'screenshot_phase3c_drainage_t0.png');
  await page.screenshot({ path: drainageT0Path, fullPage: false });
  console.log('Saved Screenshot 1 (/drainage T+0):', drainageT0Path);

  // Click on an interactive drainage asset (node or pipe) to inspect popup
  console.log('Clicking on an interactive drainage marker...');
  const interactivePaths = page.locator('path.leaflet-interactive');
  const pathCount = await interactivePaths.count();
  console.log('Interactive SVG paths found:', pathCount);
  if (pathCount > 0) {
    // Click a node marker
    await interactivePaths.nth(Math.min(15, pathCount - 1)).click({ force: true });
    await page.waitForTimeout(1500);
  }

  let popup = page.locator('.leaflet-popup-content');
  if (await popup.count() > 0) {
    console.log('Node/Pipe popup opened successfully!');
    const snippet = await popup.innerText();
    console.log('Popup snippet:\n', snippet.split('\n').slice(0, 8).join('\n'));
  }

  // Take Screenshot 2: Popup
  const popupPath = path.join(ARTIFACT_DIR, 'screenshot_phase3c_drainage_popup.png');
  await page.screenshot({ path: popupPath, fullPage: false });
  console.log('Saved Screenshot 2 (Popup):', popupPath);

  // Close popup
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Switch to T+3 on /drainage
  console.log('Switching to T+3 on /drainage...');
  const t3Button = page.locator('button', { hasText: 'T+3' });
  if (await t3Button.count() > 0) {
    await t3Button.click();
    await page.waitForTimeout(1500);
  }

  // Take Screenshot 3: /drainage at T+3
  const drainageT3Path = path.join(ARTIFACT_DIR, 'screenshot_phase3c_drainage_t3.png');
  await page.screenshot({ path: drainageT3Path, fullPage: false });
  console.log('Saved Screenshot 3 (/drainage T+3):', drainageT3Path);

  // 2. Test main GIS Dashboard (/dashboard) with Drainage Network Layer
  console.log('Navigating to http://localhost:5173/dashboard ...');
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Ensure Drainage tab is selected in HUD
  const drainageTab = page.locator('button', { hasText: 'Drainage' });
  if (await drainageTab.count() > 0) {
    await drainageTab.click();
    await page.waitForTimeout(1000);
  }

  // Take Screenshot 4: Primary map with Drainage Network layer & HUD
  const primaryMapPath = path.join(ARTIFACT_DIR, 'screenshot_phase3c_primary_map_drainage.png');
  await page.screenshot({ path: primaryMapPath, fullPage: false });
  console.log('Saved Screenshot 4 (Primary GIS Map with Drainage):', primaryMapPath);

  await browser.close();
  console.log('Phase 3C Playwright Verification completed successfully!');
})();
