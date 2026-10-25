const { chromium } = require('playwright-core');
const fs = require('fs');

const BROWSER_PATH = fs.existsSync('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe')
  ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const BASE_URL = 'http://localhost:3000';

const ROUTES_TO_AUDIT = [
  // 1. Critical Known Route
  { name: 'Manufacturing PO Create', path: '/purchase-orders/create?type=manufacturing' },
  { name: 'Raw Material PO Create', path: '/purchase-orders/create?type=raw_material' },
  { name: 'Standard PO Create', path: '/purchase-orders/create' },
  
  // 2. Raw Material Module
  { name: 'Raw Material Catalog', path: '/raw-materials' },
  { name: 'Raw Material Stock Ledger', path: '/raw-materials/stock-ledger' },
  { name: 'Raw Material Suppliers', path: '/raw-materials/suppliers' },
  { name: 'Raw Material Orders', path: '/raw-materials/orders' },
  { name: 'Raw Material Bills', path: '/raw-materials/bills' },
  
  // 3. Processing / Job Work Module
  { name: 'Job-Work Contractors', path: '/processing/contractors' },
  { name: 'Job Work Orders (MPO)', path: '/processing/orders' },
  { name: 'Job Work Bills', path: '/processing/bills' },
  { name: 'Material Tracking', path: '/processing/material-tracking' },
  
  // 4. Products & Stock Ledger
  { name: 'Products List', path: '/products' },
  
  // 5. Purchase & Procurement
  { name: 'Suppliers Directory', path: '/purchase/suppliers' },
  { name: 'Inquiries & Quotations', path: '/purchase/inquiries' },
  { name: 'Purchase Requisitions', path: '/purchase/requisitions' },
  { name: 'Purchase Orders List', path: '/purchase/orders' },
  { name: 'Supplier Invoices (Bills)', path: '/purchase/invoices' },
  { name: 'Purchase Bill Create (General)', path: '/purchase-bills/create' },
  { name: 'Purchase Bill Create (Raw Material)', path: '/purchase-bills/create?type=raw_material' },
  { name: 'Purchase Bill Create (Manufacturing)', path: '/purchase-bills/create?type=manufacturing' },
  { name: 'Purchase Returns List', path: '/purchase/returns' },
  { name: 'Purchase Return Create', path: '/purchase-returns/create' },
  { name: 'Purchase Settings', path: '/purchase/settings' },
  
  // 6. Sales & CRM
  { name: 'Sales Applications (CRM)', path: '/sales/applications' },
  { name: 'Customers Directory', path: '/sales/customers' },
  { name: 'Sales Quotations / Orders', path: '/sales/quotations' },
  { name: 'Sales Invoices List', path: '/sales/invoices' },
  { name: 'Sales Returns', path: '/sales/returns' },
];

async function audit() {
  console.log(`Starting Browser Audit using: ${BROWSER_PATH}`);
  const browser = await chromium.launch({
    executablePath: BROWSER_PATH,
    headless: true,
  });

  const page = await browser.newPage();
  const results = [];

  for (const item of ROUTES_TO_AUDIT) {
    const url = `${BASE_URL}${item.path}`;
    const errors = [];
    const consoleErrors = [];

    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    let status = 'PASSED';
    let domContentLength = 0;
    let title = '';

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500); // Allow React to mount, fetch APIs, and hydrate

      title = await page.title();
      
      // Check for Blank Screen: inspect #root content
      const rootHtml = await page.evaluate(() => {
        const root = document.getElementById('root');
        return root ? root.innerHTML.trim() : '';
      });

      domContentLength = rootHtml.length;

      // Detect if blank
      if (domContentLength < 50) {
        status = 'BLANK_SCREEN';
      } else if (errors.length > 0) {
        status = 'RUNTIME_ERROR';
      }

      // Check for ErrorBoundary fallback
      const hasErrorFallback = await page.evaluate(() => {
        return document.body.innerText.includes('Something went wrong on this page');
      });

      if (hasErrorFallback) {
        status = 'CAUGHT_BY_ERROR_BOUNDARY';
      }
    } catch (err) {
      status = 'FAILED_NAVIGATION';
      errors.push(err.message);
    }

    results.push({
      name: item.name,
      path: item.path,
      status,
      domLength: domContentLength,
      errors,
      consoleErrors: consoleErrors.slice(0, 3),
    });

    const icon = status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} [${status}] ${item.name} (${item.path}) - DOM: ${domContentLength} chars`);
    if (errors.length > 0) {
      console.log(`   🚨 Errors: ${errors.join('; ')}`);
    }
  }

  await browser.close();

  console.log('\n================ AUDIT SUMMARY ================');
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status !== 'PASSED').length;
  console.log(`Total Routes Tested: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed / Blank / Errors: ${failed}`);

  fs.writeFileSync('backend/audit_results.json', JSON.stringify(results, null, 2));
}

audit().catch(console.error);
