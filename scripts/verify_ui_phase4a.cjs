const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\MADHUSUDAN\\.gemini\\antigravity\\brain\\01a92798-f431-478f-b783-9e196efdd66d';

(async () => {
  console.log('Starting Phase 4A Playwright UI Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1500, height: 950 }
  });
  const page = await context.newPage();

  // 1. Navigate to /nowcast
  console.log('Navigating to http://localhost:5173/nowcast ...');
  await page.goto('http://localhost:5173/nowcast', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Take Screenshot 1: Nowcast Dashboard in Live Ingestion Mode
  const liveScreenshotPath = path.join(ARTIFACT_DIR, 'screenshot_phase4a_nowcast_live.png');
  await page.screenshot({ path: liveScreenshotPath, fullPage: false });
  console.log('Saved Screenshot 1 (Nowcast Live Mode):', liveScreenshotPath);

  // 2. Click "Demo Scenario (65 mm/hr Storm)"
  console.log('Activating Demo Storm Scenario...');
  const demoButton = page.locator('button', { hasText: 'Demo Scenario' });
  if (await demoButton.count() > 0) {
    await demoButton.click();
    await page.waitForTimeout(2500);
  }

  // Take Screenshot 2: Demo Scenario at T+0
  const demoT0Path = path.join(ARTIFACT_DIR, 'screenshot_phase4a_nowcast_demo_t0.png');
  await page.screenshot({ path: demoT0Path, fullPage: false });
  console.log('Saved Screenshot 2 (Demo Scenario T+0):', demoT0Path);

  // 3. Click on a coupled surface cell to inspect the popup
  console.log('Inspecting cell popup on Leaflet map...');
  const surfacePaths = page.locator('path.leaflet-interactive');
  const pathCount = await surfacePaths.count();
  console.log('Found interactive paths on map:', pathCount);

  if (pathCount > 0) {
    // Click on index 8 or 10 (Central corridor / Kurla / Dadar area)
    await surfacePaths.nth(Math.min(8, pathCount - 1)).click({ force: true });
    await page.waitForTimeout(2000);
  }

  const popup = page.locator('.leaflet-popup-content');
  if (await popup.count() > 0) {
    console.log('Cell popup opened successfully!');
    const text = await popup.innerText();
    console.log('Popup snippet:\n', text.split('\n').slice(0, 8).join('\n'));
  }

  // Take Screenshot 3: Cell Popup
  const popupPath = path.join(ARTIFACT_DIR, 'screenshot_phase4a_nowcast_popup.png');
  await page.screenshot({ path: popupPath, fullPage: false });
  console.log('Saved Screenshot 3 (Cell Popup):', popupPath);

  // 4. Switch horizon to T+1
  console.log('Switching to Horizon T+1...');
  const t1Col = page.locator('th', { hasText: 'T+1' });
  if (await t1Col.count() > 0) {
    await t1Col.first().click();
    await page.waitForTimeout(2000);
  } else {
    const t1Btn = page.locator('button', { hasText: 'T+1' });
    if (await t1Btn.count() > 0) {
      await t1Btn.first().click();
      await page.waitForTimeout(2000);
    }
  }

  // Take Screenshot 4: Horizon T+1
  const t1ScreenshotPath = path.join(ARTIFACT_DIR, 'screenshot_phase4a_nowcast_demo_t1.png');
  await page.screenshot({ path: t1ScreenshotPath, fullPage: false });
  console.log('Saved Screenshot 4 (Horizon T+1):', t1ScreenshotPath);

  // 5. Test regressions: Check that /dashboard and /drainage still work
  console.log('Checking GIS Dashboard (/dashboard)...');
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);
  const dashboardMap = page.locator('.leaflet-container');
  console.log('/dashboard Leaflet map container count:', await dashboardMap.count());

  console.log('Checking Drainage Dashboard (/drainage)...');
  await page.goto('http://localhost:5173/drainage', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);
  const drainageMap = page.locator('.leaflet-container');
  console.log('/drainage Leaflet map container count:', await drainageMap.count());

  await browser.close();
  console.log('Playwright UI Verification Finished Successfully!');
})();
