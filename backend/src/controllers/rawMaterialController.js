const mongoose = require('mongoose');
const RawMaterial = require('../models/RawMaterial');
const RawMaterialMovement = require('../models/RawMaterialMovement');
const PurchaseOrder = require('../models/PurchaseOrder');
const Warehouse = require('../models/Warehouse');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const { getNextSequence } = require('../models/Counter');

// Helper to generate transaction number
const generateTxnNumber = async (prefix = 'TXN-RM') => {
  const seq = await getNextSequence('raw_material_txn', 'RawMaterialMovement', 'transaction_number');
  return `${prefix}-${String(seq).padStart(5, '0')}`;
};

// 1. GET /api/v1/raw-materials
exports.getRawMaterials = async (req, res) => {
  try {
    const { search, category, warehouse_id, status } = req.query;
    const query = { is_deleted: false };

    if (status) query.status = status;
    if (category && category !== 'all') query.category = category;
    if (search) {
      query.$or = [
        { material_name: { $regex: search, $options: 'i' } },
        { material_code: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const materials = await RawMaterial.find(query)
      .populate('default_supplier_id', 'supplier_name supplier_code')
      .populate('warehouse_id', 'warehouse_name warehouse_code')
      .sort({ createdAt: -1 });

    // Filter by warehouse if specified
    let filtered = materials;
    if (warehouse_id && warehouse_id !== 'all') {
      filtered = materials.filter((m) =>
        (m.warehouse_balances || []).some(
          (wb) => wb.warehouse_id?.toString() === warehouse_id && wb.current_stock > 0
        )
      );
    }

    // Compute overview stats
    let totalMaterials = materials.length;
    let totalWarehouseStock = 0;
    let totalSupplierStock = 0;
    let totalInTransitStock = 0;
    let totalCompanyStock = 0;

    materials.forEach((m) => {
      totalWarehouseStock += Number(m.warehouse_stock || 0);
      totalSupplierStock += Number(m.supplier_stock || 0);
      totalInTransitStock += Number(m.in_transit_stock || 0);
      totalCompanyStock += Number(m.total_stock || 0);
    });

    res.json({
      success: true,
      message: 'Raw materials fetched successfully',
      data: filtered,
      stats: {
        totalMaterials,
        totalWarehouseStock,
        totalSupplierStock,
        totalInTransitStock,
        totalCompanyStock,
      },
    });
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. GET /api/v1/raw-materials/:id
exports.getRawMaterialById = async (req, res) => {
  try {
    const material = await RawMaterial.findOne({ _id: req.params.id, is_deleted: false })
      .populate('default_supplier_id')
      .populate('warehouse_id');

    if (!material) {
      return res.status(404).json({ success: false, message: 'Raw material not found' });
    }

    res.json({ success: true, data: material });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. POST /api/v1/raw-materials
exports.createRawMaterial = async (req, res) => {
  try {
    const {
      material_code,
      material_name,
      category,
      subcategory,
      description,
      uom,
      purchase_unit,
      stock_unit,
      conversion_factor,
      default_supplier_id,
      purchase_rate,
      cost_rate,
      min_stock_level,
      reorder_level,
      opening_stock,
      warehouse_id,
      hsn_code,
      gst_rate,
      notes,
    } = req.body;

    if (!material_name || !material_name.trim()) {
      return res.status(400).json({ success: false, message: 'Material name is required' });
    }

    // Check duplicate code
    if (material_code) {
      const existing = await RawMaterial.findOne({ material_code: material_code.trim().toUpperCase(), is_deleted: false });
      if (existing) {
        return res.status(400).json({ success: false, message: `Raw material code '${material_code}' already exists` });
      }
    }

    const openStockNum = Number(opening_stock) || 0;
    const rateNum = Number(purchase_rate) || 0;
    const openValue = openStockNum * rateNum;

    const rawMaterial = new RawMaterial({
      material_code: material_code ? material_code.trim().toUpperCase() : undefined,
      material_name: material_name.trim(),
      category: category || 'Fabric',
      subcategory: subcategory || '',
      description: description || '',
      uom: uom || 'KG',
      purchase_unit: purchase_unit || uom || 'KG',
      stock_unit: stock_unit || uom || 'KG',
      conversion_factor: Number(conversion_factor) || 1,
      default_supplier_id: default_supplier_id || null,
      purchase_rate: rateNum,
      cost_rate: Number(cost_rate) || rateNum,
      min_stock_level: Number(min_stock_level) || 5,
      reorder_level: Number(reorder_level) || 10,
      opening_stock: openStockNum,
      opening_stock_value: openValue,
      warehouse_id: warehouse_id || null,
      warehouse_stock: openStockNum,
      supplier_stock: 0,
      in_transit_stock: 0,
      total_stock: openStockNum,
      hsn_code: hsn_code || '5208',
      gst_rate: Number(gst_rate) || 5,
      notes: notes || '',
    });

    // If opening stock > 0, assign to warehouse
    let warehouseName = 'Main Warehouse';
    if (warehouse_id) {
      const wh = await Warehouse.findById(warehouse_id);
      if (wh) warehouseName = wh.warehouse_name;
      rawMaterial.warehouse_balances = [
        {
          warehouse_id,
          warehouse_name: warehouseName,
          current_stock: openStockNum,
        },
      ];
    } else {
      // Find default warehouse
      const defaultWh = await Warehouse.findOne({ is_deleted: false, is_default: true }) ||
                        await Warehouse.findOne({ is_deleted: false });
      if (defaultWh) {
        rawMaterial.warehouse_id = defaultWh._id;
        warehouseName = defaultWh.warehouse_name;
        rawMaterial.warehouse_balances = [
          {
            warehouse_id: defaultWh._id,
            warehouse_name: defaultWh.warehouse_name,
            current_stock: openStockNum,
          },
        ];
      }
    }

    await rawMaterial.save();

    // Create Initial Opening Stock Movement if > 0
    if (openStockNum > 0) {
      const txnNumber = await generateTxnNumber('TXN-OPEN');
      await RawMaterialMovement.create({
        transaction_number: txnNumber,
        transaction_type: 'Opening Stock',
        reference_no: 'INIT-OPENING',
        reference_type: 'Initial Stock Audit',
        raw_material_id: rawMaterial._id,
        material_code: rawMaterial.material_code,
        material_name: rawMaterial.material_name,
        warehouse_id: rawMaterial.warehouse_id,
        warehouse_name: warehouseName,
        source_location: 'Opening Stock Audit',
        destination_location: warehouseName,
        qty_in: openStockNum,
        qty_out: 0,
        uom: rawMaterial.uom,
        warehouse_balance: openStockNum,
        supplier_balance: 0,
        in_transit_balance: 0,
        total_company_balance: openStockNum,
        remarks: 'Initial stock entered into inventory',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Raw material created successfully',
      data: rawMaterial,
    });
  } catch (error) {
    console.error('Error creating raw material:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// 4. PUT /api/v1/raw-materials/:id
exports.updateRawMaterial = async (req, res) => {
  try {
    const material = await RawMaterial.findOne({ _id: req.params.id, is_deleted: false });
    if (!material) {
      return res.status(404).json({ success: false, message: 'Raw material not found' });
    }

    const {
      material_name,
      category,
      subcategory,
      description,
      uom,
      purchase_unit,
      stock_unit,
      conversion_factor,
      default_supplier_id,
      purchase_rate,
      cost_rate,
      min_stock_level,
      reorder_level,
      hsn_code,
      gst_rate,
      status,
      notes,
    } = req.body;

    if (material_name) material.material_name = material_name.trim();
    if (category) material.category = category;
    if (subcategory !== undefined) material.subcategory = subcategory;
    if (description !== undefined) material.description = description;
    if (uom) material.uom = uom.toUpperCase();
    if (purchase_unit) material.purchase_unit = purchase_unit.toUpperCase();
    if (stock_unit) material.stock_unit = stock_unit.toUpperCase();
    if (conversion_factor) material.conversion_factor = Number(conversion_factor);
    if (default_supplier_id !== undefined) material.default_supplier_id = default_supplier_id || null;
    if (purchase_rate !== undefined) material.purchase_rate = Number(purchase_rate);
    if (cost_rate !== undefined) material.cost_rate = Number(cost_rate);
    if (min_stock_level !== undefined) material.min_stock_level = Number(min_stock_level);
    if (reorder_level !== undefined) material.reorder_level = Number(reorder_level);
    if (hsn_code !== undefined) material.hsn_code = hsn_code;
    if (gst_rate !== undefined) material.gst_rate = Number(gst_rate);
    if (status) material.status = status;
    if (notes !== undefined) material.notes = notes;

    await material.save();

    res.json({
      success: true,
      message: 'Raw material updated successfully',
      data: material,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 5. DELETE /api/v1/raw-materials/:id
exports.deleteRawMaterial = async (req, res) => {
  try {
    const material = await RawMaterial.findOne({ _id: req.params.id, is_deleted: false });
    if (!material) {
      return res.status(404).json({ success: false, message: 'Raw material not found' });
    }

    if (material.total_stock > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete raw material with active stock balance (${material.total_stock} ${material.uom}). Please adjust stock to 0 first.`,
      });
    }

    material.is_deleted = true;
    await material.save();

    res.json({ success: true, message: 'Raw material deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. GET /api/v1/raw-materials/:id/ledger (Warehouse-wise, Supplier-wise, Complete Auditable Ledger)
exports.getRawMaterialLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const { warehouse_id, supplier_id, transaction_type, start_date, end_date, search } = req.query;

    const material = await RawMaterial.findOne({ _id: id, is_deleted: false })
      .populate('default_supplier_id')
      .populate('warehouse_id');

    if (!material) {
      return res.status(404).json({ success: false, message: 'Raw material not found' });
    }

    // Fetch all active warehouses for warehouse tabs
    const warehouses = await Warehouse.find({ is_deleted: false }).sort({ warehouse_name: 1 });

    // Fetch suppliers who hold or are linked to this material
    const suppliers = await Supplier.find({ is_deleted: false }).sort({ supplier_name: 1 });

    // Build filter query for RawMaterialMovement
    const movementQuery = { raw_material_id: id };

    if (warehouse_id && warehouse_id !== 'all') {
      movementQuery.warehouse_id = warehouse_id;
    }
    if (supplier_id && supplier_id !== 'all') {
      movementQuery.supplier_id = supplier_id;
    }
    if (transaction_type && transaction_type !== 'all') {
      movementQuery.transaction_type = transaction_type;
    }
    if (start_date || end_date) {
      movementQuery.date = {};
      if (start_date) movementQuery.date.$gte = new Date(start_date);
      if (end_date) movementQuery.date.$lte = new Date(new Date(end_date).setHours(23, 59, 59, 999));
    }
    if (search) {
      movementQuery.$or = [
        { transaction_number: { $regex: search, $options: 'i' } },
        { reference_no: { $regex: search, $options: 'i' } },
        { po_number: { $regex: search, $options: 'i' } },
        { remarks: { $regex: search, $options: 'i' } },
      ];
    }

    const movements = await RawMaterialMovement.find(movementQuery)
      .populate('warehouse_id', 'warehouse_name warehouse_code')
      .populate('supplier_id', 'supplier_name supplier_code')
      .populate('manufacturing_po_id', 'po_number status')
      .sort({ date: -1, createdAt: -1 });

    // Calculate warehouse balances map
    const warehouseStockMap = {};
    (material.warehouse_balances || []).forEach((wb) => {
      warehouseStockMap[wb.warehouse_id.toString()] = wb.current_stock || 0;
    });

    // Calculate supplier balances map
    const supplierStockMap = {};
    (material.supplier_balances || []).forEach((sb) => {
      supplierStockMap[sb.supplier_id.toString()] = {
        current_stock: sb.current_stock || 0,
        consumed_stock: sb.consumed_stock || 0,
        pending_return_stock: sb.pending_return_stock || 0,
      };
    });

    // Summary calculation
    let currentWhStock = material.warehouse_stock || 0;
    if (warehouse_id && warehouse_id !== 'all') {
      currentWhStock = warehouseStockMap[warehouse_id] || 0;
    }

    let currentSuppStock = material.supplier_stock || 0;
    if (supplier_id && supplier_id !== 'all') {
      currentSuppStock = supplierStockMap[supplier_id]?.current_stock || 0;
    }

    const summary = {
      warehouse_stock: currentWhStock,
      supplier_stock: currentSuppStock,
      in_transit_stock: material.in_transit_stock || 0,
      total_company_balance: material.total_stock || 0,
      total_consumed: (material.supplier_balances || []).reduce((acc, sb) => acc + (sb.consumed_stock || 0), 0),
      uom: material.uom,
      warehouse_balances: warehouses.map((w) => ({
        warehouse_id: w._id,
        warehouse_name: w.warehouse_name,
        warehouse_code: w.warehouse_code,
        current_stock: warehouseStockMap[w._id.toString()] || 0,
      })),
      supplier_balances: suppliers.map((s) => ({
        supplier_id: s._id,
        supplier_name: s.supplier_name,
        supplier_code: s.supplier_code,
        current_stock: supplierStockMap[s._id.toString()]?.current_stock || 0,
        consumed_stock: supplierStockMap[s._id.toString()]?.consumed_stock || 0,
        pending_return_stock: supplierStockMap[s._id.toString()]?.pending_return_stock || 0,
      })).filter((s) => s.current_stock > 0 || s.consumed_stock > 0),
    };

    res.json({
      success: true,
      message: 'Raw material ledger fetched successfully',
      raw_material: material,
      warehouses,
      summary,
      entries: movements,
    });
  } catch (error) {
    console.error('Error fetching raw material ledger:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. GET /api/v1/raw-materials/suppliers/balances (Consolidated Supplier Materials View)
exports.getSupplierMaterialBalances = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ is_deleted: false })
      .select('supplier_name supplier_code supplier_type supplier_classification contact_person mobile')
      .sort({ supplier_name: 1 });

    const rawMaterials = await RawMaterial.find({ is_deleted: false });

    const supplierData = [];

    suppliers.forEach((sup) => {
      const supIdStr = sup._id.toString();
      const heldMaterials = [];

      rawMaterials.forEach((rm) => {
        const bal = (rm.supplier_balances || []).find((sb) => sb.supplier_id?.toString() === supIdStr);
        if (bal && (bal.current_stock > 0 || bal.consumed_stock > 0 || bal.pending_return_stock > 0)) {
          heldMaterials.push({
            raw_material_id: rm._id,
            material_code: rm.material_code,
            material_name: rm.material_name,
            uom: rm.uom,
            current_stock: bal.current_stock || 0,
            consumed_stock: bal.consumed_stock || 0,
            pending_return_stock: bal.pending_return_stock || 0,
          });
        }
      });

      if (heldMaterials.length > 0 || sup.supplier_classification === 'manufacturing') {
        supplierData.push({
          supplier: sup,
          materials: heldMaterials,
          total_materials_count: heldMaterials.length,
          total_stock_held: heldMaterials.reduce((acc, m) => acc + m.current_stock, 0),
        });
      }
    });

    res.json({
      success: true,
      message: 'Supplier material balances fetched successfully',
      data: supplierData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 8. MANUFACTURING WORKFLOW ACTIONS
// ==========================================

// Action A: ISSUE RAW MATERIAL (Warehouse -> Manufacturing Supplier)
exports.issueRawMaterial = async (req, res) => {
  try {
    const { po_id, warehouse_id, items, remarks, created_by } = req.body;

    if (!po_id || !warehouse_id || !items || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'Purchase Order ID, Warehouse ID, and items are required',
      });
    }

    const po = await PurchaseOrder.findById(po_id).populate('supplier_id').populate('warehouse_id');
    if (!po) {
      return res.status(404).json({ success: false, message: 'Manufacturing Purchase Order not found' });
    }

    const warehouse = await Warehouse.findById(warehouse_id);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Dispatch Warehouse not found' });
    }

    const supplierId = po.supplier_id._id;
    const supplierName = po.supplier_id.supplier_name;
    const issueNumber = `ISSUE-${Date.now().toString().slice(-6)}`;
    const processedItems = [];

    // Atomic stock check and deduction for each material
    for (const it of items) {
      const rmId = it.raw_material_id;
      const issueQty = Number(it.qty);
      if (!issueQty || issueQty <= 0) continue;

      const rm = await RawMaterial.findById(rmId);
      if (!rm) {
        return res.status(404).json({ success: false, message: `Raw material ID ${rmId} not found` });
      }

      // Find warehouse balance
      let whBal = (rm.warehouse_balances || []).find(
        (b) => b.warehouse_id.toString() === warehouse_id.toString()
      );
      const availableInWh = whBal ? whBal.current_stock : 0;

      if (availableInWh < issueQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${rm.material_name} (${rm.material_code}) in ${warehouse.warehouse_name}! Available: ${availableInWh} ${rm.uom}, Requested to issue: ${issueQty} ${rm.uom}.`,
        });
      }

      // Deduct from warehouse balance & warehouse_stock
      whBal.current_stock -= issueQty;
      rm.warehouse_stock = Math.max(0, (rm.warehouse_stock || 0) - issueQty);

      // Add to supplier balance & supplier_stock
      let supBal = (rm.supplier_balances || []).find(
        (s) => s.supplier_id.toString() === supplierId.toString()
      );
      if (!supBal) {
        supBal = {
          supplier_id: supplierId,
          supplier_name: supplierName,
          current_stock: 0,
          consumed_stock: 0,
          pending_return_stock: 0,
        };
        rm.supplier_balances.push(supBal);
      }
      supBal.current_stock += issueQty;
      rm.supplier_stock = (rm.supplier_stock || 0) + issueQty;

      // Update total company stock
      rm.total_stock = rm.warehouse_stock + rm.supplier_stock + (rm.in_transit_stock || 0);
      await rm.save();

      // Update PO raw_materials_required tracking
      let poReqItem = (po.raw_materials_required || []).find(
        (r) => r.raw_material_id.toString() === rmId.toString()
      );
      if (poReqItem) {
        poReqItem.issued_qty = (poReqItem.issued_qty || 0) + issueQty;
        poReqItem.pending_at_supplier_qty = Math.max(
          0,
          poReqItem.issued_qty - (poReqItem.consumed_qty || 0) - (poReqItem.returned_qty || 0)
        );
      }

      // Create Auditable Movement
      const txnNumber = await generateTxnNumber('TXN-ISSUE');
      await RawMaterialMovement.create({
        transaction_number: txnNumber,
        transaction_type: 'Manufacturing Issue',
        reference_no: issueNumber,
        reference_type: 'Manufacturing Material Issue',
        raw_material_id: rm._id,
        material_code: rm.material_code,
        material_name: rm.material_name,
        supplier_id: supplierId,
        supplier_name: supplierName,
        manufacturing_po_id: po._id,
        po_number: po.po_number,
        warehouse_id: warehouse._id,
        warehouse_name: warehouse.warehouse_name,
        source_location: warehouse.warehouse_name,
        destination_location: supplierName,
        qty_in: 0,
        qty_out: issueQty,
        uom: rm.uom,
        warehouse_balance: whBal.current_stock,
        supplier_balance: supBal.current_stock,
        in_transit_balance: rm.in_transit_stock || 0,
        total_company_balance: rm.total_stock,
        created_by: created_by || 'Admin User',
        remarks: remarks || `Issued ${issueQty} ${rm.uom} to ${supplierName} for PO ${po.po_number}`,
      });

      processedItems.push({
        raw_material_id: rm._id,
        material_name: rm.material_name,
        qty: issueQty,
        uom: rm.uom,
      });
    }

    // Save issue record in PO
    po.material_issues.push({
      issue_number: issueNumber,
      date: new Date(),
      warehouse_id: warehouse._id,
      warehouse_name: warehouse.warehouse_name,
      items: processedItems,
      remarks: remarks || '',
      created_by: created_by || 'Admin User',
    });

    await po.save();

    res.json({
      success: true,
      message: `Raw material issued successfully against ${po.po_number}! Warehouse stock reduced and supplier balance updated.`,
      data: {
        issue_number: issueNumber,
        po,
      },
    });
  } catch (error) {
    console.error('Error issuing raw material:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Action B: RECORD PRODUCTION CONSUMPTION (Supplier Floor)
exports.recordConsumption = async (req, res) => {
  try {
    const { po_id, completed_finished_qty, items, remarks, created_by } = req.body;

    if (!po_id || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'Purchase Order ID and consumed items are required' });
    }

    const po = await PurchaseOrder.findById(po_id).populate('supplier_id');
    if (!po) {
      return res.status(404).json({ success: false, message: 'Manufacturing Purchase Order not found' });
    }

    const supplierId = po.supplier_id._id;
    const supplierName = po.supplier_id.supplier_name;
    const consumptionNumber = `CONS-${Date.now().toString().slice(-6)}`;
    const processedItems = [];

    // Process each consumed material
    for (const it of items) {
      const rmId = it.raw_material_id;
      const consumedQty = Number(it.consumed_qty);
      if (!consumedQty || consumedQty <= 0) continue;

      const rm = await RawMaterial.findById(rmId);
      if (!rm) continue;

      let supBal = (rm.supplier_balances || []).find(
        (s) => s.supplier_id.toString() === supplierId.toString()
      );
      const heldBySupplier = supBal ? supBal.current_stock : 0;

      if (heldBySupplier < consumedQty) {
        // If auto_issue is not explicitly disabled (default: smooth auto-dispatch)
        if (req.body.auto_issue !== false) {
          const shortfall = consumedQty - heldBySupplier;
          let warehouse = null;
          if (po.warehouse_id) {
            warehouse = await Warehouse.findById(po.warehouse_id);
          }
          if (!warehouse) {
            warehouse = await Warehouse.findOne({ is_active: { $ne: false } });
          }
          const whId = warehouse ? warehouse._id : (po.warehouse_id || new mongoose.Types.ObjectId());
          const whName = warehouse ? warehouse.warehouse_name : 'Main Warehouse';

          let whBal = (rm.warehouse_balances || []).find(
            (w) => w.warehouse_id && w.warehouse_id.toString() === whId.toString()
          );
          if (!whBal) {
            whBal = { warehouse_id: whId, warehouse_name: whName, current_stock: rm.warehouse_stock || 0 };
            rm.warehouse_balances.push(whBal);
          }
          whBal.current_stock = Math.max(0, (whBal.current_stock || 0) - shortfall);
          rm.warehouse_stock = Math.max(0, (rm.warehouse_stock || 0) - shortfall);

          if (!supBal) {
            supBal = {
              supplier_id: supplierId,
              supplier_name: supplierName,
              current_stock: 0,
              consumed_stock: 0,
              returned_stock: 0,
            };
            rm.supplier_balances.push(supBal);
          }
          supBal.current_stock += shortfall;
          rm.supplier_stock = (rm.supplier_stock || 0) + shortfall;
          rm.total_stock = rm.warehouse_stock + rm.supplier_stock + (rm.in_transit_stock || 0);

          // Record auto-issue movement
          const autoIssTxn = await generateTxnNumber('TXN-ISS');
          await RawMaterialMovement.create({
            transaction_number: autoIssTxn,
            transaction_type: 'Manufacturing Issue',
            reference_no: `AUTO-ISS-${Date.now().toString().slice(-6)}`,
            reference_type: 'Manufacturing Order Auto-Dispatch',
            raw_material_id: rm._id,
            material_code: rm.material_code,
            material_name: rm.material_name,
            supplier_id: supplierId,
            supplier_name: supplierName,
            manufacturing_po_id: po._id,
            po_number: po.po_number,
            warehouse_id: whId,
            warehouse_name: whName,
            source_location: whName,
            destination_location: supplierName,
            qty_in: 0,
            qty_out: shortfall,
            uom: rm.uom,
            warehouse_balance: whBal.current_stock,
            supplier_balance: supBal.current_stock,
            in_transit_balance: rm.in_transit_stock || 0,
            total_company_balance: rm.total_stock,
            created_by: created_by || 'Admin User',
            remarks: `Auto-issued ${shortfall} ${rm.uom} to ${supplierName} for PO ${po.po_number}`,
          });

          // Add to PO material issues
          po.material_issues.push({
            issue_number: `ISS-AUTO-${Date.now().toString().slice(-4)}`,
            date: new Date(),
            warehouse_id: whId,
            warehouse_name: whName,
            items: [{
              raw_material_id: rm._id,
              material_name: rm.material_name,
              qty: shortfall,
              uom: rm.uom,
            }],
            remarks: 'Auto-dispatched from warehouse for production',
            created_by: created_by || 'Admin User',
          });

          let poReq = (po.raw_materials_required || []).find(
            (r) => r.raw_material_id.toString() === rmId.toString()
          );
          if (poReq) {
            poReq.issued_qty = (poReq.issued_qty || 0) + shortfall;
          }
        } else {
          return res.status(400).json({
            success: false,
            message: `Cannot consume ${consumedQty} ${rm.uom} of ${rm.material_name}! ${supplierName} currently only holds ${heldBySupplier} ${rm.uom}.`,
          });
        }
      }

      // Deduct from supplier balance
      supBal.current_stock -= consumedQty;
      supBal.consumed_stock = (supBal.consumed_stock || 0) + consumedQty;
      rm.supplier_stock = Math.max(0, (rm.supplier_stock || 0) - consumedQty);
      rm.total_stock = rm.warehouse_stock + rm.supplier_stock + (rm.in_transit_stock || 0);
      await rm.save();

      // Update PO raw_materials_required tracking
      let poReqItem = (po.raw_materials_required || []).find(
        (r) => r.raw_material_id.toString() === rmId.toString()
      );
      if (poReqItem) {
        poReqItem.consumed_qty = (poReqItem.consumed_qty || 0) + consumedQty;
        poReqItem.unused_qty = Math.max(
          0,
          (poReqItem.issued_qty || 0) - poReqItem.consumed_qty - (poReqItem.returned_qty || 0)
        );
        poReqItem.pending_at_supplier_qty = poReqItem.unused_qty;
      }

      // Create Auditable Movement
      const txnNumber = await generateTxnNumber('TXN-CONS');
      await RawMaterialMovement.create({
        transaction_number: txnNumber,
        transaction_type: 'Production Consumption',
        reference_no: consumptionNumber,
        reference_type: 'Manufacturing Production Consumption',
        raw_material_id: rm._id,
        material_code: rm.material_code,
        material_name: rm.material_name,
        supplier_id: supplierId,
        supplier_name: supplierName,
        manufacturing_po_id: po._id,
        po_number: po.po_number,
        source_location: supplierName,
        destination_location: 'Production Consumption',
        qty_in: 0,
        qty_out: consumedQty,
        consumed_qty: consumedQty,
        uom: rm.uom,
        warehouse_balance: rm.warehouse_stock,
        supplier_balance: supBal.current_stock,
        in_transit_balance: rm.in_transit_stock || 0,
        total_company_balance: rm.total_stock,
        created_by: created_by || 'Admin User',
        remarks: remarks || `Production consumption of ${consumedQty} ${rm.uom} by ${supplierName} for PO ${po.po_number}`,
      });

      processedItems.push({
        raw_material_id: rm._id,
        material_name: rm.material_name,
        consumed_qty: consumedQty,
        uom: rm.uom,
      });
    }

    // Update PO completed quantity
    if (completed_finished_qty) {
      po.completed_qty = (po.completed_qty || 0) + Number(completed_finished_qty);
    }

    po.production_consumptions.push({
      consumption_number: consumptionNumber,
      date: new Date(),
      completed_finished_qty: Number(completed_finished_qty) || 0,
      items: processedItems,
      remarks: remarks || '',
      created_by: created_by || 'Admin User',
    });

    await po.save();

    res.json({
      success: true,
      message: `Production consumption recorded successfully! Supplier balance reduced and unused raw material updated.`,
      data: {
        consumption_number: consumptionNumber,
        po,
      },
    });
  } catch (error) {
    console.error('Error recording consumption:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Action C: RECEIVE FINISHED GOODS (Physical Arrival into Warehouse)
exports.receiveFinishedGoods = async (req, res) => {
  try {
    const { po_id, warehouse_id, received_qty, rejected_qty, remarks, created_by } = req.body;

    if (!po_id || !warehouse_id || !received_qty || Number(received_qty) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'PO ID, Warehouse ID, and valid received quantity are required',
      });
    }

    const po = await PurchaseOrder.findById(po_id).populate('finished_product_id');
    if (!po) {
      return res.status(404).json({ success: false, message: 'Manufacturing Purchase Order not found' });
    }

    const warehouse = await Warehouse.findById(warehouse_id);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Receiving Warehouse not found' });
    }

    const qtyReceived = Number(received_qty);
    const qtyRejected = Number(rejected_qty) || 0;
    const receiptNumber = `FGR-${Date.now().toString().slice(-6)}`;

    // Increment finished product stock in product catalog
    if (po.finished_product_id) {
      const prod = await Product.findById(po.finished_product_id);
      if (prod) {
        prod.current_stock = (prod.current_stock || 0) + qtyReceived;
        await prod.save();
      }
    }

    po.received_qty = (po.received_qty || 0) + qtyReceived;
    po.finished_goods_receipts.push({
      receipt_number: receiptNumber,
      date: new Date(),
      warehouse_id: warehouse._id,
      warehouse_name: warehouse.warehouse_name,
      received_qty: qtyReceived,
      rejected_qty: qtyRejected,
      remarks: remarks || '',
      created_by: created_by || 'Admin User',
    });

    await po.save();

    res.json({
      success: true,
      message: `Successfully received ${qtyReceived} finished products into ${warehouse.warehouse_name}! Product stock increased.`,
      data: {
        receipt_number: receiptNumber,
        po,
      },
    });
  } catch (error) {
    console.error('Error receiving finished goods:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Action D: REQUEST UNUSED RAW MATERIAL RETURN
exports.requestMaterialReturn = async (req, res) => {
  try {
    const { po_id, raw_material_id, requested_qty, remarks, created_by } = req.body;

    if (!po_id || !raw_material_id || !requested_qty || Number(requested_qty) <= 0) {
      return res.status(400).json({ success: false, message: 'PO ID, Raw Material ID, and requested quantity are required' });
    }

    const po = await PurchaseOrder.findById(po_id).populate('supplier_id');
    if (!po) return res.status(404).json({ success: false, message: 'PO not found' });

    const rm = await RawMaterial.findById(raw_material_id);
    if (!rm) return res.status(404).json({ success: false, message: 'Raw material not found' });

    const reqQty = Number(requested_qty);
    const poReqItem = (po.raw_materials_required || []).find(
      (r) => r.raw_material_id.toString() === raw_material_id.toString()
    );

    const availableToReturn = poReqItem ? (poReqItem.pending_at_supplier_qty || poReqItem.unused_qty || 0) : 0;
    if (availableToReturn < reqQty) {
      return res.status(400).json({
        success: false,
        message: `Cannot request return of ${reqQty} ${rm.uom}! Unused balance at supplier is only ${availableToReturn} ${rm.uom}.`,
      });
    }

    const returnNumber = `RET-REQ-${Date.now().toString().slice(-6)}`;
    po.material_returns.push({
      return_number: returnNumber,
      date: new Date(),
      raw_material_id: rm._id,
      material_name: rm.material_name,
      requested_qty: reqQty,
      dispatched_qty: 0,
      received_qty: 0,
      uom: rm.uom,
      status: 'return_requested',
      remarks: remarks || 'Unused material return requested from supplier',
      created_by: created_by || 'Admin User',
    });

    await po.save();

    res.json({
      success: true,
      message: `Return request for ${reqQty} ${rm.uom} ${rm.material_name} submitted successfully! Status: Return Requested. (Stock remains with supplier until dispatched).`,
      data: { return_number: returnNumber, po },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Action E: DISPATCH UNUSED RAW MATERIAL RETURN (Supplier -> In Transit)
exports.dispatchMaterialReturn = async (req, res) => {
  try {
    const { po_id, return_id, dispatched_qty, remarks } = req.body;

    const po = await PurchaseOrder.findById(po_id).populate('supplier_id');
    if (!po) return res.status(404).json({ success: false, message: 'PO not found' });

    const ret = po.material_returns.id(return_id);
    if (!ret) return res.status(404).json({ success: false, message: 'Return record not found' });

    const rm = await RawMaterial.findById(ret.raw_material_id);
    if (!rm) return res.status(404).json({ success: false, message: 'Raw material not found' });

    const dispatchQty = Number(dispatched_qty) || ret.requested_qty;
    const supplierId = po.supplier_id._id;
    const supplierName = po.supplier_id.supplier_name;

    let supBal = (rm.supplier_balances || []).find((s) => s.supplier_id.toString() === supplierId.toString());
    const heldBySupplier = supBal ? supBal.current_stock : 0;

    if (heldBySupplier < dispatchQty) {
      return res.status(400).json({
        success: false,
        message: `Cannot dispatch ${dispatchQty} ${rm.uom}! Supplier currently holds only ${heldBySupplier} ${rm.uom}.`,
      });
    }

    // Deduct from supplier balance and add to in_transit_stock
    supBal.current_stock -= dispatchQty;
    rm.supplier_stock = Math.max(0, (rm.supplier_stock || 0) - dispatchQty);
    rm.in_transit_stock = (rm.in_transit_stock || 0) + dispatchQty;
    rm.total_stock = rm.warehouse_stock + rm.supplier_stock + rm.in_transit_stock;
    await rm.save();

    ret.status = 'in_transit';
    ret.dispatched_qty = dispatchQty;
    ret.dispatch_date = new Date();
    if (remarks) ret.remarks = remarks;

    await po.save();

    // Create Movement Record
    const txnNumber = await generateTxnNumber('TXN-DISP');
    await RawMaterialMovement.create({
      transaction_number: txnNumber,
      transaction_type: 'Material Return Dispatched',
      reference_no: ret.return_number,
      reference_type: 'Unused Raw Material Return Dispatch',
      raw_material_id: rm._id,
      material_code: rm.material_code,
      material_name: rm.material_name,
      supplier_id: supplierId,
      supplier_name: supplierName,
      manufacturing_po_id: po._id,
      po_number: po.po_number,
      source_location: supplierName,
      destination_location: 'In Transit',
      qty_in: 0,
      qty_out: dispatchQty,
      uom: rm.uom,
      warehouse_balance: rm.warehouse_stock,
      supplier_balance: supBal.current_stock,
      in_transit_balance: rm.in_transit_stock,
      total_company_balance: rm.total_stock,
      return_status: 'in_transit',
      remarks: remarks || `Dispatched ${dispatchQty} ${rm.uom} by ${supplierName}. Now in transit.`,
    });

    res.json({
      success: true,
      message: `Return dispatched! Material is now IN TRANSIT (${dispatchQty} ${rm.uom}). Supplier balance deducted.`,
      data: { po },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Action F: RECEIVE UNUSED RAW MATERIAL RETURN (In Transit -> Warehouse Physical Acceptance)
exports.receiveMaterialReturn = async (req, res) => {
  try {
    const { po_id, return_id, warehouse_id, accepted_received_qty, remarks, received_by } = req.body;

    const po = await PurchaseOrder.findById(po_id).populate('supplier_id');
    if (!po) return res.status(404).json({ success: false, message: 'PO not found' });

    const ret = po.material_returns.id(return_id);
    if (!ret) return res.status(404).json({ success: false, message: 'Return record not found' });

    const rm = await RawMaterial.findById(ret.raw_material_id);
    if (!rm) return res.status(404).json({ success: false, message: 'Raw material not found' });

    const warehouse = await Warehouse.findById(warehouse_id || po.warehouse_id);
    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });

    const receiveQty = Number(accepted_received_qty) || ret.dispatched_qty || ret.requested_qty;
    const supplierId = po.supplier_id._id;
    const supplierName = po.supplier_id.supplier_name;

    // Deduct from in_transit_stock (or supplier stock if direct receive without dispatch step)
    if (ret.status === 'in_transit') {
      rm.in_transit_stock = Math.max(0, (rm.in_transit_stock || 0) - receiveQty);
    } else {
      // Direct receipt from supplier
      let supBal = (rm.supplier_balances || []).find((s) => s.supplier_id.toString() === supplierId.toString());
      if (supBal) {
        supBal.current_stock = Math.max(0, supBal.current_stock - receiveQty);
      }
      rm.supplier_stock = Math.max(0, (rm.supplier_stock || 0) - receiveQty);
    }

    // Add to warehouse stock
    rm.warehouse_stock = (rm.warehouse_stock || 0) + receiveQty;
    let whBal = (rm.warehouse_balances || []).find(
      (w) => w.warehouse_id.toString() === warehouse._id.toString()
    );
    if (!whBal) {
      whBal = {
        warehouse_id: warehouse._id,
        warehouse_name: warehouse.warehouse_name,
        current_stock: 0,
      };
      rm.warehouse_balances.push(whBal);
    }
    whBal.current_stock += receiveQty;

    rm.total_stock = rm.warehouse_stock + rm.supplier_stock + (rm.in_transit_stock || 0);
    await rm.save();

    // Update PO raw_materials_required item
    let poReqItem = (po.raw_materials_required || []).find(
      (r) => r.raw_material_id.toString() === rm._id.toString()
    );
    if (poReqItem) {
      poReqItem.returned_qty = (poReqItem.returned_qty || 0) + receiveQty;
      poReqItem.pending_at_supplier_qty = Math.max(
        0,
        (poReqItem.issued_qty || 0) - (poReqItem.consumed_qty || 0) - poReqItem.returned_qty
      );
    }

    ret.status = 'received';
    ret.received_qty = receiveQty;
    ret.receipt_date = new Date();
    ret.warehouse_id = warehouse._id;
    ret.warehouse_name = warehouse.warehouse_name;
    ret.received_by = received_by || 'Admin User';
    if (remarks) ret.remarks = remarks;

    await po.save();

    // Create Auditable Movement Record
    const txnNumber = await generateTxnNumber('TXN-RET');
    await RawMaterialMovement.create({
      transaction_number: txnNumber,
      transaction_type: 'Material Return Received',
      reference_no: ret.return_number,
      reference_type: 'Unused Raw Material Return Receipt',
      raw_material_id: rm._id,
      material_code: rm.material_code,
      material_name: rm.material_name,
      supplier_id: supplierId,
      supplier_name: supplierName,
      manufacturing_po_id: po._id,
      po_number: po.po_number,
      warehouse_id: warehouse._id,
      warehouse_name: warehouse.warehouse_name,
      source_location: ret.status === 'in_transit' ? 'In Transit' : supplierName,
      destination_location: warehouse.warehouse_name,
      qty_in: receiveQty,
      qty_out: 0,
      uom: rm.uom,
      warehouse_balance: whBal.current_stock,
      supplier_balance: rm.supplier_stock,
      in_transit_balance: rm.in_transit_stock,
      total_company_balance: rm.total_stock,
      return_status: 'received',
      created_by: received_by || 'Admin User',
      remarks: remarks || `Physically accepted ${receiveQty} ${rm.uom} into ${warehouse.warehouse_name}. Stock restored to warehouse.`,
    });

    res.json({
      success: true,
      message: `Return accepted and received! ${receiveQty} ${rm.uom} added back into ${warehouse.warehouse_name} stock. In-transit balance cleared.`,
      data: { po },
    });
  } catch (error) {
    console.error('Error receiving material return:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Action G: QUICK COMPLETE JOB WORK (1-Click Pipeline)
exports.quickCompleteJobWork = async (req, res) => {
  try {
    const { po_id, remarks, created_by } = req.body;

    if (!po_id) {
      return res.status(400).json({ success: false, message: 'Purchase Order ID is required' });
    }

    const po = await PurchaseOrder.findById(po_id)
      .populate('supplier_id')
      .populate('finished_product_id');

    if (!po) {
      return res.status(404).json({ success: false, message: 'Manufacturing Purchase Order not found' });
    }

    const supplierId = po.supplier_id._id;
    const supplierName = po.supplier_id.supplier_name;
    const targetQty = Number(po.manufacturing_qty) || 100;
    const alreadyCompleted = Number(po.completed_qty) || 0;
    const qtyToProduce = Math.max(1, targetQty - alreadyCompleted);

    // 1. Resolve Warehouse
    let warehouse = null;
    if (po.warehouse_id) {
      warehouse = await Warehouse.findById(po.warehouse_id);
    }
    if (!warehouse) {
      warehouse = await Warehouse.findOne({ is_active: { $ne: false } });
    }
    const whId = warehouse ? warehouse._id : (po.warehouse_id || new mongoose.Types.ObjectId());
    const whName = warehouse ? warehouse.warehouse_name : 'Main Warehouse';

    // 2. Auto-Issue & Consume Raw Materials
    const consumptionItems = [];
    const issueItems = [];

    for (const reqItem of po.raw_materials_required || []) {
      const rm = await RawMaterial.findById(reqItem.raw_material_id);
      if (!rm) continue;

      const planned = Number(reqItem.planned_qty) || 0;
      const consumedSoFar = Number(reqItem.consumed_qty) || 0;
      const neededForThisRun = Math.max(0, planned - consumedSoFar) || planned || 1;

      let supBal = (rm.supplier_balances || []).find(
        (s) => s.supplier_id.toString() === supplierId.toString()
      );
      if (!supBal) {
        supBal = { supplier_id: supplierId, supplier_name: supplierName, current_stock: 0, consumed_stock: 0, returned_stock: 0 };
        rm.supplier_balances.push(supBal);
      }

      // If supplier doesn't hold enough, auto-issue from warehouse
      if (supBal.current_stock < neededForThisRun) {
        const shortfall = neededForThisRun - supBal.current_stock;
        let whBal = (rm.warehouse_balances || []).find(
          (w) => w.warehouse_id && w.warehouse_id.toString() === whId.toString()
        );
        if (!whBal) {
          whBal = { warehouse_id: whId, warehouse_name: whName, current_stock: rm.warehouse_stock || 0 };
          rm.warehouse_balances.push(whBal);
        }
        whBal.current_stock = Math.max(0, (whBal.current_stock || 0) - shortfall);
        rm.warehouse_stock = Math.max(0, (rm.warehouse_stock || 0) - shortfall);

        supBal.current_stock += shortfall;
        rm.supplier_stock = (rm.supplier_stock || 0) + shortfall;
        rm.total_stock = rm.warehouse_stock + rm.supplier_stock + (rm.in_transit_stock || 0);

        const issueTxn = await generateTxnNumber('TXN-ISS');
        await RawMaterialMovement.create({
          transaction_number: issueTxn,
          transaction_type: 'Manufacturing Issue',
          reference_no: `AUTO-ISS-${Date.now().toString().slice(-6)}`,
          reference_type: 'Job Work Auto-Dispatch',
          raw_material_id: rm._id,
          material_code: rm.material_code,
          material_name: rm.material_name,
          supplier_id: supplierId,
          supplier_name: supplierName,
          manufacturing_po_id: po._id,
          po_number: po.po_number,
          warehouse_id: whId,
          warehouse_name: whName,
          source_location: whName,
          destination_location: supplierName,
          qty_in: 0,
          qty_out: shortfall,
          uom: rm.uom,
          warehouse_balance: whBal.current_stock,
          supplier_balance: supBal.current_stock,
          in_transit_balance: rm.in_transit_stock || 0,
          total_company_balance: rm.total_stock,
          created_by: created_by || 'Admin User',
          remarks: `Auto-issued ${shortfall} ${rm.uom} for 1-Click Job Work Complete`,
        });

        issueItems.push({
          raw_material_id: rm._id,
          material_name: rm.material_name,
          qty: shortfall,
          uom: rm.uom,
        });

        reqItem.issued_qty = (reqItem.issued_qty || 0) + shortfall;
      }

      // Consume
      supBal.current_stock = Math.max(0, supBal.current_stock - neededForThisRun);
      supBal.consumed_stock = (supBal.consumed_stock || 0) + neededForThisRun;
      rm.supplier_stock = Math.max(0, (rm.supplier_stock || 0) - neededForThisRun);
      rm.total_stock = rm.warehouse_stock + rm.supplier_stock + (rm.in_transit_stock || 0);
      await rm.save();

      reqItem.consumed_qty = (reqItem.consumed_qty || 0) + neededForThisRun;
      reqItem.unused_qty = Math.max(0, (reqItem.issued_qty || 0) - reqItem.consumed_qty - (reqItem.returned_qty || 0));
      reqItem.pending_at_supplier_qty = reqItem.unused_qty;

      const consTxn = await generateTxnNumber('TXN-CONS');
      await RawMaterialMovement.create({
        transaction_number: consTxn,
        transaction_type: 'Production Consumption',
        reference_no: `AUTO-CONS-${Date.now().toString().slice(-6)}`,
        reference_type: 'Job Work Production Complete',
        raw_material_id: rm._id,
        material_code: rm.material_code,
        material_name: rm.material_name,
        supplier_id: supplierId,
        supplier_name: supplierName,
        manufacturing_po_id: po._id,
        po_number: po.po_number,
        source_location: supplierName,
        destination_location: 'Production Consumption',
        qty_in: 0,
        qty_out: neededForThisRun,
        consumed_qty: neededForThisRun,
        uom: rm.uom,
        warehouse_balance: rm.warehouse_stock,
        supplier_balance: supBal.current_stock,
        in_transit_balance: rm.in_transit_stock || 0,
        total_company_balance: rm.total_stock,
        created_by: created_by || 'Admin User',
        remarks: `Auto-consumed ${neededForThisRun} ${rm.uom} for 1-Click Complete`,
      });

      consumptionItems.push({
        raw_material_id: rm._id,
        material_name: rm.material_name,
        consumed_qty: neededForThisRun,
        uom: rm.uom,
      });
    }

    if (issueItems.length > 0) {
      po.material_issues.push({
        issue_number: `ISS-${Date.now().toString().slice(-6)}`,
        date: new Date(),
        warehouse_id: whId,
        warehouse_name: whName,
        items: issueItems,
        remarks: 'Dispatched automatically during 1-Click Complete',
        created_by: created_by || 'Admin User',
      });
    }

    po.production_consumptions.push({
      consumption_number: `CONS-${Date.now().toString().slice(-6)}`,
      date: new Date(),
      completed_finished_qty: qtyToProduce,
      items: consumptionItems,
      remarks: 'Recorded automatically during 1-Click Complete',
      created_by: created_by || 'Admin User',
    });

    // 3. Receive Finished Goods into Warehouse
    if (po.finished_product_id) {
      const prod = await Product.findById(po.finished_product_id);
      if (prod) {
        prod.stock = (prod.stock || 0) + qtyToProduce;
        let pWh = (prod.warehouse_stocks || []).find((w) => w.warehouse_id && w.warehouse_id.toString() === whId.toString());
        if (!pWh) {
          if (!prod.warehouse_stocks) prod.warehouse_stocks = [];
          prod.warehouse_stocks.push({ warehouse_id: whId, stock: qtyToProduce });
        } else {
          pWh.stock = (pWh.stock || 0) + qtyToProduce;
        }
        await prod.save();
      }
    }

    po.finished_goods_receipts.push({
      receipt_number: `FGR-${Date.now().toString().slice(-6)}`,
      date: new Date(),
      warehouse_id: whId,
      warehouse_name: whName,
      received_qty: qtyToProduce,
      accepted_qty: qtyToProduce,
      rejected_qty: 0,
      remarks: 'Completed & received via 1-Click Complete',
      created_by: created_by || 'Admin User',
    });

    po.completed_qty = targetQty;
    po.received_qty = targetQty;
    po.manufacturing_progress_status = 'completed';
    po.order_status = 'completed';

    await po.save();

    res.json({
      success: true,
      message: `Job Work Order ${po.po_number} successfully completed in 1 click! Raw materials issued & consumed, and ${qtyToProduce} PCS received into ${whName}.`,
      data: { po },
    });
  } catch (error) {
    console.error('Error in quickCompleteJobWork:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Action H: GET CONTRACTOR OVERVIEW & DETAILS
exports.getContractorOverview = async (req, res) => {
  try {
    const contractorId = req.params.id;
    const contractor = await Supplier.findById(contractorId);
    if (!contractor) {
      return res.status(404).json({ success: false, message: 'Contractor not found' });
    }

    const contractorIdStr = contractor._id.toString();

    // 1. Fetch Orders, Invoices, and Movements in parallel
    const [orders, invoices, allRawMaterials, movements] = await Promise.all([
      PurchaseOrder.find({ supplier_id: contractorId, is_deleted: false })
        .populate('finished_product_id', 'product_name sku')
        .populate('warehouse_id', 'warehouse_name')
        .sort({ createdAt: -1 }),
      PurchaseInvoice.find({ supplier_id: contractorId, is_deleted: false })
        .populate('po_id', 'po_number')
        .sort({ createdAt: -1 }),
      RawMaterial.find({ is_deleted: false }),
      RawMaterialMovement.find({ supplier_id: contractorId })
        .sort({ createdAt: -1 })
        .limit(50),
    ]);

    // 2. Extract Raw Materials currently held by this contractor
    const materialsHeld = [];
    allRawMaterials.forEach((rm) => {
      const bal = (rm.supplier_balances || []).find(
        (sb) => sb.supplier_id && sb.supplier_id.toString() === contractorIdStr
      );
      if (bal && (bal.current_stock > 0 || bal.consumed_stock > 0 || bal.returned_stock > 0)) {
        materialsHeld.push({
          raw_material_id: rm._id,
          material_code: rm.material_code,
          material_name: rm.material_name,
          category: rm.category,
          uom: rm.uom,
          current_stock: bal.current_stock || 0,
          consumed_stock: bal.consumed_stock || 0,
          returned_stock: bal.returned_stock || 0,
          pending_return_stock: bal.pending_return_stock || 0,
        });
      }
    });

    // 3. Compute Metrics
    const jobWorkOrders = orders.filter((o) => o.purchase_type === 'manufacturing');
    const activeOrders = jobWorkOrders.filter((o) => !['completed', 'cancelled'].includes(o.order_status));
    const completedOrders = jobWorkOrders.filter((o) => o.order_status === 'completed');

    const totalServiceBilled = invoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
    const totalServicePaid = invoices.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0);
    const pendingBalance = Math.max(0, totalServiceBilled - totalServicePaid);

    res.json({
      success: true,
      data: {
        contractor,
        materials_held: materialsHeld,
        orders: jobWorkOrders.length > 0 ? jobWorkOrders : orders,
        invoices,
        movements,
        metrics: {
          total_orders: jobWorkOrders.length,
          active_orders: activeOrders.length,
          completed_orders: completedOrders.length,
          materials_held_count: materialsHeld.filter((m) => m.current_stock > 0).length,
          total_service_billed: totalServiceBilled,
          total_service_paid: totalServicePaid,
          pending_balance: pendingBalance,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching contractor overview:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
