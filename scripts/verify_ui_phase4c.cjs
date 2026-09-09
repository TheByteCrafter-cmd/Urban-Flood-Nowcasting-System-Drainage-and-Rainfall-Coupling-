const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\MADHUSUDAN\\.gemini\\antigravity\\brain\\01a92798-f431-478f-b783-9e196efdd66d';

(async () => {
  console.log('Starting Phase 4C Playwright UI Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();

  // 1. Navigate to /routing
  console.log('1. Navigating to http://localhost:5173/routing ...');
  await page.goto('http://localhost:5173/routing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Take Screenshot 1: Default Monsoon Surge view (CST -> Andheri in SAFEST mode)
  const surgeSafestPath = path.join(ARTIFACT_DIR, 'screenshot_phase4c_routing_surge_safest.png');
  await page.screenshot({ path: surgeSafestPath, fullPage: false });
  console.log('Saved Screenshot 1 (Surge Safest Route):', surgeSafestPath);

  // 2. Click "Emergency (Rescue / 50cm Limit)" mode button
  console.log('2. Switching to Emergency Routing Mode...');
  const emergencyBtn = page.locator('button', { hasText: 'Emergency' });
  if ((await emergencyBtn.count()) > 0) {
    await emergencyBtn.click();
    await page.waitForTimeout(2000);
  }

  // Take Screenshot 2: Emergency Routing Mode
  const emergencyPath = path.join(ARTIFACT_DIR, 'screenshot_phase4c_routing_emergency.png');
  await page.screenshot({ path: emergencyPath, fullPage: false });
  console.log('Saved Screenshot 2 (Emergency Route):', emergencyPath);

  // 3. Switch to Dry Baseline scenario
  console.log('3. Switching to Dry Baseline (0 mm/hr)...');
  const dryBtn = page.locator('button', { hasText: 'Dry Baseline' });
  if ((await dryBtn.count()) > 0) {
    await dryBtn.click();
    await page.waitForTimeout(2000);
  }

  // Take Screenshot 3: Dry Weather Baseline
  const dryPath = path.join(ARTIFACT_DIR, 'screenshot_phase4c_routing_dry_baseline.png');
  await page.screenshot({ path: dryPath, fullPage: false });
  console.log('Saved Screenshot 3 (Dry Baseline Route):', dryPath);

  // 4. Return to Monsoon Surge and click a road polyline to test popup
  console.log('4. Returning to Monsoon Surge and clicking a road segment...');
  const surgeBtn = page.locator('button', { hasText: 'Monsoon Surge' });
  if ((await surgeBtn.count()) > 0) {
    await surgeBtn.click();
    await page.waitForTimeout(2000);
  }

  // Click on a road polyline on the map
  const roadPaths = page.locator('path.leaflet-interactive');
  const pathCount = await roadPaths.count();
  console.log('Interactive polylines found on map:', pathCount);

  if (pathCount > 0) {
    // Click on a road path
    await roadPaths.nth(Math.min(4, pathCount - 1)).click({ force: true });
    await page.waitForTimeout(1500);
  }

  const popup = page.locator('.leaflet-popup-content');
  if ((await popup.count()) > 0) {
    const popupText = await popup.innerText();
    console.log('Road Segment Popup:\n', popupText);
  }

  // Take Screenshot 4: Road Popup & Detail breakdown
  const popupPath = path.join(ARTIFACT_DIR, 'screenshot_phase4c_routing_popup.png');
  await page.screenshot({ path: popupPath, fullPage: false });
  console.log('Saved Screenshot 4 (Road Inspection Popup):', popupPath);

  await browser.close();
  console.log('Phase 4C UI Verification completed successfully!');
})();
