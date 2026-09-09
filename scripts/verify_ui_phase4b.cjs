const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\MADHUSUDAN\\.gemini\\antigravity\\brain\\01a92798-f431-478f-b783-9e196efdd66d';

(async () => {
  console.log('Starting Phase 4B Playwright UI Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 }
  });
  const page = await context.newPage();

  // 1. Navigate to /nowcast in Live Weather Mode
  console.log('1. Navigating to http://localhost:5173/nowcast ...');
  await page.goto('http://localhost:5173/nowcast', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Take Screenshot 1: Dry Weather Zero Alerts
  const dryAlertsPath = path.join(ARTIFACT_DIR, 'screenshot_phase4b_nowcast_dry_alerts.png');
  await page.screenshot({ path: dryAlertsPath, fullPage: false });
  console.log('Saved Screenshot 1 (Nowcast Dry Alerts):', dryAlertsPath);

  // 2. Activate Demo Scenario (65 mm/hr Storm)
  console.log('2. Activating Demo Storm Scenario...');
  const demoButton = page.locator('button', { hasText: 'Demo Scenario' });
  if (await demoButton.count() > 0) {
    await demoButton.click();
    await page.waitForTimeout(2500);
  }

  // 3. Switch map mode to "Risk Layer (4B)"
  console.log('3. Switching to Risk Layer (4B)...');
  const riskLayerButton = page.locator('button', { hasText: 'Risk Layer (4B)' });
  if (await riskLayerButton.count() > 0) {
    await riskLayerButton.click({ force: true });
    await page.waitForTimeout(2000);
  }

  // Take Screenshot 2: Demo Scenario in Risk Layer Mode
  const riskLayerPath = path.join(ARTIFACT_DIR, 'screenshot_phase4b_nowcast_risk_layer.png');
  await page.screenshot({ path: riskLayerPath, fullPage: false });
  console.log('Saved Screenshot 2 (Risk Layer & Overview):', riskLayerPath);

  // 4. Click an interactive surface cell to open Risk Assessment Popup
  console.log('4. Clicking a cell to open Risk Assessment popup...');
  const surfacePaths = page.locator('path.leaflet-interactive');
  const pathCount = await surfacePaths.count();
  console.log('Interactive paths found on map:', pathCount);

  if (pathCount > 0) {
    // Click on index 6 or 8 (Central urban corridor with high surcharge)
    await surfacePaths.nth(Math.min(8, pathCount - 1)).click({ force: true });
    await page.waitForTimeout(2000);
  }

  const popup = page.locator('.leaflet-popup-content');
  if (await popup.count() > 0) {
    const popupText = await popup.innerText();
    console.log('Popup snippet:\n', popupText.split('\n').slice(0, 12).join('\n'));
  }

  // Take Screenshot 3: Risk Assessment Popup
  const riskPopupPath = path.join(ARTIFACT_DIR, 'screenshot_phase4b_nowcast_risk_popup.png');
  await page.screenshot({ path: riskPopupPath, fullPage: false });
  console.log('Saved Screenshot 3 (Risk Assessment Popup):', riskPopupPath);

  // 5. Scroll right column to capture active alerts cards & comparison table
  console.log('5. Scrolling right column to capture alert details...');
  const rightColumn = page.locator('div.lg\\:col-span-4');
  if (await rightColumn.count() > 0) {
    await rightColumn.evaluate((el) => el.scrollTop = 250);
    await page.waitForTimeout(1000);
    const alertsScrollPath = path.join(ARTIFACT_DIR, 'screenshot_phase4b_alerts_panel_scrolled.png');
    await page.screenshot({ path: alertsScrollPath, fullPage: false });
    console.log('Saved Screenshot 4 (Alerts Panel Scrolled):', alertsScrollPath);
  }

  // 6. Navigate to /dashboard and test Risk Assessment layer toggle
  console.log('6. Navigating to http://localhost:5173/dashboard to verify GIS layer control...');
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Look for Risk Assessment toggle in LayerControl
  const riskToggle = page.locator('label', { hasText: 'Risk Assessment' });
  if (await riskToggle.count() > 0) {
    console.log('Toggling on Risk Assessment layer on main GIS map...');
    await riskToggle.click({ force: true });
    await page.waitForTimeout(2000);
  }

  // Take Screenshot 5: Main GIS Map with Risk Assessment Layer
  const gisRiskPath = path.join(ARTIFACT_DIR, 'screenshot_phase4b_gis_risk_layer.png');
  await page.screenshot({ path: gisRiskPath, fullPage: false });
  console.log('Saved Screenshot 5 (Main GIS Risk Layer):', gisRiskPath);

  console.log('Phase 4B Playwright UI Verification completed successfully!');
  await browser.close();
})();
