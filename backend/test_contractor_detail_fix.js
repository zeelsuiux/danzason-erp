const { chromium } = require('playwright-core');

async function testContractorDetailRoute() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.error('[BROWSER ERROR]', msg.text());
    }
  });
  page.on('pageerror', (err) => {
    errors.push(err.message);
    console.error('[PAGE EXCEPTION]', err.message);
  });

  const testUrl = 'http://localhost:3000/processing/contractors/6adc76bd55b7ce21d4b29595';
  console.log(`Navigating to: ${testUrl}`);
  await page.goto(testUrl, { waitUntil: 'networkidle' });

  // Check if error boundary rendered
  const errorBoundaryText = await page.getByText('Something went wrong on this page').count();
  if (errorBoundaryText > 0) {
    throw new Error('ErrorBoundary was triggered on contractor detail page!');
  }

  const heading = await page.textContent('h1');
  console.log(`✅ Loaded contractor name: "${heading.trim()}"`);

  // Click on Tab 2: Job Work Orders
  console.log('Clicking Tab 2: Job Work Orders');
  await page.getByRole('button', { name: /Job Work Orders/i }).click();
  await page.waitForTimeout(300);

  // Click on Tab 3: Service Bills (the one with invoices)
  console.log('Clicking Tab 3: Service Bills');
  await page.getByRole('button', { name: /Service Bills/i }).click();
  await page.waitForTimeout(300);

  // Verify no error boundary
  const errorBoundaryAfterBills = await page.getByText('Something went wrong on this page').count();
  if (errorBoundaryAfterBills > 0) {
    throw new Error('ErrorBoundary was triggered after clicking Service Bills tab!');
  }
  console.log('✅ Service Bills tab rendered perfectly with NO React object child errors!');

  // Click on Tab 4: Movements
  console.log('Clicking Tab 4: Material Dispatch & Return Log');
  await page.getByRole('button', { name: /Material Dispatch/i }).click();
  await page.waitForTimeout(300);

  // Click on Tab 1: Materials Held
  console.log('Clicking Tab 1: Raw Materials Held');
  await page.getByRole('button', { name: /Raw Materials Held/i }).click();
  await page.waitForTimeout(300);

  if (errors.length > 0) {
    throw new Error(`Console errors encountered: ${errors.join(', ')}`);
  }

  await browser.close();
  console.log('🎉 CONTRACTOR DETAIL PAGE TEST PASSED 100% WITH ZERO ERRORS!');
}

testContractorDetailRoute().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
