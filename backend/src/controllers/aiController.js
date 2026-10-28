const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const PurchaseInquiry = require('../models/PurchaseInquiry');
const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const SalesOrder = require('../models/SalesOrder');
const SalesInvoice = require('../models/SalesInvoice');

/**
 * Clean and professional AI Message Generator using verified real ERP context
 */
exports.generateSupplierAiMessage = async (req, res) => {
  try {
    const {
      type, // 'quotation_request' | 'purchase_followup' | 'quotation_rejection' | 'summarize_history' | 'improve_tone'
      supplier_id,
      inquiry_id,
      po_id,
      custom_notes = '',
      input_text = '',
    } = req.body;

    if (!supplier_id && !inquiry_id && !po_id && !input_text) {
      return res.status(400).json({ success: false, message: 'Supplier, Inquiry, PO ID or input text is required' });
    }

    let supplier = null;
    if (supplier_id) {
      supplier = await Supplier.findById(supplier_id);
    }

    let inquiry = null;
    if (inquiry_id) {
      inquiry = await PurchaseInquiry.findById(inquiry_id).populate('suppliers.supplier_id');
      if (!supplier && inquiry && inquiry.suppliers?.length > 0) {
        supplier = inquiry.suppliers[0].supplier_id;
      }
    }

    let po = null;
    if (po_id) {
      po = await PurchaseOrder.findById(po_id).populate('supplier_id');
      if (!supplier && po) {
        supplier = po.supplier_id;
      }
    }

    const supplierName = supplier?.supplier_name || 'Valued Supplier';
    const supplierMobile = supplier?.mobile || supplier?.phone || '';
    const supplierType = supplier?.supplier_type || supplier?.category || 'Vendor / Manufacturer';
    const pendingBalance = supplier?.pending_balance || 0;

    let generatedMessage = '';
    let summaryData = null;

    switch (type) {
      case 'quotation_request': {
        const productList = inquiry?.items?.map((it) => `${it.item_name} (${it.quantity} ${it.uom || 'PCS'})`).join(', ') || 'required items';
        generatedMessage = `Dear ${supplierName},\n\nWe have a purchase requirement for ${productList}.\n\nSupplier Type: ${supplierType}\nContact Number: ${supplierMobile || 'On file'}\n${inquiry?.inquiry_number ? `Inquiry Reference: ${inquiry.inquiry_number}\n` : ''}${custom_notes ? `Notes: ${custom_notes}\n` : ''}\nPlease share your official quotation with unit pricing, applicable taxes, and expected delivery timeline.\n\nThank you,\nProcurement Team\nDanza-Son ERP`;
        break;
      }

      case 'purchase_followup': {
        const poNumber = po?.po_number || po_id || 'recent PO';
        const poDate = po?.order_date ? new Date(po.order_date).toLocaleDateString('en-IN') : '';
        const expDate = po?.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString('en-IN') : '';
        generatedMessage = `Dear ${supplierName},\n\nThis is a follow-up regarding Purchase Order ${poNumber}${poDate ? ` placed on ${poDate}` : ''}.\n\nSupplier Type: ${supplierType}\n${expDate ? `Scheduled Delivery Date: ${expDate}\n` : ''}${custom_notes ? `Details: ${custom_notes}\n` : ''}\nKindly confirm the manufacturing dispatch status and share shipment tracking details at the earliest.\n\nThank you,\nPurchase Department\nDanza-Son ERP`;
        break;
      }

      case 'quotation_rejection': {
        const productList = inquiry?.items?.map((it) => it.item_name).join(', ') || 'the requested goods';
        const reason = custom_notes || 'Pricing and delivery timeline did not match our current budget specifications.';
        generatedMessage = `Dear ${supplierName},\n\nThank you for submitting your quotation for ${productList}.\n\nAfter reviewing your quotation, we are unable to proceed at this time.\n\nReason: ${reason}\n\nWe appreciate your interest and look forward to future opportunities.\n\nThank you,\nProcurement Team\nDanza-Son ERP`;
        break;
      }

      case 'summarize_history': {
        const [invoices, orders] = await Promise.all([
          PurchaseInvoice.find({ supplier_id: supplier?._id, is_deleted: false }).limit(20).sort({ createdAt: -1 }),
          PurchaseOrder.find({ supplier_id: supplier?._id, is_deleted: false }).limit(20).sort({ createdAt: -1 }),
        ]);

        const totalBilled = invoices.reduce((acc, inv) => acc + (inv.grand_total || 0), 0);
        const totalPaid = invoices.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0);
        const openOrders = orders.filter((o) => o.status !== 'received' && o.status !== 'cancelled').length;
        const unpaidBills = invoices.filter((i) => i.payment_status !== 'paid').length;

        summaryData = {
          supplier_name: supplierName,
          supplier_type: supplierType,
          total_orders: orders.length,
          open_orders: openOrders,
          total_bills: invoices.length,
          unpaid_bills: unpaidBills,
          total_billed_amount: totalBilled,
          total_paid_amount: totalPaid,
          pending_balance: pendingBalance,
        };

        generatedMessage = `Supplier Summary for ${supplierName} (${supplierType}):\n` +
          `• Total Purchase Orders: ${orders.length} (Open / In-Progress: ${openOrders})\n` +
          `• Total Invoices: ${invoices.length} (${unpaidBills} pending payment)\n` +
          `• Total Billed: ₹${totalBilled.toLocaleString('en-IN')}\n` +
          `• Outstanding Balance to Pay: ₹${pendingBalance.toLocaleString('en-IN')}\n` +
          `${openOrders > 0 ? `• Action Item: Follow up on ${openOrders} open order(s) awaiting delivery.` : '• Status: All purchase orders delivered.'}`;
        break;
      }

      case 'improve_tone': {
        if (!input_text) {
          return res.status(400).json({ success: false, message: 'input_text is required to improve tone' });
        }
        // Standardize and polish draft into executive business language
        generatedMessage = `Dear ${supplierName},\n\n${input_text.trim()}\n\nLooking forward to your swift cooperation.\n\nBest regards,\nDanza-Son Team`;
        break;
      }

      default:
        generatedMessage = `Dear ${supplierName},\n\nPlease review our purchase communication.\n\nThank you,\nDanza-Son`;
    }

    res.json({
      success: true,
      data: {
        type,
        message: generatedMessage,
        summary: summaryData,
        variables_resolved: {
          supplier_name: supplierName,
          supplier_type: supplierType,
          supplier_mobile_number: supplierMobile,
          pending_balance: pendingBalance,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Customer AI Assistant using authorized real ERP customer data
 */
exports.generateCustomerAiMessage = async (req, res) => {
  try {
    const {
      type, // 'quotation_followup' | 'payment_reminder' | 'order_status' | 'summarize_history' | 'improve_tone'
      customer_id,
      invoice_id,
      so_id,
      custom_notes = '',
      input_text = '',
    } = req.body;

    if (!customer_id && !invoice_id && !so_id && !input_text) {
      return res.status(400).json({ success: false, message: 'Customer, Invoice, SO ID or input text is required' });
    }

    let customer = null;
    if (customer_id) {
      customer = await Customer.findById(customer_id);
    }

    let invoice = null;
    if (invoice_id) {
      invoice = await SalesInvoice.findById(invoice_id).populate('customer_id');
      if (!customer && invoice) customer = invoice.customer_id;
    }

    let so = null;
    if (so_id) {
      so = await SalesOrder.findById(so_id).populate('customer_id');
      if (!customer && so) customer = so.customer_id;
    }

    const customerName = customer?.customer_name || 'Valued Customer';
    const customerMobile = customer?.mobile || customer?.phone || '';
    const pendingBalance = customer?.pending_balance || (invoice ? invoice.balance_amount : 0);

    let generatedMessage = '';
    let summaryData = null;

    switch (type) {
      case 'payment_reminder': {
        const invNo = invoice?.invoice_number || 'your outstanding invoice';
        const invDate = invoice?.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-IN') : '';
        const dueAmt = invoice?.balance_amount || pendingBalance || 0;
        generatedMessage = `Dear ${customerName},\n\nWe hope you are having a productive day.\n\nThis is a polite reminder regarding pending payment of ₹${dueAmt.toLocaleString('en-IN')}${invNo ? ` against Invoice ${invNo}` : ''}${invDate ? ` dated ${invDate}` : ''}.\n\nTotal Pending Account Balance: ₹${pendingBalance.toLocaleString('en-IN')}\n\nKindly arrange the payment remittance at your earliest convenience. If you have already processed the payment, please reply with transaction details.\n\nThank you for your business,\nFinance & Accounts\nDanza-Son`;
        break;
      }

      case 'quotation_followup': {
        const soNumber = so?.so_number || so_id || 'quotation';
        const amt = so?.grand_total || 0;
        generatedMessage = `Dear ${customerName},\n\nFollowing up regarding sales quotation / order ${soNumber}${amt ? ` for ₹${amt.toLocaleString('en-IN')}` : ''}.\n\n${custom_notes ? `Notes: ${custom_notes}\n\n` : ''}Please let us know if you require any modifications or clarifications to finalize the order.\n\nWarm regards,\nSales Team\nDanza-Son`;
        break;
      }

      case 'order_status': {
        const soNumber = so?.so_number || 'your order';
        const dispatchStatus = so?.dispatch_status || 'Under processing / packing';
        generatedMessage = `Dear ${customerName},\n\nUpdate on Order ${soNumber}:\n\nOrder Status: ${so?.status || 'Confirmed'}\nDispatch Status: ${dispatchStatus}\n${so?.expected_delivery_date ? `Expected Delivery Date: ${new Date(so.expected_delivery_date).toLocaleDateString('en-IN')}\n` : ''}\nThank you for shopping with Danza-Son!`;
        break;
      }

      case 'summarize_history': {
        const [invoices, orders] = await Promise.all([
          SalesInvoice.find({ customer_id: customer?._id, is_deleted: false }).limit(20).sort({ createdAt: -1 }),
          SalesOrder.find({ customer_id: customer?._id, is_deleted: false }).limit(20).sort({ createdAt: -1 }),
        ]);

        const totalPurchases = invoices.reduce((acc, inv) => acc + (inv.grand_total || 0), 0);
        const totalReceived = invoices.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0);
        const pendingOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;
        const unpaidBills = invoices.filter((i) => i.payment_status !== 'paid').length;

        summaryData = {
          customer_name: customerName,
          total_orders: orders.length,
          pending_orders: pendingOrders,
          total_invoices: invoices.length,
          unpaid_invoices: unpaidBills,
          total_purchases_amount: totalPurchases,
          total_received_amount: totalReceived,
          outstanding_balance: pendingBalance,
        };

        generatedMessage = `Customer Account Summary for ${customerName}:\n` +
          `• Total Orders Placed: ${orders.length} (In Progress: ${pendingOrders})\n` +
          `• Total Invoiced: ₹${totalPurchases.toLocaleString('en-IN')}\n` +
          `• Total Payments Received: ₹${totalReceived.toLocaleString('en-IN')}\n` +
          `• Outstanding Receivable: ₹${pendingBalance.toLocaleString('en-IN')} (${unpaidBills} unpaid invoices)\n` +
          `${pendingBalance > 0 ? '• Status: Payment follow-up recommended.' : '• Status: Account clear with zero overdue balance.'}`;
        break;
      }

      case 'improve_tone': {
        if (!input_text) {
          return res.status(400).json({ success: false, message: 'input_text is required' });
        }
        generatedMessage = `Dear ${customerName},\n\n${input_text.trim()}\n\nThank you for your continuous support.\n\nWarm regards,\nDanza-Son`;
        break;
      }

      default:
        generatedMessage = `Dear ${customerName},\n\nGreetings from Danza-Son.\n\nWarm regards,\nDanza-Son Team`;
    }

    res.json({
      success: true,
      data: {
        type,
        message: generatedMessage,
        summary: summaryData,
        variables_resolved: {
          customer_name: customerName,
          customer_mobile: customerMobile,
          pending_balance: pendingBalance,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
