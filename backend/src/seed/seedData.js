const mongoose = require('mongoose');
const SupplierCategory = require('../models/SupplierCategory');
const Supplier = require('../models/Supplier');
const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const PurchaseInquiry = require('../models/PurchaseInquiry');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder = require('../models/PurchaseOrder');
const GoodsReceiptNote = require('../models/GoodsReceiptNote');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const PurchaseReturn = require('../models/PurchaseReturn');
const Customer = require('../models/Customer');
const SalesOrder = require('../models/SalesOrder');
const SalesInvoice = require('../models/SalesInvoice');
const Lead = require('../models/Lead');
const TeamMember = require('../models/TeamMember');

const seedAllData = async () => {
  console.log('🌱 Checking / Seeding Initial ERP Data...');

  const existingGrn = await GoodsReceiptNote.findOne({ grn_number: 'GRN-2026-00001' });
  if (existingGrn) {
    console.log('✅ Initial ERP Data already seeded, skipping duplicate run.');
    return;
  }

  // Ensure Danza-Son Apparel Categories exist
  let categories = await SupplierCategory.find({ is_deleted: false });
  if (categories.length === 0) {
    categories = await SupplierCategory.insertMany([
      { name: 'T-SHIRT', code: 'TSHIRT', description: 'Polo neck, round neck, full sleeve, and oversized t-shirts', is_active: true },
      { name: 'TRACKPANT', code: 'TRACKPANT', description: 'Athletic, gym, and lifestyle trackpants and joggers', is_active: true },
      { name: 'TRACKSUIT', code: 'TRACKSUIT', description: 'Full tracksuits, athletic sets, and winter apparel', is_active: true },
      { name: 'CAP', code: 'CAP', description: 'Designer caps, hats, baseball caps, and headwear', is_active: true },
      { name: 'CO-ORD SET', code: 'COORDSET', description: 'Matching lifestyle and resort co-ord sets', is_active: true },
      { name: 'SHIRTS', code: 'SHIRTS', description: 'Formal and casual woven shirts', is_active: true },
      { name: 'HOODIES', code: 'HOODIES', description: 'Fleece hoodies and sweatshirts', is_active: true },
    ]);
  }

  // 2. Warehouses
  let warehouses = await Warehouse.find({ is_deleted: false });
  if (warehouses.length === 0) {
    warehouses = await Warehouse.insertMany([
      {
        warehouse_name: 'Central Distribution Hub Mumbai',
        warehouse_code: 'WH-MUM-01',
        warehouse_type: 'central',
        address: { line1: 'Sector 18, MIDC', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
        status: 'active',
      },
      {
        warehouse_name: 'North Logistics Depot Delhi',
        warehouse_code: 'WH-DEL-01',
        warehouse_type: 'regional',
        address: { line1: 'Okhla Industrial Area Ph-III', city: 'New Delhi', state: 'Delhi', pincode: '110020' },
        status: 'active',
      },
      {
        warehouse_name: 'Surat Textile Mill Depot',
        warehouse_code: 'WH-SRT-01',
        warehouse_type: 'central',
        address: { line1: 'Ring Road Industrial Estate', city: 'Surat', state: 'Gujarat', pincode: '395002' },
        status: 'active',
      },
    ]);
  }

  // 3. Danza Son Apparel Products with complete color-wise variants
  const { DANZA_APPAREL_PRODUCTS } = require('./apparelData');

  // Clean out any old dummy non-apparel products
  await Product.deleteMany({
    product_name: {
      $in: [
        'Hydraulic Double Cylinder Floor Spring 100KG',
        'Stainless Steel 304 Solid Rod Extrusion',
        'Premium Organic Cotton Fabric 180 GSM',
        'Danza Branded Corrugated Export Box 5-Ply',
        'YKK Premium Metal Zippers #5 Brass 60cm',
        'Luxury Velvet Cushion Cover 16x16',
      ],
    },
  });

  // Insert or upsert Danza Son Apparel Products
  for (const item of DANZA_APPAREL_PRODUCTS) {
    await Product.findOneAndUpdate(
      { product_name: item.product_name },
      item,
      { upsert: true, new: true }
    );
  }

  const products = await Product.find({ is_deleted: false });

  // 4. Suppliers
  const suppliers = await Supplier.insertMany([
    {
      supplier_name: 'Apex Metals & Alloys Ltd.',
      supplier_code: 'SUP-0001',
      contact_person: 'Rajesh Sharma',
      email: 'rajesh@apexmetals.com',
      mobile: '9825012345',
      gstin: '24AAACA1234F1Z8',
      pan: 'AAACA1234F',
      supplier_type: 'B2B',
      category: 'raw_materials',
      category_id: categories[0]._id,
      rating: 5,
      payment_terms: 'Net 30 Days',
      pending_balance: 14160,
      address: { address_line1: 'GIDC Industrial Estate Phase 2', city: 'Ahmedabad', state: 'Gujarat', pincode: '382445' },
    },
    {
      supplier_name: 'Codezil Technologies Hardware',
      supplier_code: 'SUP-0002',
      contact_person: 'Vipul Patel',
      email: 'sales@codezil.com',
      mobile: '07574016606',
      gstin: '24BBBCD5678K1Z2',
      pan: 'BBBCD5678K',
      supplier_type: 'B2B',
      category: 'raw_materials',
      category_id: categories[0]._id,
      rating: 4,
      payment_terms: 'Immediate / Advance',
      pending_balance: 0,
      address: { address_line1: 'Katargam GIDC', city: 'Surat', state: 'Gujarat', pincode: '395004' },
    },
    {
      supplier_name: 'Raymond Luxury Fabrics Ltd.',
      supplier_code: 'SUP-0003',
      contact_person: 'Anand Singhania',
      email: 'anand.s@raymondfabrics.com',
      mobile: '9820098765',
      gstin: '27AAACR4567M1Z1',
      pan: 'AAACR4567M',
      supplier_type: 'D2C',
      category: 'fabric',
      category_id: categories[1]._id,
      rating: 5,
      payment_terms: 'Net 60 Days',
      pending_balance: 55000,
      address: { address_line1: 'Thane West Estate', city: 'Thane', state: 'Maharashtra', pincode: '400601' },
    },
    {
      supplier_name: 'Sun Packaging Industries',
      supplier_code: 'SUP-0004',
      contact_person: 'Bhavik Shah',
      email: 'orders@sunpackaging.in',
      mobile: '9898011223',
      gstin: '24AACCS9012P1ZQ',
      pan: 'AACCS9012P',
      supplier_type: 'B2C',
      category: 'packaging',
      category_id: categories[2]._id,
      rating: 4,
      payment_terms: 'Net 15 Days',
      pending_balance: 8200,
      address: { address_line1: 'Makarpura GIDC', city: 'Vadodara', state: 'Gujarat', pincode: '390010' },
    },
    {
      supplier_name: 'ABC Garments Manufacturing Works',
      supplier_code: 'SUP-M001',
      contact_person: 'Ramesh Patel',
      email: 'ramesh@abcgarments.com',
      mobile: '9825099887',
      gstin: '24AABCA1234F1Z9',
      pan: 'AABCA1234F',
      supplier_type: 'MANUFACTURER',
      supplier_classification: 'manufacturing',
      category: 'manufacturing',
      category_id: categories[0]._id,
      rating: 5,
      payment_terms: 'Net 30 Days',
      pending_balance: 0,
      address: { address_line1: 'Plot 45, GIDC Industrial Estate', city: 'Ahmedabad', state: 'Gujarat', pincode: '382445' },
    },
  ]);

  // 5. Purchase Requisitions (PR)
  const pr = new PurchaseRequisition({
    requisition_number: 'PR-2026-00001',
    department: 'Production',
    priority: 'high',
    warehouse_id: warehouses[0]._id,
    reason_for_request: 'min_reorder_level',
    requested_by: 'Shopfloor Lead - Dinesh',
    items: [
      {
        product_id: products[0]._id,
        requested_qty: 25,
        estimated_rate: 100,
        total_amount: 2500,
        description: 'Hydraulic Double Cylinder Floor Spring 100KG',
      },
      {
        product_id: products[1]._id,
        requested_qty: 50,
        estimated_rate: 140,
        total_amount: 7000,
        description: 'Stainless Steel 304 Solid Rod Extrusion',
      },
    ],
    status: 'approved',
  });
  await pr.save();

  // 6. Purchase Inquiries (RFQ)
  const inquiry = new PurchaseInquiry({
    inquiry_number: 'INQ-2026-00001',
    title: 'RFQ - Monthly Solid Steel & Hardware Fittings Requirements',
    category_id: categories[0]._id,
    category_name: 'Raw Materials',
    expected_delivery_date: new Date(Date.now() + 7 * 86400000),
    remarks: 'Targeting standard dispatch with inspection certificates',
    items: [
      {
        item_name: 'Stainless Steel 304 Solid Rod Extrusion',
        quantity: 100,
        uom: 'KGS',
        target_price: 135,
        description: 'Grade 304 finish',
      },
    ],
    suppliers: [
      {
        supplier_id: suppliers[0]._id,
        quoted_price: 140,
        quoted_delivery_date: new Date(Date.now() + 5 * 86400000),
        quoted_remarks: 'Ex-stock available with test certs',
        status: 'accepted',
        accept_reason: 'Optimal delivery timeframe and rate',
      },
      {
        supplier_id: suppliers[1]._id,
        quoted_price: 148,
        quoted_delivery_date: new Date(Date.now() + 10 * 86400000),
        quoted_remarks: 'Requires 10 days advance manufacturing',
        status: 'rejected',
        reject_reason: 'Higher rate and longer turnaround',
      },
    ],
    status: 'awarded',
  });
  await inquiry.save();

  // 7. Purchase Order (PO)
  const po = new PurchaseOrder({
    po_number: 'PO-2026-00001',
    po_date: new Date(Date.now() - 3 * 86400000),
    supplier_id: suppliers[0]._id,
    warehouse_id: warehouses[0]._id,
    pr_id: pr._id,
    expected_delivery_date: new Date(Date.now() + 4 * 86400000),
    payment_terms: 'Net 30 Days',
    delivery_terms: 'FOB Destination',
    is_interstate: false,
    items: [
      {
        product_id: products[0]._id,
        description: 'Hydraulic Double Cylinder Floor Spring 100KG',
        ordered_qty: 20,
        received_qty: 10,
        pending_qty: 10,
        rate: 100,
        discount_percent: 0,
        gst_rate: 12,
      },
      {
        product_id: products[1]._id,
        description: 'Stainless Steel 304 Solid Rod Extrusion',
        ordered_qty: 50,
        received_qty: 50,
        pending_qty: 0,
        rate: 140,
        discount_percent: 0,
        gst_rate: 18,
      },
    ],
    status: 'partially_received',
    notes: 'Kindly ensure Mill Test Certificate accompanies shipment.',
  });
  await po.save();

  // 8. Goods Receipt Note (GRN)
  const grn = new GoodsReceiptNote({
    grn_number: 'GRN-2026-00001',
    grn_date: new Date(Date.now() - 1 * 86400000),
    po_id: po._id,
    supplier_id: suppliers[0]._id,
    warehouse_id: warehouses[0]._id,
    vendor_challan_no: 'CH-APEX-8891',
    vendor_challan_date: new Date(Date.now() - 2 * 86400000),
    vehicle_number: 'GJ-01-AB-4455',
    driver_name: 'Rameshwar Yadav',
    remarks: 'Received in good packaging condition. Inspected by QC team.',
    items: [
      {
        po_item_id: po.items[0]._id,
        product_id: products[0]._id,
        received_qty: 10,
        accepted_qty: 10,
        rejected_qty: 0,
        unit_rate: 100,
        batch_number: 'BATCH-2026-A1',
        qc_status: 'passed',
      },
      {
        po_item_id: po.items[1]._id,
        product_id: products[1]._id,
        received_qty: 50,
        accepted_qty: 50,
        rejected_qty: 0,
        unit_rate: 140,
        batch_number: 'BATCH-2026-A2',
        qc_status: 'passed',
      },
    ],
    status: 'posted',
    stock_posted: true,
    stock_posted_at: new Date(),
  });
  await grn.save();

  // 9. Purchase Invoice (Vendor Bill)
  const invoice = new PurchaseInvoice({
    invoice_number: 'PINV-2026-00001',
    vendor_bill_number: 'INV/APEX/2026/0412',
    bill_date: new Date(Date.now() - 1 * 86400000),
    due_date: new Date(Date.now() + 29 * 86400000),
    supplier_id: suppliers[0]._id,
    po_id: po._id,
    grn_id: grn._id,
    items: [
      {
        product_id: products[1]._id,
        description: 'Stainless Steel 304 Solid Rod Extrusion',
        hsn_code: '7304',
        quantity: 50,
        unit_rate: 140,
        taxable_amount: 7000,
        gst_rate: 18,
      },
    ],
    payment_status: 'unpaid',
    status: 'posted',
    remarks: 'Material inward verified against GRN-2026-00001.',
  });
  await invoice.save();

  // 10. Purchase Return
  const returnDoc = new PurchaseReturn({
    return_number: 'PRTN-2026-00001',
    return_date: new Date(),
    supplier_id: suppliers[3]._id,
    warehouse_id: warehouses[0]._id,
    reason: 'Dimensions misaligned and surface scratches on 10 boxes',
    items: [
      {
        product_id: products[3]._id,
        description: 'Danza Branded Corrugated Export Box 5-Ply',
        quantity: 10,
        unit: 'BOX',
        unit_price: 45,
        total: 450,
      },
    ],
    grand_total: 450,
    status: 'approved',
  });
  await returnDoc.save();

  // 11. Initial Customers (Sales System)
  const customerCount = await Customer.countDocuments();
  if (customerCount === 0) {
    const seededCustomers = await Customer.insertMany([
      {
        customer_name: 'Shree Krishna Hardware & Architectural',
        customer_code: 'CUST-0001',
        company_name: 'Shree Krishna Hardware Trading Co.',
        contact_person: 'Ghanshyam Patel',
        mobile: '9825123987',
        email: 'sales@shreekrishnahardware.com',
        gstin: '24AAACK1234E1Z5',
        pan: 'AAACK1234E',
        customer_type: 'B2B',
        category: 'Hardware',
        categories: ['Hardware', 'Architectural Fittings'],
        credit_limit: 250000,
        credit_period_days: 30,
        payment_terms: 'Net 30 Days',
        pending_balance: 35400,
        billing_address: {
          address_line1: 'Shop 14-16, New Cloth Market',
          city: 'Ahmedabad',
          state: 'Gujarat',
          pincode: '380002',
          country: 'India',
        },
        shipping_address: {
          address_line1: 'Godown 4, Naroda GIDC',
          city: 'Ahmedabad',
          state: 'Gujarat',
          pincode: '382330',
          country: 'India',
        },
        status: 'active',
      },
      {
        customer_name: 'Bombay Fashion Apparels Pvt. Ltd.',
        customer_code: 'CUST-0002',
        company_name: 'Bombay Fashion Retail Group',
        contact_person: 'Rohan Mehra',
        mobile: '9819087654',
        email: 'procurement@bombayfashion.com',
        gstin: '27AABCB9876F1Z2',
        pan: 'AABCB9876F',
        customer_type: 'B2D',
        category: 'Apparels',
        categories: ['Apparels', 'Fabrics'],
        credit_limit: 500000,
        credit_period_days: 45,
        payment_terms: 'Net 45 Days',
        pending_balance: 85000,
        billing_address: {
          address_line1: 'Phoenix Mills Compound, Lower Parel',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400013',
          country: 'India',
        },
        shipping_address: {
          address_line1: 'Bhiwandi Central Depot',
          city: 'Bhiwandi',
          state: 'Maharashtra',
          pincode: '421302',
          country: 'India',
        },
        status: 'active',
      },
      {
        customer_name: 'Surat Glass & Fitting Solutions',
        customer_code: 'CUST-0003',
        company_name: 'Surat Glass Solutions',
        contact_person: 'Chirag Desai',
        mobile: '9909012345',
        email: 'info@suratglasssolutions.com',
        gstin: '24AACCS5432B1ZM',
        pan: 'AACCS5432B',
        customer_type: 'B2C',
        category: 'Hardware',
        categories: ['Hardware', 'Fittings'],
        credit_limit: 150000,
        credit_period_days: 15,
        payment_terms: 'Net 15 Days',
        pending_balance: 0,
        billing_address: {
          address_line1: 'Ring Road Trade Center',
          city: 'Surat',
          state: 'Gujarat',
          pincode: '395002',
          country: 'India',
        },
        shipping_address: {
          address_line1: 'Ring Road Trade Center',
          city: 'Surat',
          state: 'Gujarat',
          pincode: '395002',
          country: 'India',
        },
        status: 'active',
      },
    ]);

    // Initial Sales Order
    const sampleSO = new SalesOrder({
      so_number: 'SO-2026-00001',
      customer_id: seededCustomers[0]._id,
      order_date: new Date(Date.now() - 2 * 86400000),
      expected_delivery_date: new Date(Date.now() + 5 * 86400000),
      warehouse_id: warehouses[0]._id,
      items: [
        {
          product_id: products[0]._id,
          product_name: products[0].product_name,
          sku: products[0].sku,
          quantity: 20,
          uom: 'PCS',
          unit_price: 180,
          discount_percentage: 0,
          discount_amount: 0,
          taxable_amount: 3600,
          gst_rate: 12,
          gst_amount: 432,
          total_amount: 4032,
        },
      ],
      subtotal: 3600,
      discount_total: 0,
      tax_total: 432,
      shipping_charges: 200,
      round_off: 0,
      grand_total: 4232,
      advance_paid: 2000,
      payment_terms: 'Net 30 Days',
      payment_status: 'partially_paid',
      dispatch_status: 'not_dispatched',
      status: 'confirmed',
      notes: 'Customer requested bubble wrapping and dispatch by Friday.',
    });
    await sampleSO.save();
  }

  // Ensure multiple order requests / applications exist for CRM showcase
  const currentOrderCount = await SalesOrder.countDocuments();
  if (currentOrderCount <= 1) {
    const allCustomers = await Customer.find({ is_deleted: false });
    const allProducts = await Product.find({ is_deleted: false });
    const allWarehouses = await Warehouse.find({ is_deleted: false });

    if (allCustomers.length >= 2 && allProducts.length >= 2) {
      const c2 = allCustomers[1] || allCustomers[0];
      const c3 = allCustomers[2] || allCustomers[0];
      const p1 = allProducts[0];
      const p2 = allProducts[1];
      const wh = allWarehouses[0]?._id;

      await SalesOrder.insertMany([
        {
          so_number: 'SO-2026-00002',
          customer_id: c2._id,
          order_date: new Date(Date.now() - 1 * 86400000),
          expected_delivery_date: new Date(Date.now() + 4 * 86400000),
          warehouse_id: wh,
          items: [
            {
              product_id: p1._id,
              product_name: p1.product_name || p1.title,
              sku: p1.sku,
              quantity: 50,
              uom: 'PCS',
              unit_price: 240,
              discount_percentage: 5,
              discount_amount: 600,
              taxable_amount: 11400,
              gst_rate: 5,
              gst_amount: 570,
              total_amount: 11970,
            },
            {
              product_id: p2._id,
              product_name: p2.product_name || p2.title,
              sku: p2.sku,
              quantity: 25,
              uom: 'PCS',
              unit_price: 320,
              discount_percentage: 0,
              discount_amount: 0,
              taxable_amount: 8000,
              gst_rate: 5,
              gst_amount: 400,
              total_amount: 8400,
            },
          ],
          subtotal: 19400,
          discount_total: 600,
          tax_total: 970,
          shipping_charges: 350,
          round_off: 0,
          grand_total: 20720,
          advance_paid: 0,
          payment_terms: 'Net 45 Days',
          payment_status: 'unpaid',
          dispatch_status: 'not_dispatched',
          status: 'pending',
          notes: 'Urgent wholesale buyer application submitted via CRM portal. Requires sales manager approval.',
        },
        {
          so_number: 'SO-2026-00003',
          customer_id: c3._id,
          order_date: new Date(Date.now() - 3 * 86400000),
          expected_delivery_date: new Date(Date.now() + 2 * 86400000),
          warehouse_id: wh,
          items: [
            {
              product_id: p2._id,
              product_name: p2.product_name || p2.title,
              sku: p2.sku,
              quantity: 15,
              uom: 'PCS',
              unit_price: 350,
              discount_percentage: 0,
              discount_amount: 0,
              taxable_amount: 5250,
              gst_rate: 5,
              gst_amount: 262.5,
              total_amount: 5512.5,
            },
          ],
          subtotal: 5250,
          discount_total: 0,
          tax_total: 262.5,
          shipping_charges: 150,
          round_off: 0.5,
          grand_total: 5663,
          advance_paid: 5663,
          payment_terms: 'Immediate Online',
          payment_status: 'paid',
          dispatch_status: 'partially_dispatched',
          status: 'processing',
          notes: 'Prepaid order application received online. Packaging in progress.',
        },
      ]);
    }
  }

  // 10. Raw Materials & Manufacturing Initial Data (Cotton Fabric RM-001 & ABC Garments)
  const RawMaterial = require('../models/RawMaterial');
  const RawMaterialMovement = require('../models/RawMaterialMovement');
  const allWh = await Warehouse.find({ is_deleted: false });
  const mainWh = allWh[0];
  const abcSupplier = (await Supplier.findOne({ supplier_name: /ABC Garments/i })) || (await Supplier.findOne({ is_deleted: false }));

  let existingRm = await RawMaterial.findOne({ material_code: 'RM-001' });
  if (!existingRm) {
    const cottonFabric = await RawMaterial.create({
      material_code: 'RM-001',
      material_name: 'Cotton Fabric',
      category: 'Fabric',
      subcategory: 'Single Jersey',
      description: '100% Combed Cotton Bio-Washed Knitted Fabric 180 GSM',
      uom: 'KG',
      purchase_unit: 'KG',
      stock_unit: 'KG',
      conversion_factor: 1,
      default_supplier_id: abcSupplier?._id || null,
      purchase_rate: 200,
      cost_rate: 200,
      min_stock_level: 5,
      reorder_level: 10,
      opening_stock: 10,
      opening_stock_value: 2000,
      warehouse_id: mainWh?._id || null,
      warehouse_stock: 10,
      supplier_stock: 0,
      in_transit_stock: 0,
      total_stock: 10,
      warehouse_balances: [
        {
          warehouse_id: mainWh?._id,
          warehouse_name: mainWh?.warehouse_name || 'Main Warehouse',
          current_stock: 10,
        },
      ],
      supplier_balances: abcSupplier
        ? [
            {
              supplier_id: abcSupplier._id,
              supplier_name: abcSupplier.supplier_name,
              current_stock: 0,
              consumed_stock: 0,
              pending_return_stock: 0,
            },
          ]
        : [],
      hsn_code: '5208',
      gst_rate: 5,
      status: 'active',
      notes: 'Standard Cotton Fabric for production of round neck and polo t-shirts',
    });

    await RawMaterialMovement.create({
      transaction_number: 'TXN-RM-00001',
      transaction_type: 'Opening Stock',
      reference_no: 'INIT-AUDIT-001',
      reference_type: 'Initial Opening Stock Audit',
      raw_material_id: cottonFabric._id,
      material_code: cottonFabric.material_code,
      material_name: cottonFabric.material_name,
      warehouse_id: mainWh?._id,
      warehouse_name: mainWh?.warehouse_name || 'Main Warehouse',
      source_location: 'Opening Stock Audit',
      destination_location: mainWh?.warehouse_name || 'Main Warehouse',
      qty_in: 10,
      qty_out: 0,
      uom: 'KG',
      warehouse_balance: 10,
      supplier_balance: 0,
      in_transit_balance: 0,
      total_company_balance: 10,
      created_by: 'System Administrator',
      remarks: 'Initial opening stock in Main Warehouse (10 KG @ ₹200/KG)',
    });

    await RawMaterial.create([
      {
        material_code: 'RM-002',
        material_name: 'Polyester Sewing Thread',
        category: 'Thread',
        uom: 'SPOOL',
        purchase_rate: 45,
        cost_rate: 45,
        opening_stock: 50,
        warehouse_id: mainWh?._id,
        warehouse_stock: 50,
        total_stock: 50,
        warehouse_balances: [
          { warehouse_id: mainWh?._id, warehouse_name: mainWh?.warehouse_name, current_stock: 50 },
        ],
        hsn_code: '5401',
        gst_rate: 12,
      },
      {
        material_code: 'RM-003',
        material_name: 'Polyester Woven Labels',
        category: 'Trims',
        uom: 'PCS',
        purchase_rate: 1.5,
        cost_rate: 1.5,
        opening_stock: 500,
        warehouse_id: mainWh?._id,
        warehouse_stock: 500,
        total_stock: 500,
        warehouse_balances: [
          { warehouse_id: mainWh?._id, warehouse_name: mainWh?.warehouse_name, current_stock: 500 },
        ],
        hsn_code: '5807',
        gst_rate: 12,
      },
    ]);
  }

  // Ensure Cotton T-Shirt finished product exists with 0 opening stock
  const cottonTShirt = await Product.findOne({ product_name: /Cotton T-Shirt/i });
  if (!cottonTShirt) {
    await Product.create({
      product_name: 'Cotton T-Shirt',
      title: 'Cotton T-Shirt Regular Fit',
      product_code: 'TSHIRT-COTTON',
      sku: 'TSHIRT-COTTON-BLK',
      category: 'T-SHIRT',
      uom: 'PCS',
      purchase_rate: 120,
      selling_rate: 350,
      b2b_price: 250,
      b2c_price: 350,
      mrp: 499,
      current_stock: 0, // Starts at 0 as required by Prompt Section 15 Test Case!
      hsn_code: '6109',
      gst_rate: 5,
      status: 'active',
      description: '100% Cotton Bio-Washed Crew Neck T-Shirt manufactured through external job work.',
    });
  }

  

  // 12. Initial Sales Invoices & Operational Transactions (For Profitability & Finance Analytics)
  const FinanceTransaction = require('../models/FinanceTransaction');
  const invoiceCount = await SalesInvoice.countDocuments();
  if (invoiceCount === 0) {
    const custs = await Customer.find({ is_deleted: false });
    const prods = await Product.find({ is_deleted: false });

    if (custs.length >= 2 && prods.length >= 2) {
      const c1 = custs[0];
      const c2 = custs[1];
      const c3 = custs[2] || custs[0];

      const p1 = prods[0];
      const p2 = prods[1];
      const p3 = prods[2] || prods[0];

      const now = new Date();
      const d1 = new Date(now.getTime() - 25 * 86400000);
      const d2 = new Date(now.getTime() - 14 * 86400000);
      const d3 = new Date(now.getTime() - 5 * 86400000);
      const d4 = new Date(now.getTime() - 1 * 86400000);

      // Invoice 1
      const inv1 = new SalesInvoice({
        invoice_number: 'INV-SALES-2026-00001',
        customer_id: c1._id,
        customer_name: c1.customer_name,
        invoice_date: d1,
        due_date: new Date(d1.getTime() + 30 * 86400000),
        items: [
          {
            product_id: p1._id,
            product_name: p1.product_name,
            hsn_code: p1.hsn_code || '6109',
            quantity: 120,
            uom: p1.uom || 'PCS',
            unit_price: p1.selling_rate || 280,
            discount_amount: 0,
            taxable_amount: 120 * (p1.selling_rate || 280),
            gst_rate: 5,
            cgst_amount: Math.round(120 * (p1.selling_rate || 280) * 0.025),
            sgst_amount: Math.round(120 * (p1.selling_rate || 280) * 0.025),
            igst_amount: 0,
            total_amount: Math.round(120 * (p1.selling_rate || 280) * 1.05),
          },
        ],
        subtotal: 120 * (p1.selling_rate || 280),
        tax_total: Math.round(120 * (p1.selling_rate || 280) * 0.05),
        grand_total: Math.round(120 * (p1.selling_rate || 280) * 1.05),
        paid_amount: Math.round(120 * (p1.selling_rate || 280) * 1.05),
        balance_amount: 0,
        payment_status: 'paid',
        status: 'issued',
        payments: [
          {
            amount: Math.round(120 * (p1.selling_rate || 280) * 1.05),
            payment_date: d1,
            payment_mode: 'Bank Transfer',
            reference_number: 'NEFT-5489201',
            notes: 'Full payment received against Inv 1',
          },
        ],
      });
      await inv1.save();

      // Invoice 2
      const inv2 = new SalesInvoice({
        invoice_number: 'INV-SALES-2026-00002',
        customer_id: c2._id,
        customer_name: c2.customer_name,
        invoice_date: d2,
        due_date: new Date(d2.getTime() + 45 * 86400000),
        items: [
          {
            product_id: p2._id,
            product_name: p2.product_name,
            hsn_code: p2.hsn_code || '6103',
            quantity: 75,
            uom: p2.uom || 'PCS',
            unit_price: p2.selling_rate || 450,
            discount_amount: 1000,
            taxable_amount: 75 * (p2.selling_rate || 450) - 1000,
            gst_rate: 12,
            cgst_amount: 0,
            sgst_amount: 0,
            igst_amount: Math.round((75 * (p2.selling_rate || 450) - 1000) * 0.12),
            total_amount: Math.round((75 * (p2.selling_rate || 450) - 1000) * 1.12),
          },
        ],
        subtotal: 75 * (p2.selling_rate || 450) - 1000,
        tax_total: Math.round((75 * (p2.selling_rate || 450) - 1000) * 0.12),
        grand_total: Math.round((75 * (p2.selling_rate || 450) - 1000) * 1.12),
        paid_amount: 20000,
        balance_amount: Math.round((75 * (p2.selling_rate || 450) - 1000) * 1.12) - 20000,
        payment_status: 'partially_paid',
        status: 'issued',
        payments: [
          {
            amount: 20000,
            payment_date: d2,
            payment_mode: 'Bank Transfer',
            reference_number: 'IMPS-998822',
            notes: 'Part advance payment',
          },
        ],
      });
      await inv2.save();

      // Invoice 3
      const inv3 = new SalesInvoice({
        invoice_number: 'INV-SALES-2026-00003',
        customer_id: c3._id,
        customer_name: c3.customer_name,
        invoice_date: d3,
        due_date: new Date(d3.getTime() + 15 * 86400000),
        items: [
          {
            product_id: p1._id,
            product_name: p1.product_name,
            hsn_code: p1.hsn_code || '6109',
            quantity: 50,
            uom: 'PCS',
            unit_price: p1.selling_rate || 280,
            discount_amount: 0,
            taxable_amount: 50 * (p1.selling_rate || 280),
            gst_rate: 5,
            cgst_amount: Math.round(50 * (p1.selling_rate || 280) * 0.025),
            sgst_amount: Math.round(50 * (p1.selling_rate || 280) * 0.025),
            igst_amount: 0,
            total_amount: Math.round(50 * (p1.selling_rate || 280) * 1.05),
          },
          {
            product_id: p3._id,
            product_name: p3.product_name,
            hsn_code: p3.hsn_code || '6201',
            quantity: 30,
            uom: 'PCS',
            unit_price: p3.selling_rate || 550,
            discount_amount: 500,
            taxable_amount: 30 * (p3.selling_rate || 550) - 500,
            gst_rate: 5,
            cgst_amount: Math.round((30 * (p3.selling_rate || 550) - 500) * 0.025),
            sgst_amount: Math.round((30 * (p3.selling_rate || 550) - 500) * 0.025),
            igst_amount: 0,
            total_amount: Math.round((30 * (p3.selling_rate || 550) - 500) * 1.05),
          },
        ],
        subtotal: 50 * (p1.selling_rate || 280) + (30 * (p3.selling_rate || 550) - 500),
        tax_total: Math.round((50 * (p1.selling_rate || 280) + (30 * (p3.selling_rate || 550) - 500)) * 0.05),
        grand_total: Math.round((50 * (p1.selling_rate || 280) + (30 * (p3.selling_rate || 550) - 500)) * 1.05),
        paid_amount: 0,
        balance_amount: Math.round((50 * (p1.selling_rate || 280) + (30 * (p3.selling_rate || 550) - 500)) * 1.05),
        payment_status: 'unpaid',
        status: 'issued',
      });
      await inv3.save();

      // Invoice 4
      const inv4 = new SalesInvoice({
        invoice_number: 'INV-SALES-2026-00004',
        customer_id: c1._id,
        customer_name: c1.customer_name,
        invoice_date: d4,
        due_date: new Date(d4.getTime() + 30 * 86400000),
        items: [
          {
            product_id: p2._id,
            product_name: p2.product_name,
            hsn_code: p2.hsn_code || '6103',
            quantity: 40,
            uom: 'PCS',
            unit_price: p2.selling_rate || 450,
            discount_amount: 0,
            taxable_amount: 40 * (p2.selling_rate || 450),
            gst_rate: 5,
            cgst_amount: Math.round(40 * (p2.selling_rate || 450) * 0.025),
            sgst_amount: Math.round(40 * (p2.selling_rate || 450) * 0.025),
            igst_amount: 0,
            total_amount: Math.round(40 * (p2.selling_rate || 450) * 1.05),
          },
        ],
        subtotal: 40 * (p2.selling_rate || 450),
        tax_total: Math.round(40 * (p2.selling_rate || 450) * 0.05),
        grand_total: Math.round(40 * (p2.selling_rate || 450) * 1.05),
        paid_amount: Math.round(40 * (p2.selling_rate || 450) * 1.05),
        balance_amount: 0,
        payment_status: 'paid',
        status: 'issued',
        payments: [
          {
            amount: Math.round(40 * (p2.selling_rate || 450) * 1.05),
            payment_date: d4,
            payment_mode: 'UPI',
            reference_number: 'UPI-77665544',
            notes: 'Instant settlement',
          },
        ],
      });
      await inv4.save();

      // Seed Operating Expenses
      await FinanceTransaction.insertMany([
        {
          transaction_number: 'TX-EXP-2026-00001',
          transaction_type: 'expense',
          entry_source: 'manual',
          amount: 15000,
          transaction_date: d1,
          category: 'Office Rent',
          party_name: 'Industrial Estate Landlord',
          party_type: 'other',
          payment_method: 'Bank Transfer',
          account_name: 'Primary Bank Account (HDFC Bank - Current A/c #5020001)',
          notes: 'Factory & Office premises rent for the month',
          status: 'confirmed',
        },
        {
          transaction_number: 'TX-EXP-2026-00002',
          transaction_type: 'expense',
          entry_source: 'manual',
          amount: 22000,
          transaction_date: d2,
          category: 'Employee Salaries & Wages',
          party_name: 'Production & Dispatch Staff',
          party_type: 'employee',
          payment_method: 'Bank Transfer',
          account_name: 'Primary Bank Account (HDFC Bank - Current A/c #5020001)',
          notes: 'Master cutter, packing crew & operator wages',
          status: 'confirmed',
        },
        {
          transaction_number: 'TX-EXP-2026-00003',
          transaction_type: 'expense',
          entry_source: 'manual',
          amount: 3200,
          transaction_date: d3,
          category: 'Electricity & Utilities',
          party_name: 'Gujarat Electricity Board',
          party_type: 'other',
          payment_method: 'Net Banking',
          account_name: 'Primary Bank Account (HDFC Bank - Current A/c #5020001)',
          notes: 'Commercial power bill',
          status: 'confirmed',
        },
        {
          transaction_number: 'TX-EXP-2026-00004',
          transaction_type: 'expense',
          entry_source: 'manual',
          amount: 2800,
          transaction_date: d3,
          category: 'Packaging & Box Materials',
          party_name: 'Krishna Polybags & Corrugated Boxes',
          party_type: 'supplier',
          payment_method: 'Cash',
          account_name: 'Cash Drawer / Petty Cash',
          notes: 'Poly sleeves, cartons and tapes',
          status: 'confirmed',
        },
        {
          transaction_number: 'TX-EXP-2026-00005',
          transaction_type: 'expense',
          entry_source: 'manual',
          amount: 4500,
          transaction_date: d4,
          category: 'Transportation & Logistics',
          party_name: 'V-Trans Logistics & Courier',
          party_type: 'supplier',
          payment_method: 'UPI',
          account_name: 'Corporate UPI / QR Merchant',
          notes: 'Outward freight to Mumbai distributor',
          status: 'confirmed',
        },
      ]);
    }
  }

  // 12. Seed Sample Leads & Follow-ups
  const existingLeadsCount = await Lead.countDocuments({ is_deleted: false });
  if (existingLeadsCount === 0) {
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    const tomorrow = new Date(Date.now() + 86400000);
    const dayAfter = new Date(Date.now() + 2 * 86400000);

    await Lead.create([
      {
        lead_number: 'LEAD-2026-00001',
        lead_name: 'Rajesh Sharma',
        company_name: 'Shree Balaji Garments',
        mobile: '9825012345',
        email: 'rajesh@balajigarments.com',
        lead_source: 'IndiaMART',
        interest_type: 'Finished Goods',
        estimated_value: 150000,
        priority: 'high',
        status: 'contacted',
        assigned_to: 'Vikram Mehta',
        city: 'Ahmedabad',
        state: 'Gujarat',
        address: 'Relief Road, Kalupur',
        requirements: 'Requirement for 500 pcs Cotton Polo T-Shirts (L & XL) with custom embroidery.',
        next_followup_date: today,
        followups: [
          {
            followup_date: today,
            followup_type: 'Phone Call',
            status: 'scheduled',
            notes: 'Client requested catalog and price quote for bulk order.',
            next_action: 'Call to discuss sample dispatch and wholesale pricing.',
            conducted_by: 'Vikram Mehta',
          },
        ],
      },
      {
        lead_number: 'LEAD-2026-00002',
        lead_name: 'Ankit Patel',
        company_name: 'Om Enterprise Surat',
        mobile: '9898123456',
        email: 'ankit@omenterprise.in',
        lead_source: 'WhatsApp',
        interest_type: 'Raw Material',
        estimated_value: 280000,
        priority: 'urgent',
        status: 'qualified',
        assigned_to: 'Pooja Shah',
        city: 'Surat',
        state: 'Gujarat',
        address: 'Ring Road Textile Market',
        requirements: 'Urgent inquiry for 2,000 meters Polyester Dry-Fit Fabric rolls.',
        next_followup_date: yesterday,
        followups: [
          {
            followup_date: yesterday,
            followup_type: 'WhatsApp',
            status: 'scheduled',
            notes: 'Follow-up regarding fabric swatches delivered yesterday.',
            next_action: 'Confirm fabric GSM and color approval.',
            conducted_by: 'Pooja Shah',
          },
        ],
      },
      {
        lead_number: 'LEAD-2026-00003',
        lead_name: 'Vikram Singh',
        company_name: 'Royal Threads Apparel',
        mobile: '9820098765',
        email: 'vikram@royalthreads.com',
        lead_source: 'Exhibition / Trade Fair',
        interest_type: 'Job Work Processing',
        estimated_value: 500000,
        priority: 'high',
        status: 'negotiation',
        assigned_to: 'Vikram Mehta',
        city: 'Mumbai',
        state: 'Maharashtra',
        address: 'Dadar Commercial Complex',
        requirements: 'Job work manufacturing contract for 3,000 winter tracksuits.',
        next_followup_date: tomorrow,
        followups: [
          {
            followup_date: yesterday,
            followup_type: 'Meeting / Visit',
            status: 'completed',
            notes: 'Met at Mumbai showroom, discussed stitching specs and delivery deadlines.',
            conducted_by: 'Vikram Mehta',
            completed_at: yesterday,
          },
          {
            followup_date: tomorrow,
            followup_type: 'Meeting / Visit',
            status: 'scheduled',
            notes: 'Review final terms of contract and advance payment schedule.',
            next_action: 'Finalize contract and issue job work order.',
            conducted_by: 'Vikram Mehta',
          },
        ],
      },
      {
        lead_number: 'LEAD-2026-00004',
        lead_name: 'Manish Jain',
        company_name: 'Jain Hosiery Mills',
        mobile: '9814055555',
        email: 'manish@jainhosiery.com',
        lead_source: 'TradeIndia',
        interest_type: 'Fabric / Yarn',
        estimated_value: 85000,
        priority: 'medium',
        status: 'new',
        assigned_to: 'Pooja Shah',
        city: 'Ludhiana',
        state: 'Punjab',
        address: 'Industrial Area A',
        requirements: 'Interested in premium combed yarn 30s count.',
        next_followup_date: today,
        followups: [
          {
            followup_date: today,
            followup_type: 'Phone Call',
            status: 'scheduled',
            notes: 'First discovery call to understand monthly yarn consumption.',
            next_action: 'Call procurement manager.',
            conducted_by: 'Pooja Shah',
          },
        ],
      },
      {
        lead_number: 'LEAD-2026-00005',
        lead_name: 'Sunil Mehra',
        company_name: 'Apex Retail Stores',
        mobile: '9811122334',
        email: 'sunil@apexretail.in',
        lead_source: 'Website',
        interest_type: 'Finished Goods',
        estimated_value: 320000,
        priority: 'medium',
        status: 'won',
        assigned_to: 'Vikram Mehta',
        city: 'Delhi',
        state: 'Delhi',
        address: 'Karol Bagh Market',
        requirements: 'Regular monthly order for branded oversized t-shirts.',
        converted_at: yesterday,
        followups: [
          {
            followup_date: yesterday,
            followup_type: 'Meeting / Visit',
            status: 'completed',
            notes: 'Account finalized and converted into official ERP customer.',
            completed_at: yesterday,
          },
        ],
      },
    ]);
  }

  // 13. Seed Sample Team Members & Hierarchies (Senior/Junior)
  const existingTeamCount = await TeamMember.countDocuments({ is_deleted: false });
  if (existingTeamCount === 0) {
    // 1. Senior Sales Manager
    const vikram = await TeamMember.create({
      member_code: 'TM-001',
      name: 'Vikram Mehta',
      email: 'vikram.mehta@danzason.com',
      phone: '9825100001',
      department: 'Sales & CRM',
      designation: 'Senior Sales & CRM Manager',
      level: 'senior',
      reports_to: null,
      role_name: 'Senior Sales Manager',
      permissions: {
        leads: { view: true, add: true, edit: true, delete: true },
        sales: { view: true, add: true, edit: true, delete: true },
        purchase: { view: true, add: false, edit: false, delete: false },
        job_work: { view: true, add: false, edit: false, delete: false },
        inventory: { view: true, add: false, edit: false, delete: false },
        finance: { view: true, add: false, edit: false, delete: false },
        team: { view: true, add: true, edit: true, delete: false },
      },
      monthly_targets: { leads_target: 30, revenue_target: 800000, followups_target: 60 },
      status: 'active',
      notes: 'Head of Sales Department, oversees direct leads and enterprise quotations.',
    });

    // 2. Junior Sales Executive (Reports to Vikram)
    await TeamMember.create({
      member_code: 'TM-002',
      name: 'Pooja Shah',
      email: 'pooja.shah@danzason.com',
      phone: '9825100002',
      department: 'Sales & CRM',
      designation: 'Junior Sales Executive',
      level: 'junior',
      reports_to: vikram._id,
      role_name: 'Junior Sales Executive',
      permissions: {
        leads: { view: true, add: true, edit: true, delete: false },
        sales: { view: true, add: true, edit: true, delete: false },
        purchase: { view: false, add: false, edit: false, delete: false },
        job_work: { view: false, add: false, edit: false, delete: false },
        inventory: { view: true, add: false, edit: false, delete: false },
        finance: { view: false, add: false, edit: false, delete: false },
        team: { view: false, add: false, edit: false, delete: false },
      },
      monthly_targets: { leads_target: 20, revenue_target: 300000, followups_target: 45 },
      status: 'active',
      notes: 'Handles inbound WhatsApp & TradeIndia fabric/yarn inquiries.',
    });

    // 3. Junior Lead Specialist (Reports to Vikram)
    await TeamMember.create({
      member_code: 'TM-003',
      name: 'Rohan Dave',
      email: 'rohan.dave@danzason.com',
      phone: '9825100003',
      department: 'Sales & CRM',
      designation: 'Junior Lead Coordinator',
      level: 'junior',
      reports_to: vikram._id,
      role_name: 'Junior Sales Executive',
      permissions: {
        leads: { view: true, add: true, edit: true, delete: false },
        sales: { view: true, add: false, edit: false, delete: false },
        purchase: { view: false, add: false, edit: false, delete: false },
        job_work: { view: false, add: false, edit: false, delete: false },
        inventory: { view: true, add: false, edit: false, delete: false },
        finance: { view: false, add: false, edit: false, delete: false },
        team: { view: false, add: false, edit: false, delete: false },
      },
      monthly_targets: { leads_target: 25, revenue_target: 200000, followups_target: 50 },
      status: 'active',
      notes: 'Follows up on online inquiries, coordinates discovery calls.',
    });

    // 4. Senior Procurement & Job Work Manager
    const amit = await TeamMember.create({
      member_code: 'TM-004',
      name: 'Amit Trivedi',
      email: 'amit.trivedi@danzason.com',
      phone: '9825100004',
      department: 'Procurement & Purchase',
      designation: 'Senior Purchase & Job Work Manager',
      level: 'senior',
      reports_to: null,
      role_name: 'Procurement / Purchase Manager',
      permissions: {
        leads: { view: false, add: false, edit: false, delete: false },
        sales: { view: false, add: false, edit: false, delete: false },
        purchase: { view: true, add: true, edit: true, delete: true },
        job_work: { view: true, add: true, edit: true, delete: true },
        inventory: { view: true, add: true, edit: true, delete: true },
        finance: { view: true, add: false, edit: false, delete: false },
        team: { view: true, add: true, edit: true, delete: false },
      },
      monthly_targets: { leads_target: 10, revenue_target: 500000, followups_target: 30 },
      status: 'active',
      notes: 'Oversees contractor production orders, supplier negotiations, and fabric procurement.',
    });

    // 5. Junior Purchase Officer (Reports to Amit)
    await TeamMember.create({
      member_code: 'TM-005',
      name: 'Kiran Verma',
      email: 'kiran.verma@danzason.com',
      phone: '9825100005',
      department: 'Procurement & Purchase',
      designation: 'Junior Purchase Officer',
      level: 'junior',
      reports_to: amit._id,
      role_name: 'Junior Purchase Executive',
      permissions: {
        leads: { view: false, add: false, edit: false, delete: false },
        sales: { view: false, add: false, edit: false, delete: false },
        purchase: { view: true, add: true, edit: true, delete: false },
        job_work: { view: true, add: true, edit: true, delete: false },
        inventory: { view: true, add: true, edit: false, delete: false },
        finance: { view: false, add: false, edit: false, delete: false },
        team: { view: false, add: false, edit: false, delete: false },
      },
      monthly_targets: { leads_target: 10, revenue_target: 200000, followups_target: 25 },
      status: 'active',
      notes: 'Generates POs, follows up on GRN receipts and supplier delivery dates.',
    });

    // 6. Senior Finance Accountant
    await TeamMember.create({
      member_code: 'TM-006',
      name: 'Sanjay Joshi',
      email: 'sanjay.joshi@danzason.com',
      phone: '9825100006',
      department: 'Finance & Accounts',
      designation: 'Chief Financial Accountant',
      level: 'senior',
      reports_to: null,
      role_name: 'Finance & Accounts Head',
      permissions: {
        leads: { view: false, add: false, edit: false, delete: false },
        sales: { view: true, add: false, edit: false, delete: false },
        purchase: { view: true, add: false, edit: false, delete: false },
        job_work: { view: true, add: false, edit: false, delete: false },
        inventory: { view: true, add: false, edit: false, delete: false },
        finance: { view: true, add: true, edit: true, delete: true },
        team: { view: true, add: false, edit: false, delete: false },
      },
      monthly_targets: { leads_target: 5, revenue_target: 1000000, followups_target: 20 },
      status: 'active',
      notes: 'Audits ledger entries, settles payments, and manages tax statements.',
    });
  }

  console.log('✅ Initial ERP Data Seeding completed successfully!');
};

module.exports = seedAllData;
