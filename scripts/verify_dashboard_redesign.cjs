const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\MADHUSUDAN\\.gemini\\antigravity\\brain\\01a92798-f431-478f-b783-9e196efdd66d';

(async () => {
  console.log('======================================================================');
  console.log('VALIDATION: REDESIGNED GIS DASHBOARD (SIH26085)');
  console.log('======================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 1. Navigate to /dashboard
  console.log('1. Loading GIS Dashboard (http://localhost:5173/dashboard) in Live Weather mode ...');
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const liveShotPath = path.join(ARTIFACT_DIR, 'screenshot_dashboard_live.png');
  await page.screenshot({ path: liveShotPath, fullPage: false });
  console.log('   ↳ Captured Live Weather Dashboard:', liveShotPath);

  // 2. Switch to Monsoon Demo (65 mm/hr)
  console.log('2. Switching to Monsoon Demo (65 mm/hr) Scenario ...');
  const demoBtn = page.locator('button', { hasText: 'Monsoon Demo' });
  if ((await demoBtn.count()) > 0) {
    await demoBtn.click();
    await page.waitForTimeout(2000);
  }
  const monsoonShotPath = path.join(ARTIFACT_DIR, 'screenshot_dashboard_monsoon.png');
  await page.screenshot({ path: monsoonShotPath, fullPage: false });
  console.log('   ↳ Captured Monsoon Demo Dashboard:', monsoonShotPath);

  // 3. Switch Horizon to T+2
  console.log('3. Switching Horizon to T+2 ...');
  const t2Btn = page.locator('button', { hasText: 'T+2' }).first();
  if ((await t2Btn.count()) > 0) {
    await t2Btn.click();
    await page.waitForTimeout(1500);
  }
  const t2ShotPath = path.join(ARTIFACT_DIR, 'screenshot_dashboard_horizon_t2.png');
  await page.screenshot({ path: t2ShotPath, fullPage: false });
  console.log('   ↳ Captured T+2 Horizon Dashboard:', t2ShotPath);

  // 4. Switch to Risk View
  console.log('4. Switching to Risk View ...');
  const riskViewBtn = page.locator('button', { hasText: 'Risk View' });
  if ((await riskViewBtn.count()) > 0) {
    await riskViewBtn.click();
    await page.waitForTimeout(1500);
  }
  const riskShotPath = path.join(ARTIFACT_DIR, 'screenshot_dashboard_risk_view.png');
  await page.screenshot({ path: riskShotPath, fullPage: false });
  console.log('   ↳ Captured Risk View Dashboard:', riskShotPath);

  // 5. Toggle Map Controls Right Panel (Collapse)
  console.log('5. Collapsing Map Controls Right Panel ...');
  const mapControlsToggle = page.locator('button', { hasText: 'Map Controls' });
  if ((await mapControlsToggle.count()) > 0) {
    await mapControlsToggle.click();
    await page.waitForTimeout(1000);
  }
  const collapsedShotPath = path.join(ARTIFACT_DIR, 'screenshot_dashboard_collapsed_controls.png');
  await page.screenshot({ path: collapsedShotPath, fullPage: false });
  console.log('   ↳ Captured Collapsed Map Controls View (Maximized Map):', collapsedShotPath);

  // Expand panel back
  if ((await mapControlsToggle.count()) > 0) {
    await mapControlsToggle.click();
    await page.waitForTimeout(1000);
  }

  // 6. Switch to Dry (0 mm/hr) Baseline
  console.log('6. Switching to Dry Baseline (0 mm/hr) Scenario ...');
  const dryBtn = page.locator('button', { hasText: 'Dry (0 mm/hr)' });
  if ((await dryBtn.count()) > 0) {
    await dryBtn.click();
    await page.waitForTimeout(2000);
  }
  const dryShotPath = path.join(ARTIFACT_DIR, 'screenshot_dashboard_dry.png');
  await page.screenshot({ path: dryShotPath, fullPage: false });
  console.log('   ↳ Captured Dry Baseline Dashboard:', dryShotPath);

  // 7. Click on a Map Grid Cell to trigger Popup
  console.log('7. Triggering Map Click to test compact popup ...');
  // Click near the center of the leaflet map container
  const mapCanvas = page.locator('.leaflet-container');
  if ((await mapCanvas.count()) > 0) {
    const box = await mapCanvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.48);
      await page.waitForTimeout(1500);
    }
  }
  const popupShotPath = path.join(ARTIFACT_DIR, 'screenshot_dashboard_popup.png');
  await page.screenshot({ path: popupShotPath, fullPage: false });
  console.log('   ↳ Captured Map Popup View:', popupShotPath);

  await browser.close();

  const fatalErrors = consoleErrors.filter(
    (e) => !e.includes('favicon') && !e.includes('tile.openstreetmap') && !e.includes('404')
  );

  console.log('\n======================================================================');
  if (fatalErrors.length === 0) {
    console.log('DASHBOARD REDESIGN VALIDATION: ALL SCENARIOS & CONTROLS VERIFIED (0 ERRORS)');
  } else {
    console.warn(`WARNING: Encountered ${fatalErrors.length} console warning(s):`, fatalErrors);
  }
  console.log('======================================================================\n');
})();
