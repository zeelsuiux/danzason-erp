/**
 * Dynamic Pricing Rules & FIFO Blended Cost Engine
 * Computes selling prices based on:
 * 1. FIFO (First-In, First-Out) inventory batch allocation
 * 2. Blended / Weighted Average Purchase Cost (Option 1)
 * 3. Channel markups (B2B, B2C, D2C, Retail)
 * 4. Quantity Tier Slabs
 */

export const CHANNEL_CONFIG = {
  B2B: {
    key: 'B2B',
    label: 'B2B Wholesale',
    badgeColor: 'blue',
    field: 'b2b_percent',
    btnClass: 'bg-blue-600 text-white shadow-xs',
    pillClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  B2C: {
    key: 'B2C',
    label: 'B2C Retail',
    badgeColor: 'amber',
    field: 'b2c_percent',
    btnClass: 'bg-amber-600 text-white shadow-xs',
    pillClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  D2C: {
    key: 'D2C',
    label: 'D2C Online',
    badgeColor: 'purple',
    field: 'd2c_percent',
    btnClass: 'bg-purple-600 text-white shadow-xs',
    pillClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  Retail: {
    key: 'Retail',
    label: 'Retail Stores',
    badgeColor: 'emerald',
    field: 'retail_percent',
    btnClass: 'bg-emerald-600 text-white shadow-xs',
    pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

export const CHANNELS = ['B2B', 'B2C', 'D2C', 'Retail'];

/**
 * Automatically detects the pricing channel from customer details
 */
export const detectCustomerChannel = (customer) => {
  if (!customer) return 'B2B';
  const type = String(customer.customer_type || customer.channel || '').toUpperCase();
  if (type.includes('D2C') || type.includes('ONLINE') || type.includes('DIRECT TO CONSUMER')) {
    return 'D2C';
  }
  if (type.includes('RETAIL') || type.includes('STORE') || type.includes('POS') || type.includes('OUTLET')) {
    return 'Retail';
  }
  if (type.includes('B2C') || type.includes('CONSUMER') || type.includes('INDIVIDUAL') || type.includes('WALKIN')) {
    return 'B2C';
  }
  return 'B2B';
};

/**
 * Computes FIFO Weighted Average Blended Purchase Cost across batches
 */
export const calculateFifoCost = (product, requestedQty) => {
  const qty = Math.max(1, parseInt(requestedQty, 10) || 1);
  const fallbackCost = Number(
    product?.purchase_rate ||
      product?.cost_rate ||
      product?.pricing_rule?.last_purchase_rate ||
      0
  );

  const batches = (product?.purchase_batches || [])
    .filter((b) => Number(b.remaining_qty) > 0)
    .sort((a, b) => new Date(a.received_at || 0) - new Date(b.received_at || 0));

  if (!batches.length) {
    return {
      effectiveCost: fallbackCost,
      allocations: [],
      isBlended: false,
      summary: fallbackCost > 0 ? `Cost: ₹${fallbackCost.toFixed(2)}` : '',
    };
  }

  let needed = qty;
  let totalCost = 0;
  const allocations = [];

  for (const b of batches) {
    if (needed <= 0) break;
    const available = Number(b.remaining_qty) || 0;
    const take = Math.min(available, needed);
    const rate = Number(b.purchase_rate) || 0;

    totalCost += take * rate;
    needed -= take;
    allocations.push({
      batch_number: b.batch_number || 'Batch',
      qty: take,
      rate,
    });
  }

  if (needed > 0) {
    const latestRate = fallbackCost > 0 ? fallbackCost : Number(batches[batches.length - 1]?.purchase_rate || 0);
    totalCost += needed * latestRate;
    allocations.push({
      batch_number: 'Stock',
      qty: needed,
      rate: latestRate,
    });
  }

  const effectiveCost = Math.round((totalCost / qty) * 100) / 100;
  const summary = allocations
    .map((a) => `${a.qty}@₹${a.rate}`)
    .join(' + ');

  return {
    effectiveCost,
    allocations,
    isBlended: allocations.length > 1,
    summary,
  };
};

/**
 * Calculates the dynamic unit price based on:
 * - FIFO blended purchase cost from product batches
 * - Quantity slab from active pricing rules
 * - Channel percentage markup
 */
export const calculateDynamicUnitPrice = (product, quantity, channel = 'B2B', pricingRules = null) => {
  if (!product) {
    return {
      unitPrice: 0,
      baseCost: 0,
      percent: 0,
      slabLabel: '',
      isDynamic: false,
      pricingInfo: null,
      channel,
    };
  }

  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const ch = ['B2B', 'B2C', 'D2C', 'Retail'].includes(channel) ? channel : 'B2B';

  // Calculate FIFO blended cost
  const fifoResult = calculateFifoCost(product, qty);
  const baseCost = fifoResult.effectiveCost;

  // If active pricing rules with quantity ranges exist and baseCost > 0
  if (pricingRules && Array.isArray(pricingRules.ranges) && pricingRules.ranges.length > 0 && baseCost > 0) {
    // Find matching range
    const matchedRange = pricingRules.ranges.find((r) => {
      const min = Number(r.min_qty) || 0;
      const max = r.max_qty !== null && r.max_qty !== undefined ? Number(r.max_qty) : Infinity;
      return qty >= min && qty <= max;
    });

    if (matchedRange) {
      let percent = 0;
      if (ch === 'B2C') percent = Number(matchedRange.b2c_percent || 0);
      else if (ch === 'D2C') percent = Number(matchedRange.d2c_percent || 0);
      else if (ch === 'Retail') percent = Number(matchedRange.retail_percent || 0);
      else percent = Number(matchedRange.b2b_percent || 0);

      // Markup percentage added onto FIFO blended base cost
      const calculated = baseCost * (1 + percent / 100);
      const unitPrice = Math.round(calculated * 100) / 100;
      const slabLabel = matchedRange.label || `${matchedRange.min_qty}-${matchedRange.max_qty || '+'}`;

      let pricingInfo = `+${percent}% (${slabLabel})`;
      if (fifoResult.isBlended) {
        pricingInfo = `FIFO Avg ₹${baseCost.toFixed(2)} (${fifoResult.summary}) +${percent}%`;
      } else if (baseCost > 0) {
        pricingInfo = `Cost ₹${baseCost.toFixed(2)} +${percent}% (${slabLabel})`;
      }

      return {
        unitPrice,
        baseCost,
        percent,
        slabLabel,
        fifoSummary: fifoResult.summary,
        isBlended: fifoResult.isBlended,
        pricingInfo,
        method: 'markup',
        isDynamic: true,
        channel: ch,
      };
    }
  }

  // Fallback to product catalog pricing
  const b2b = Number(product.b2b_price ?? product.selling_rate ?? product.price ?? 0);
  const b2c = Number(product.b2c_price ?? product.mrp ?? (b2b > 0 ? Math.round(b2b * 1.35) : 0));
  const fallback = ch === 'B2B' ? b2b : b2c;
  const finalRate = fallback > 0 ? fallback : baseCost;

  return {
    unitPrice: finalRate,
    baseCost,
    percent: 0,
    slabLabel: '',
    fifoSummary: fifoResult.summary,
    isBlended: fifoResult.isBlended,
    pricingInfo: fifoResult.isBlended ? `FIFO Avg Cost: ₹${baseCost.toFixed(2)} (${fifoResult.summary})` : null,
    method: 'catalog',
    isDynamic: false,
    channel: ch,
  };
};
