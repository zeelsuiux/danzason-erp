const { chromium } = require('playwright-core');

async function testCleanSidebar() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  const page = await browser.newPage();

  console.log('--- Testing Clean Sidebar without Badges ---');

  await page.goto('http://localhost:3000/purchase/orders', { waitUntil: 'networkidle' });
  const sidebar = page.locator('aside');

  // Verify 4 clean section titles
  const purchaseHeading = await sidebar.getByText('Purchase', { exact: true }).first();
  const jobWorkHeading = await sidebar.getByText('Job Work', { exact: true }).first();
  const inventoryHeading = await sidebar.getByText('Inventory & Catalog', { exact: true }).first();
  const salesHeading = await sidebar.getByText('Sales & CRM', { exact: true }).first();

  if (!await purchaseHeading.isVisible() || !await jobWorkHeading.isVisible() || !await inventoryHeading.isVisible() || !await salesHeading.isVisible()) {
    throw new Error('Sidebar sections missing or not visible');
  }
  console.log('✅ Sidebar: All 4 clean section titles (Purchase, Job Work, Inventory & Catalog, Sales & CRM) visible');

  // Verify that all unnecessary badges are gone
  const badgeMpo = await sidebar.getByText('MPO', { exact: true }).count();
  const badgeRfq = await sidebar.getByText('RFQ', { exact: true }).count();
  const badgePo = await sidebar.getByText('PO', { exact: true }).count();
  const badgeBills = await sidebar.getByText('Bills', { exact: true }).count();
  const badgeLive = await sidebar.getByText('Live', { exact: true }).count();
  const badgeActive = await sidebar.getByText('Active', { exact: true }).count();

  if (badgeMpo > 0 || badgeRfq > 0 || badgePo > 0 || badgeBills > 0 || badgeLive > 0 || badgeActive > 0) {
    throw new Error('Unnecessary badges still found in sidebar');
  }
  console.log('✅ Sidebar: All unnecessary badges (Active, MPO, RFQ, PO, Bills, Live, etc.) successfully removed');

  // Test clicking Suppliers in sidebar
  await sidebar.getByRole('link', { name: 'Suppliers' }).click();
  await page.waitForTimeout(300);
  console.log('✅ Navigation: Clicked Suppliers successfully');

  // Test clicking Contractors in sidebar
  await sidebar.getByRole('link', { name: 'Contractors' }).click();
  await page.waitForTimeout(300);
  console.log('✅ Navigation: Clicked Contractors successfully');

  // Test clicking Purchase Orders in sidebar
  await sidebar.getByRole('link', { name: 'Purchase Orders' }).click();
  await page.waitForTimeout(300);
  console.log('✅ Navigation: Clicked Purchase Orders successfully');

  // Verify inner tabs in Purchase Orders (All | Raw Material | Finished)
  const poAll = await page.getByRole('button', { name: /^All/i }).first();
  const poRm = await page.getByRole('button', { name: /^Raw Material/i }).first();
  const poFin = await page.getByRole('button', { name: /^Finished/i }).first();
  if (!await poAll.isVisible() || !await poRm.isVisible() || !await poFin.isVisible()) {
    throw new Error('Purchase Orders missing inner tabs');
  }
  console.log('✅ Purchase Orders: Inner tabs (All | Raw Material | Finished) working cleanly');

  await browser.close();
  console.log('🎉 ALL TESTS PASSED! Sidebar is clean, simple, and clutter-free!');
}

testCleanSidebar().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
