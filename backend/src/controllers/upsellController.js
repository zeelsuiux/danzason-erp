const mongoose = require('mongoose');
const UpsellCrossSellRule = require('../models/UpsellCrossSellRule');
const UpsellOpportunity = require('../models/UpsellOpportunity');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

// ==============================================================================
// SEED STARTER RULES IF NONE EXIST
// ==============================================================================
async function ensureDefaultRules() {
  try {
    const count = await UpsellCrossSellRule.countDocuments({ is_deleted: false });
    if (count === 0) {
      const products = await Product.find({ is_deleted: false }).limit(6).lean();
      const p1 = products[0] || {};
      const p2 = products[1] || {};
      const p3 = products[2] || {};
      const p4 = products[3] || {};
      const p5 = products[4] || {};
      const p6 = products[5] || {};

      const starterRules = [
        {
          rule_code: 'UXS-001',
          title: 'Upgrade Round Neck to Heavyweight Pique Polo',
          type: 'upsell',
          trigger_type: 'product',
          trigger_product_id: p3._id || null,
          trigger_product_name: p3.name || 'GEMINI ROUND NECK',
          trigger_category: 'T-SHIRT',
          recommended_product_id: p5._id || p1._id || null,
          recommended_product_name: p5.name || 'TITAN PRO POLO NECK',
          recommendation_pitch: 'Upgrade from single jersey round neck to 220 GSM combed bio-washed pique polo for +₹45/pcs with superior retail showroom markup.',
          pricing_type: 'upgrade_diff',
          price_value: 45,
          min_order_qty: 25,
          priority: 10,
          conversion_stats: { times_pitched: 28, times_accepted: 19, revenue_generated: 85500 },
          is_active: true,
        },
        {
          rule_code: 'UXS-002',
          title: 'Combo Pair: Matching Prime Trackpant Bundle',
          type: 'cross_sell',
          trigger_type: 'category',
          trigger_category: 'T-SHIRT',
          recommended_product_id: p6._id || null,
          recommended_product_name: p6.name || 'PRIME TRACKPANT',
          recommendation_pitch: 'Bundle matching GSM combed cotton trackpants with polo orders to create complete 2-piece athleisure set with 8% bundle discount.',
          pricing_type: 'discount_percent',
          price_value: 8,
          min_order_qty: 30,
          priority: 9,
          conversion_stats: { times_pitched: 35, times_accepted: 22, revenue_generated: 114000 },
          is_active: true,
        },
        {
          rule_code: 'UXS-003',
          title: 'Upgrade Half Sleeve Polo to Full Sleeve Season Variant',
          type: 'upsell',
          trigger_type: 'product',
          trigger_product_id: p2._id || null,
          trigger_product_name: p2.name || 'MARS POLO NECK',
          recommended_product_id: p4._id || null,
          recommended_product_name: p4.name || 'MARS POLO (FULL SLEEVE)',
          recommendation_pitch: 'Pitch full-sleeve ribbed cuff edition for autumn/winter transitions with only +₹30 per piece price difference.',
          pricing_type: 'upgrade_diff',
          price_value: 30,
          min_order_qty: 20,
          priority: 8,
          conversion_stats: { times_pitched: 19, times_accepted: 11, revenue_generated: 49500 },
          is_active: true,
        },
        {
          rule_code: 'UXS-004',
          title: 'Custom Brand Retail Polybag & Hangtag Packing Add-on',
          type: 'cross_sell',
          trigger_type: 'all',
          recommended_product_id: p1._id || null,
          recommended_product_name: 'Custom Branded Packaging Pack',
          recommendation_pitch: 'Provide ready-for-rack pre-packaged blister boxes with customized barcode hangtags, inner tissue, and silica gel packet (+₹15/pcs).',
          pricing_type: 'special_price',
          price_value: 15,
          min_order_qty: 50,
          priority: 7,
          conversion_stats: { times_pitched: 42, times_accepted: 29, revenue_generated: 78300 },
          is_active: true,
        },
      ];

      for (const rule of starterRules) {
        if (rule.recommended_product_id) {
          await UpsellCrossSellRule.create(rule);
        }
      }
    }
  } catch (err) {
    console.error('ensureDefaultRules error:', err.message);
  }
}

// ==============================================================================
// 1. GET ALL RULES
// ==============================================================================
exports.getRules = async (req, res) => {
  try {
    await ensureDefaultRules();

    const { type, status = 'all', search } = req.query;
    const query = { is_deleted: false };

    if (type && type !== 'all') {
      query.type = type;
    }
    if (status && status !== 'all') {
      query.is_active = status === 'active';
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { rule_code: { $regex: q, $options: 'i' } },
        { trigger_product_name: { $regex: q, $options: 'i' } },
        { recommended_product_name: { $regex: q, $options: 'i' } },
        { trigger_category: { $regex: q, $options: 'i' } },
        { recommendation_pitch: { $regex: q, $options: 'i' } },
      ];
    }

    const rules = await UpsellCrossSellRule.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .populate('trigger_product_id', 'name category price b2b_price stock')
      .populate('recommended_product_id', 'name category price b2b_price stock');

    res.json({
      success: true,
      data: rules,
    });
  } catch (err) {
    console.error('getRules error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 2. GET RULE BY ID
// ==============================================================================
exports.getRuleById = async (req, res) => {
  try {
    const rule = await UpsellCrossSellRule.findOne({ _id: req.params.id, is_deleted: false })
      .populate('trigger_product_id', 'name category price b2b_price stock')
      .populate('recommended_product_id', 'name category price b2b_price stock');

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    res.json({
      success: true,
      data: rule,
    });
  } catch (err) {
    console.error('getRuleById error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 3. CREATE RULE
// ==============================================================================
exports.createRule = async (req, res) => {
  try {
    const {
      title,
      type,
      trigger_type = 'product',
      trigger_product_id,
      trigger_product_name,
      trigger_category,
      recommended_product_id,
      recommended_product_name,
      recommendation_pitch,
      pricing_type,
      price_value,
      min_order_qty,
      priority,
      is_active,
      notes,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Rule title is required.' });
    }
    if (!recommended_product_name || !recommended_product_name.trim()) {
      return res.status(400).json({ success: false, message: 'Recommended target product is required.' });
    }

    const rule = new UpsellCrossSellRule({
      title: title.trim(),
      type: type || 'cross_sell',
      trigger_type: trigger_type || 'product',
      trigger_product_id: trigger_product_id || null,
      trigger_product_name: (trigger_product_name || '').trim(),
      trigger_category: (trigger_category || '').trim(),
      recommended_product_id: recommended_product_id || null,
      recommended_product_name: recommended_product_name.trim(),
      recommendation_pitch: (recommendation_pitch || '').trim(),
      pricing_type: pricing_type || 'upgrade_diff',
      price_value: Number(price_value) || 0,
      min_order_qty: Number(min_order_qty) || 1,
      priority: Number(priority) || 1,
      is_active: is_active !== undefined ? is_active : true,
      notes: (notes || '').trim(),
    });

    await rule.save();

    res.status(201).json({
      success: true,
      message: `Rule "${rule.title}" (${rule.rule_code}) created successfully.`,
      data: rule,
    });
  } catch (err) {
    console.error('createRule error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 4. UPDATE RULE
// ==============================================================================
exports.updateRule = async (req, res) => {
  try {
    const rule = await UpsellCrossSellRule.findOne({ _id: req.params.id, is_deleted: false });
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    const {
      title,
      type,
      trigger_type,
      trigger_product_id,
      trigger_product_name,
      trigger_category,
      recommended_product_id,
      recommended_product_name,
      recommendation_pitch,
      pricing_type,
      price_value,
      min_order_qty,
      priority,
      is_active,
      notes,
    } = req.body;

    if (title) rule.title = title.trim();
    if (type) rule.type = type;
    if (trigger_type !== undefined) rule.trigger_type = trigger_type;
    if (trigger_product_id !== undefined) rule.trigger_product_id = trigger_product_id || null;
    if (trigger_product_name !== undefined) rule.trigger_product_name = trigger_product_name.trim();
    if (trigger_category !== undefined) rule.trigger_category = trigger_category.trim();
    if (recommended_product_id !== undefined) rule.recommended_product_id = recommended_product_id || null;
    if (recommended_product_name !== undefined) rule.recommended_product_name = recommended_product_name.trim();
    if (recommendation_pitch !== undefined) rule.recommendation_pitch = recommendation_pitch.trim();
    if (pricing_type) rule.pricing_type = pricing_type;
    if (price_value !== undefined) rule.price_value = Number(price_value);
    if (min_order_qty !== undefined) rule.min_order_qty = Number(min_order_qty);
    if (priority !== undefined) rule.priority = Number(priority);
    if (is_active !== undefined) rule.is_active = is_active;
    if (notes !== undefined) rule.notes = notes.trim();

    await rule.save();

    res.json({
      success: true,
      message: `Rule "${rule.title}" updated successfully.`,
      data: rule,
    });
  } catch (err) {
    console.error('updateRule error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 5. DELETE RULE (SOFT DELETE)
// ==============================================================================
exports.deleteRule = async (req, res) => {
  try {
    const rule = await UpsellCrossSellRule.findOne({ _id: req.params.id, is_deleted: false });
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    rule.is_deleted = true;
    await rule.save();

    res.json({
      success: true,
      message: `Rule "${rule.title}" removed successfully.`,
    });
  } catch (err) {
    console.error('deleteRule error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 6. SMART RECOMMENDATIONS ENGINE
// Accepts: product_ids (array), categories (array), customer_id
// Returns prioritized upsells and cross-sells matching currently selected items
// ==============================================================================
exports.getRecommendations = async (req, res) => {
  try {
    await ensureDefaultRules();

    let { product_ids = [], product_id, categories = [], category } = req.body;

    // Normalize product_ids
    if (product_id && !product_ids.includes(product_id)) {
      product_ids.push(product_id);
    }
    const cleanProductIds = (Array.isArray(product_ids) ? product_ids : [product_ids])
      .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id).trim()))
      .map((id) => new mongoose.Types.ObjectId(String(id).trim()));

    // Normalize categories
    const allCategories = new Set(
      (Array.isArray(categories) ? categories : [categories])
        .concat(category ? [category] : [])
        .filter((c) => Boolean(c) && typeof c === 'string')
        .map((c) => c.trim().toUpperCase())
    );

    // If product_ids provided, lookup product categories to match category-level rules
    let productNames = [];
    if (cleanProductIds.length > 0) {
      const foundProducts = await Product.find({ _id: { $in: cleanProductIds } }, 'name category').lean();
      foundProducts.forEach((p) => {
        if (p.category) allCategories.add(p.category.trim().toUpperCase());
        if (p.name) productNames.push(p.name.trim().toLowerCase());
      });
    }

    const categoriesArray = Array.from(allCategories);

    // Build flexible matching criteria
    const orConditions = [{ trigger_type: 'all' }];

    if (cleanProductIds.length > 0) {
      orConditions.push({ trigger_product_id: { $in: cleanProductIds } });
    }

    if (productNames.length > 0) {
      orConditions.push({
        trigger_product_name: {
          $in: productNames.map((n) => new RegExp(`^${n}$`, 'i')),
        },
      });
    }

    if (categoriesArray.length > 0) {
      orConditions.push({
        trigger_category: {
          $in: categoriesArray.map((c) => new RegExp(`^${c}$`, 'i')),
        },
      });
    }

    // If no specific product or category was requested, return all active rules as starter suggestions
    let query = {
      is_deleted: false,
      is_active: true,
    };

    if (cleanProductIds.length > 0 || categoriesArray.length > 0) {
      query.$or = orConditions;
    }

    const matchedRules = await UpsellCrossSellRule.find(query)
      .sort({ priority: -1, 'conversion_stats.revenue_generated': -1, 'conversion_stats.times_accepted': -1 })
      .populate('trigger_product_id', 'name category price b2b_price stock sku images')
      .populate('recommended_product_id', 'name category price b2b_price stock sku images')
      .lean();

    // Group into upsells and cross-sells
    const upsells = matchedRules.filter((r) => r.type === 'upsell');
    const crossSells = matchedRules.filter((r) => r.type === 'cross_sell');

    res.json({
      success: true,
      data: {
        totalMatches: matchedRules.length,
        upsells,
        crossSells,
        allRecommendations: matchedRules,
      },
    });
  } catch (err) {
    console.error('getRecommendations error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 7. LOG SALES PITCH OUTCOME
// Sales executive pitches an upsell/cross-sell and records acceptance/decline
// ==============================================================================
exports.logPitchResult = async (req, res) => {
  try {
    const {
      rule_id,
      customer_id,
      customer_name,
      status = 'pitched', // 'pitched' | 'accepted' | 'declined' | 'converted_to_invoice'
      declined_reason = '',
      potential_additional_value,
      revenue_amount,
      quantity_sold = 0,
      sales_executive = 'Vikram Mehta',
      order_id = null,
      invoice_id = null,
    } = req.body;

    const finalRevenue = Number(potential_additional_value !== undefined ? potential_additional_value : (revenue_amount || 0));

    let rule = null;
    if (rule_id) {
      rule = await UpsellCrossSellRule.findById(rule_id);
    }

    const opportunity = new UpsellOpportunity({
      customer_id: customer_id || null,
      customer_name: customer_name || 'Direct Wholesale Buyer',
      rule_id: rule ? rule._id : null,
      rule_title: rule ? rule.title : 'Direct Product Add-on',
      type: rule ? rule.type : 'cross_sell',
      trigger_item_name: rule ? rule.trigger_product_name : '',
      recommended_item_name: rule ? rule.recommended_product_name : '',
      potential_additional_value: finalRevenue,
      quantity_sold: Number(quantity_sold) || 0,
      status,
      declined_reason: declined_reason.trim(),
      sales_executive: sales_executive || 'Vikram Mehta',
      order_id: order_id || null,
      invoice_id: invoice_id || null,
    });

    await opportunity.save();

    // Update rule conversion stats
    if (rule) {
      rule.conversion_stats.times_pitched += 1;
      if (status === 'accepted' || status === 'converted_to_invoice') {
        rule.conversion_stats.times_accepted += 1;
        rule.conversion_stats.revenue_generated += finalRevenue;
      }
      await rule.save();
    }

    res.status(201).json({
      success: true,
      message: `Pitch outcome logged as "${status}".`,
      data: opportunity,
    });
  } catch (err) {
    console.error('logPitchResult error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 8. GET ALL PITCH OPPORTUNITIES (PIPELINE & AUDIT HISTORY)
// ==============================================================================
exports.getOpportunities = async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;
    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { opportunity_code: { $regex: q, $options: 'i' } },
        { customer_name: { $regex: q, $options: 'i' } },
        { rule_title: { $regex: q, $options: 'i' } },
        { trigger_item_name: { $regex: q, $options: 'i' } },
        { recommended_item_name: { $regex: q, $options: 'i' } },
      ];
    }

    const opportunities = await UpsellOpportunity.find(query)
      .sort({ createdAt: -1 })
      .populate('customer_id', 'customer_name email phone')
      .populate('rule_id', 'title type pricing_type price_value');

    res.json({
      success: true,
      data: opportunities,
    });
  } catch (err) {
    console.error('getOpportunities error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================================================================
// 9. ANALYTICS & EXECUTIVE PERFORMANCE DASHBOARD
// ==============================================================================
exports.getAnalytics = async (req, res) => {
  try {
    await ensureDefaultRules();

    const rules = await UpsellCrossSellRule.find({ is_deleted: false }).lean();
    const opportunities = await UpsellOpportunity.find({}).lean();

    let totalUpsellRevenue = 0;
    let totalCrossSellRevenue = 0;
    let totalPitched = 0;
    let totalAccepted = 0;

    rules.forEach((r) => {
      const pitched = r.conversion_stats?.times_pitched || 0;
      const accepted = r.conversion_stats?.times_accepted || 0;
      const rev = r.conversion_stats?.revenue_generated || 0;

      totalPitched += pitched;
      totalAccepted += accepted;
      if (r.type === 'upsell') {
        totalUpsellRevenue += rev;
      } else {
        totalCrossSellRevenue += rev;
      }
    });

    const totalAdditionalRevenue = totalUpsellRevenue + totalCrossSellRevenue;
    const overallConversionRate = totalPitched > 0 ? Number(((totalAccepted / totalPitched) * 100).toFixed(1)) : 0;

    // Top high-converting rules
    const topRules = [...rules]
      .sort((a, b) => (b.conversion_stats?.revenue_generated || 0) - (a.conversion_stats?.revenue_generated || 0))
      .slice(0, 5);

    // Recent activity
    const recentActivity = await UpsellOpportunity.find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    res.json({
      success: true,
      data: {
        totalAdditionalRevenue,
        totalUpsellRevenue,
        totalCrossSellRevenue,
        totalPitched,
        totalAccepted,
        overallConversionRate,
        activeRulesCount: rules.filter((r) => r.is_active).length,
        totalRulesCount: rules.length,
        topRules,
        recentActivity,
      },
    });
  } catch (err) {
    console.error('getAnalytics error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
