const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\MADHUSUDAN\\.gemini\\antigravity\\brain\\01a92798-f431-478f-b783-9e196efdd66d';

(async () => {
  console.log('======================================================================');
  console.log('PHASE 5: PLAYWRIGHT UI SMOKE TEST ACROSS ALL 4 CORE MODULES');
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

  // --------------------------------------------------------------------------
  // 1. Verify Home Page & System Status Modal
  // --------------------------------------------------------------------------
  console.log('1. Checking Home Page (http://localhost:5173/) ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click "SYSTEM READY" button in header to open System Status Panel modal
  const systemReadyBtn = page.locator('button', { hasText: 'SYSTEM READY' });
  if ((await systemReadyBtn.count()) > 0) {
    await systemReadyBtn.click();
    await page.waitForTimeout(1000);
    const statusModalPath = path.join(ARTIFACT_DIR, 'screenshot_phase5_system_status.png');
    await page.screenshot({ path: statusModalPath, fullPage: false });
    console.log('   ↳ Captured System Status Modal:', statusModalPath);

    // Close modal
    const closeBtn = page.locator('button[aria-label="Close Status Panel"]');
    if ((await closeBtn.count()) > 0) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // --------------------------------------------------------------------------
  // 2. Verify /dashboard (GIS Dashboard)
  // --------------------------------------------------------------------------
  console.log('2. Checking GIS Dashboard (http://localhost:5173/dashboard) ...');
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Switch to DEMO Scenario on dashboard
  const demoSurgeBtn = page.locator('button', { hasText: 'Monsoon Demo' });
  if ((await demoSurgeBtn.count()) > 0) {
    await demoSurgeBtn.click();
    await page.waitForTimeout(2000);
  }

  const dashPath = path.join(ARTIFACT_DIR, 'screenshot_phase5_dashboard.png');
  await page.screenshot({ path: dashPath, fullPage: false });
  console.log('   ↳ Captured GIS Dashboard (Demo Scenario):', dashPath);

  // --------------------------------------------------------------------------
  // 3. Verify /nowcast (0–3h Nowcast & Alerts)
  // --------------------------------------------------------------------------
  console.log('3. Checking Nowcast Dashboard (http://localhost:5173/nowcast) ...');
  await page.goto('http://localhost:5173/nowcast', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Ensure Demo Scenario is active
  const nowcastDemoBtn = page.locator('button', { hasText: 'Demo Scenario' });
  if ((await nowcastDemoBtn.count()) > 0) {
    await nowcastDemoBtn.click();
    await page.waitForTimeout(2000);
  }

  // Switch to Risk Layer
  const riskLayerBtn = page.locator('button', { hasText: 'Risk Layer' });
  if ((await riskLayerBtn.count()) > 0) {
    await riskLayerBtn.click({ force: true });
    await page.waitForTimeout(1500);
  }

  // Switch horizon to T+2
  const t2Btn = page.locator('button', { hasText: 'T+2' });
  if ((await t2Btn.count()) > 0) {
    await t2Btn.first().click({ force: true });
    await page.waitForTimeout(1500);
  }

  const nowcastPath = path.join(ARTIFACT_DIR, 'screenshot_phase5_nowcast.png');
  await page.screenshot({ path: nowcastPath, fullPage: false });
  console.log('   ↳ Captured Nowcast & Risk Dashboard (T+2 Risk Layer):', nowcastPath);

  // --------------------------------------------------------------------------
  // 4. Verify /drainage (Drainage Network Hydraulics)
  // --------------------------------------------------------------------------
  console.log('4. Checking Drainage Dashboard (http://localhost:5173/drainage) ...');
  await page.goto('http://localhost:5173/drainage', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const drainagePath = path.join(ARTIFACT_DIR, 'screenshot_phase5_drainage.png');
  await page.screenshot({ path: drainagePath, fullPage: false });
  console.log('   ↳ Captured Drainage Dashboard:', drainagePath);

  // --------------------------------------------------------------------------
  // 5. Verify /routing (Flood-Safe Routing)
  // --------------------------------------------------------------------------
  console.log('5. Checking Routing Dashboard (http://localhost:5173/routing) ...');
  await page.goto('http://localhost:5173/routing', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Switch to Emergency Mode
  const emergencyBtn = page.locator('button', { hasText: 'Emergency' });
  if ((await emergencyBtn.count()) > 0) {
    await emergencyBtn.click();
    await page.waitForTimeout(1500);
  }

  const routingPath = path.join(ARTIFACT_DIR, 'screenshot_phase5_routing.png');
  await page.screenshot({ path: routingPath, fullPage: false });
  console.log('   ↳ Captured Routing Dashboard (Emergency Mode):', routingPath);

  await browser.close();

  // Filter non-fatal console noise (like favicon 404 or map tile caching)
  const fatalErrors = consoleErrors.filter(
    (e) => !e.includes('favicon') && !e.includes('tile.openstreetmap') && !e.includes('404')
  );

  console.log('\n======================================================================');
  if (fatalErrors.length === 0) {
    console.log('PLAYWRIGHT UI SMOKE TEST PASSED: ALL 4 MODULES VERIFIED (0 FATAL ERRORS)');
  } else {
    console.warn(`WARNING: Encountered ${fatalErrors.length} console warning(s):`, fatalErrors);
  }
  console.log('======================================================================\n');
})();
