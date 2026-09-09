const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\MADHUSUDAN\\.gemini\\antigravity\\brain\\01a92798-f431-478f-b783-9e196efdd66d';

(async () => {
  console.log('Starting Phase 3D Playwright UI Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // 1. Test Primary Map Dashboard
  console.log('Navigating to http://localhost:5173/dashboard ...');
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Clean up layers: toggle off DEM and Rainfall to clearly focus on 1D-2D Coupled Model
  const demToggle = page.locator('label', { hasText: 'DEM Elevation' });
  if (await demToggle.count() > 0) await demToggle.click();
  const rainToggle = page.locator('label', { hasText: 'Rainfall Layer' });
  if (await rainToggle.count() > 0) await rainToggle.click();
  await page.waitForTimeout(1000);

  // Take Screenshot 1: Primary map with Coupled 1D-2D Summary Card
  const primaryMapPath = path.join(ARTIFACT_DIR, 'screenshot_phase3d_coupled_map.png');
  await page.screenshot({ path: primaryMapPath, fullPage: false });
  console.log('Saved Screenshot 1 (Coupled Primary Map):', primaryMapPath);

  // 2. Click on a coupled polygon in central area to inspect popup
  console.log('Clicking on an interactive coupled grid cell...');
  const coupledPaths = page.locator('.leaflet-coupled-pane path.leaflet-interactive');
  const pathCount = await coupledPaths.count();
  console.log('Coupled SVG paths found:', pathCount);
  console.log('Coupled SVG paths found:', pathCount);
  if (pathCount > 0) {
    // Click cell index 2 (North Ridge) or 7 (Central)
    await coupledPaths.nth(7).click({ force: true });
    await page.waitForTimeout(2000);
  }

  let popup = page.locator('.leaflet-popup-content');
  if (await popup.count() > 0) {
    console.log('Coupled cell popup opened successfully!');
    const snippet = await popup.innerText();
    console.log('Popup snippet:\n', snippet.split('\n').slice(0, 10).join('\n'));
  }

  // Take Screenshot 2: Coupled Cell Popup
  const popupPath = path.join(ARTIFACT_DIR, 'screenshot_phase3d_coupled_popup.png');
  await page.screenshot({ path: popupPath, fullPage: false });
  console.log('Saved Screenshot 2 (Coupled Popup):', popupPath);

  // Switch to T+3
  console.log('Switching to T+3...');
  const t3Button = page.locator('button', { hasText: 'T+3' });
  if (await t3Button.count() > 0) {
    await t3Button.click();
    await page.waitForTimeout(1500);
  }

  // Take Screenshot 3: T+3
  const t3Path = path.join(ARTIFACT_DIR, 'screenshot_phase3d_coupled_t3.png');
  await page.screenshot({ path: t3Path, fullPage: false });
  console.log('Saved Screenshot 3 (Coupled T+3):', t3Path);

  await browser.close();
  console.log('Phase 3D Playwright UI verification complete!');
})();
