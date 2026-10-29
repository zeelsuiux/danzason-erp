/**
 * Dynamic Pricing Rules Engine
 * Computes selling prices based on channel (B2B, B2C, D2C, Retail),
 * quantity tier slabs, and product purchase/cost rate.
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
 * Calculates the dynamic unit price based on:
 * - Product purchase/cost rate
 * - Quantity slab from active pricing rules
 * - Channel percentage markup/margin
 */
export const calculateDynamicUnitPrice = (product, quantity, channel = 'B2B', pricingRules = null) => {
  if (!product) {
    return {
      unitPrice: 0,
      baseCost: 0,
      percent: 0,
      slabLabel: '',
      isDynamic: false,
      channel,
    };
  }

  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const ch = ['B2B', 'B2C', 'D2C', 'Retail'].includes(channel) ? channel : 'B2B';
  const baseCost = Number(
    product.purchase_rate ||
      product.cost_rate ||
      product.pricing_rule?.last_purchase_rate ||
      0
  );

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

      const method = pricingRules.pricing_method || 'markup';
      let calculated = 0;
      if (method === 'margin' && percent < 100) {
        calculated = baseCost / (1 - percent / 100);
      } else {
        calculated = baseCost * (1 + percent / 100);
      }

      const unitPrice = Math.round(calculated * 100) / 100;
      const slabLabel = matchedRange.label || `${matchedRange.min_qty}-${matchedRange.max_qty || '+'}`;

      return {
        unitPrice,
        baseCost,
        percent,
        slabLabel,
        method,
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
    method: 'catalog',
    isDynamic: false,
    channel: ch,
  };
};
