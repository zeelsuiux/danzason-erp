const SalesForecast = require('../models/SalesForecast');
const Lead = require('../models/Lead');
const SalesOrder = require('../models/SalesOrder');
const SalesInvoice = require('../models/SalesInvoice');

// Realistic Default Seasonal Forecasts for Danza Son Apparels & Textiles (FY 2026-27)
const SAMPLE_FORECASTS = [
  {
    forecast_code: 'FCST-2026-Q1',
    title: 'Q1 (Apr - Jun 2026) Summer Collection & Retail Re-stocking',
    financial_year: '2026-2027',
    period_type: 'quarterly',
    period_name: 'Q1 (Apr - Jun 2026)',
    season: 'summer',
    confidence_level: 'realistic',
    target_revenue: 6500000,
    projected_revenue: 7150000,
    actual_revenue: 6920000,
    weighted_pipeline_revenue: 1850000,
    target_units: 32000,
    projected_units: 35500,
    actual_units: 34100,
    estimated_fabric_kg: 8875,
    status: 'reviewed',
    notes: 'Strong initial demand in 100% Cotton Bio-wash T-shirts and Lycra Polos across Gujarat & Maharashtra wholesale hubs.',
    category_forecasts: [
      {
        category: 'cotton_tshirts',
        category_label: 'Bio-wash Round Neck T-Shirts',
        target_units: 16000,
        projected_units: 18500,
        actual_units: 17800,
        average_selling_price: 185,
        target_revenue: 2960000,
        projected_revenue: 3422500,
        fabric_type: '100% Combed Cotton Single Jersey 180 GSM',
        fabric_required_kg: 3700,
        growth_rate_pct: 15.6,
      },
      {
        category: 'lycra_polos',
        category_label: 'Cotton Lycra Matty Polos',
        target_units: 8000,
        projected_units: 9200,
        actual_units: 8900,
        average_selling_price: 260,
        target_revenue: 2080000,
        projected_revenue: 2392000,
        fabric_type: '95/5 Cotton Lycra Pique Matty 220 GSM',
        fabric_required_kg: 2300,
        growth_rate_pct: 15.0,
      },
      {
        category: 'joggers',
        category_label: 'Poly-Spandex Gym Joggers',
        target_units: 5000,
        projected_units: 4800,
        actual_units: 4600,
        average_selling_price: 220,
        target_revenue: 1100000,
        projected_revenue: 1056000,
        fabric_type: 'NS Spandex Micro-Poly 140 GSM',
        fabric_required_kg: 1680,
        growth_rate_pct: -4.0,
      },
      {
        category: 'hoodies_fleece',
        category_label: 'Heavyweight Fleece Hoodies',
        target_units: 3000,
        projected_units: 3000,
        actual_units: 2800,
        average_selling_price: 360,
        target_revenue: 360000,
        projected_revenue: 279500,
        fabric_type: '3-Thread Cotton Poly Fleece 320 GSM',
        fabric_required_kg: 1195,
        growth_rate_pct: -22.3,
      },
    ],
    territory_forecasts: [
      {
        region: 'Surat & South Gujarat',
        target_revenue: 2600000,
        projected_revenue: 2900000,
        key_accounts_count: 14,
        growth_outlook: 'high',
      },
      {
        region: 'Mumbai & Western Maharashtra',
        target_revenue: 1800000,
        projected_revenue: 2050000,
        key_accounts_count: 9,
        growth_outlook: 'high',
      },
      {
        region: 'Delhi NCR & North',
        target_revenue: 1300000,
        projected_revenue: 1380000,
        key_accounts_count: 7,
        growth_outlook: 'moderate',
      },
      {
        region: 'Ludhiana & Punjab',
        target_revenue: 800000,
        projected_revenue: 820000,
        key_accounts_count: 5,
        growth_outlook: 'stable',
      },
    ],
  },
  {
    forecast_code: 'FCST-2026-Q2',
    title: 'Q2 (Jul - Sep 2026) Festive Pre-Booking & Navratri Production',
    financial_year: '2026-2027',
    period_type: 'quarterly',
    period_name: 'Q2 (Jul - Sep 2026)',
    season: 'festive_diwali',
    confidence_level: 'optimistic',
    target_revenue: 8500000,
    projected_revenue: 9600000,
    actual_revenue: 0,
    weighted_pipeline_revenue: 3200000,
    target_units: 42000,
    projected_units: 48000,
    actual_units: 0,
    estimated_fabric_kg: 12500,
    status: 'active',
    notes: 'Advance wholesale bookings for upcoming Navratri & Diwali. High surge in printed rayon kurtis and oversized graphic tees.',
    category_forecasts: [
      {
        category: 'cotton_tshirts',
        category_label: 'Oversized & Graphic Tees (220 GSM)',
        target_units: 20000,
        projected_units: 24000,
        actual_units: 0,
        average_selling_price: 210,
        target_revenue: 4200000,
        projected_revenue: 5040000,
        fabric_type: 'Heavy 100% Cotton Single Jersey 220 GSM',
        fabric_required_kg: 5280,
        growth_rate_pct: 20.0,
      },
      {
        category: 'lycra_polos',
        category_label: 'Premium Jacquard Collar Polos',
        target_units: 10000,
        projected_units: 11500,
        actual_units: 0,
        average_selling_price: 275,
        target_revenue: 2750000,
        projected_revenue: 3162500,
        fabric_type: 'Cotton Lycra Matty with Knitted Collar 230 GSM',
        fabric_required_kg: 2875,
        growth_rate_pct: 15.0,
      },
      {
        category: 'ethnic_kurtis',
        category_label: 'Rayon Liva Printed Kurti Sets',
        target_units: 7000,
        projected_units: 8000,
        actual_units: 0,
        average_selling_price: 135,
        target_revenue: 945000,
        projected_revenue: 1080000,
        fabric_type: '100% Rayon 14 Kg Slub Print',
        fabric_required_kg: 2400,
        growth_rate_pct: 14.3,
      },
      {
        category: 'joggers',
        category_label: 'Cargo & Utility Joggers',
        target_units: 5000,
        projected_units: 4500,
        actual_units: 0,
        average_selling_price: 250,
        target_revenue: 1250000,
        projected_revenue: 1125000,
        fabric_type: 'Cotton Twill Spandex 210 GSM',
        fabric_required_kg: 1945,
        growth_rate_pct: -10.0,
      },
    ],
    territory_forecasts: [
      {
        region: 'Surat & South Gujarat',
        target_revenue: 3500000,
        projected_revenue: 4100000,
        key_accounts_count: 18,
        growth_outlook: 'high',
      },
      {
        region: 'Mumbai & Western Maharashtra',
        target_revenue: 2400000,
        projected_revenue: 2750000,
        key_accounts_count: 12,
        growth_outlook: 'high',
      },
      {
        region: 'Delhi NCR & North',
        target_revenue: 1600000,
        projected_revenue: 1750000,
        key_accounts_count: 9,
        growth_outlook: 'moderate',
      },
      {
        region: 'Bangalore & South',
        target_revenue: 1000000,
        projected_revenue: 1000000,
        key_accounts_count: 6,
        growth_outlook: 'stable',
      },
    ],
  },
  {
    forecast_code: 'FCST-2026-Q3',
    title: 'Q3 (Oct - Dec 2026) Winter Festive Peak & Sweatshirt Dispatch',
    financial_year: '2026-2027',
    period_type: 'quarterly',
    period_name: 'Q3 (Oct - Dec 2026)',
    season: 'winter',
    confidence_level: 'optimistic',
    target_revenue: 11000000,
    projected_revenue: 12400000,
    actual_revenue: 0,
    weighted_pipeline_revenue: 4100000,
    target_units: 48000,
    projected_units: 54000,
    actual_units: 0,
    estimated_fabric_kg: 18500,
    status: 'active',
    notes: 'Winter peak volume. North India dispatch of 320 GSM fleece hoodies, zipper jackets, and thermal inner wear.',
    category_forecasts: [
      {
        category: 'hoodies_fleece',
        category_label: '3-Thread Fleece Hoodies & Sweatshirts',
        target_units: 24000,
        projected_units: 28000,
        actual_units: 0,
        average_selling_price: 360,
        target_revenue: 8640000,
        projected_revenue: 10080000,
        fabric_type: '3-Thread Super Combed Fleece 320 GSM',
        fabric_required_kg: 11200,
        growth_rate_pct: 16.7,
      },
      {
        category: 'cotton_tshirts',
        category_label: 'Full Sleeve Bio-Wash T-Shirts',
        target_units: 12000,
        projected_units: 13500,
        actual_units: 0,
        average_selling_price: 205,
        target_revenue: 2460000,
        projected_revenue: 2767500,
        fabric_type: '100% Cotton Rib & Single Jersey 190 GSM',
        fabric_required_kg: 3375,
        growth_rate_pct: 12.5,
      },
      {
        category: 'joggers',
        category_label: 'Heavyweight Fleece Winter Track Pants',
        target_units: 12000,
        projected_units: 12500,
        actual_units: 0,
        average_selling_price: 270,
        target_revenue: 3240000,
        projected_revenue: 3375000,
        fabric_type: 'Cotton Poly Terry Fleece 280 GSM',
        fabric_required_kg: 3925,
        growth_rate_pct: 4.2,
      },
    ],
    territory_forecasts: [
      {
        region: 'Ludhiana & Punjab',
        target_revenue: 4000000,
        projected_revenue: 4600000,
        key_accounts_count: 16,
        growth_outlook: 'high',
      },
      {
        region: 'Delhi NCR & North',
        target_revenue: 3800000,
        projected_revenue: 4300000,
        key_accounts_count: 14,
        growth_outlook: 'high',
      },
      {
        region: 'Mumbai & Western Maharashtra',
        target_revenue: 2000000,
        projected_revenue: 2200000,
        key_accounts_count: 10,
        growth_outlook: 'moderate',
      },
      {
        region: 'Surat & South Gujarat',
        target_revenue: 1200000,
        projected_revenue: 1300000,
        key_accounts_count: 8,
        growth_outlook: 'moderate',
      },
    ],
  },
  {
    forecast_code: 'FCST-2026-Q4',
    title: 'Q4 (Jan - Mar 2027) Wedding, Spring & Summer 2027 Launch',
    financial_year: '2026-2027',
    period_type: 'quarterly',
    period_name: 'Q4 (Jan - Mar 2027)',
    season: 'wedding_spring',
    confidence_level: 'realistic',
    target_revenue: 7200000,
    projected_revenue: 7800000,
    actual_revenue: 0,
    weighted_pipeline_revenue: 2100000,
    target_units: 36000,
    projected_units: 39500,
    actual_units: 0,
    estimated_fabric_kg: 9800,
    status: 'draft',
    notes: 'Transition period into wedding season and early summer collection sampling for pan-India distributors.',
    category_forecasts: [
      {
        category: 'cotton_tshirts',
        category_label: 'Polo & Summer Casual T-Shirts',
        target_units: 18000,
        projected_units: 20000,
        actual_units: 0,
        average_selling_price: 195,
        target_revenue: 3510000,
        projected_revenue: 3900000,
        fabric_type: '100% Combed Cotton 180 GSM',
        fabric_required_kg: 4000,
        growth_rate_pct: 11.1,
      },
      {
        category: 'lycra_polos',
        category_label: 'Tipping Collar Cotton Polos',
        target_units: 10000,
        projected_units: 11000,
        actual_units: 0,
        average_selling_price: 265,
        target_revenue: 2650000,
        projected_revenue: 2915000,
        fabric_type: 'Cotton Lycra Matty 220 GSM',
        fabric_required_kg: 2750,
        growth_rate_pct: 10.0,
      },
      {
        category: 'ethnic_kurtis',
        category_label: 'Designer Embroidered Kurti Sets',
        target_units: 8000,
        projected_units: 8500,
        actual_units: 0,
        average_selling_price: 240,
        target_revenue: 1920000,
        projected_revenue: 2040000,
        fabric_type: 'Chanderi & Rayon Blend',
        fabric_required_kg: 3050,
        growth_rate_pct: 6.3,
      },
    ],
    territory_forecasts: [
      {
        region: 'Surat & South Gujarat',
        target_revenue: 3000000,
        projected_revenue: 3300000,
        key_accounts_count: 15,
        growth_outlook: 'high',
      },
      {
        region: 'Mumbai & Western Maharashtra',
        target_revenue: 2200000,
        projected_revenue: 2400000,
        key_accounts_count: 10,
        growth_outlook: 'moderate',
      },
      {
        region: 'Delhi NCR & North',
        target_revenue: 1200000,
        projected_revenue: 1300000,
        key_accounts_count: 7,
        growth_outlook: 'stable',
      },
      {
        region: 'Bangalore & South',
        target_revenue: 800000,
        projected_revenue: 800000,
        key_accounts_count: 5,
        growth_outlook: 'stable',
      },
    ],
  },
];

async function ensureSampleForecasts() {
  try {
    const count = await SalesForecast.countDocuments({ is_deleted: false });
    if (count === 0) {
      for (const item of SAMPLE_FORECASTS) {
        await SalesForecast.create(item);
      }
      console.log('🌱 Seeded default Danza Son sales forecasts successfully.');
    }
  } catch (err) {
    console.warn('⚠️ Could not seed default sales forecasts:', err.message);
  }
}

// 1. GET ALL FORECASTS (WITH SEARCH & FILTERS)
exports.getForecasts = async (req, res) => {
  try {
    await ensureSampleForecasts();

    const {
      search,
      financial_year,
      period_type,
      status,
      season,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'asc',
    } = req.query;

    const query = { is_deleted: false };

    if (financial_year && financial_year !== 'all') {
      query.financial_year = financial_year;
    }

    if (period_type && period_type !== 'all') {
      query.period_type = period_type;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (season && season !== 'all') {
      query.season = season;
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { forecast_code: { $regex: q, $options: 'i' } },
        { period_name: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } },
      ];
    }

    const total = await SalesForecast.countDocuments(query);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const forecasts = await SalesForecast.find(query)
      .sort(sort)
      .skip((parseInt(page, 10) - 1) * parseInt(limit, 10))
      .limit(parseInt(limit, 10))
      .lean();

    res.json({
      success: true,
      data: forecasts,
      meta: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error('getForecasts Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. GET FORECAST STATS & AGGREGATED METRICS
exports.getForecastStats = async (req, res) => {
  try {
    await ensureSampleForecasts();

    const forecasts = await SalesForecast.find({ is_deleted: false }).lean();

    let totalTargetRevenue = 0;
    let totalProjectedRevenue = 0;
    let totalActualRevenue = 0;
    let totalWeightedPipeline = 0;
    let totalProjectedUnits = 0;
    let totalEstimatedFabricKg = 0;

    const quarterlyData = [];
    const categoryBreakdown = {};
    const territoryBreakdown = {};

    forecasts.forEach((f) => {
      totalTargetRevenue += Number(f.target_revenue || 0);
      totalProjectedRevenue += Number(f.projected_revenue || 0);
      totalActualRevenue += Number(f.actual_revenue || 0);
      totalWeightedPipeline += Number(f.weighted_pipeline_revenue || 0);
      totalProjectedUnits += Number(f.projected_units || 0);
      totalEstimatedFabricKg += Number(f.estimated_fabric_kg || 0);

      quarterlyData.push({
        id: f._id,
        code: f.forecast_code,
        period: f.period_name,
        season: f.season,
        target_revenue: f.target_revenue,
        projected_revenue: f.projected_revenue,
        actual_revenue: f.actual_revenue,
        projected_units: f.projected_units,
        estimated_fabric_kg: f.estimated_fabric_kg,
        confidence: f.confidence_level,
        status: f.status,
      });

      // Categories
      (f.category_forecasts || []).forEach((c) => {
        if (!categoryBreakdown[c.category]) {
          categoryBreakdown[c.category] = {
            category: c.category,
            label: c.category_label,
            total_projected_units: 0,
            total_projected_revenue: 0,
            fabric_type: c.fabric_type,
            total_fabric_kg: 0,
          };
        }
        categoryBreakdown[c.category].total_projected_units += Number(c.projected_units || 0);
        categoryBreakdown[c.category].total_projected_revenue += Number(c.projected_revenue || 0);
        categoryBreakdown[c.category].total_fabric_kg += Number(c.fabric_required_kg || 0);
      });

      // Territories
      (f.territory_forecasts || []).forEach((t) => {
        if (!territoryBreakdown[t.region]) {
          territoryBreakdown[t.region] = {
            region: t.region,
            target_revenue: 0,
            projected_revenue: 0,
            key_accounts_count: 0,
            outlook: t.growth_outlook,
          };
        }
        territoryBreakdown[t.region].target_revenue += Number(t.target_revenue || 0);
        territoryBreakdown[t.region].projected_revenue += Number(t.projected_revenue || 0);
        territoryBreakdown[t.region].key_accounts_count = Math.max(
          territoryBreakdown[t.region].key_accounts_count,
          Number(t.key_accounts_count || 0)
        );
      });
    });

    const revenueGrowthPct =
      totalTargetRevenue > 0
        ? (((totalProjectedRevenue - totalTargetRevenue) / totalTargetRevenue) * 100).toFixed(1)
        : 0;

    const pipelineCoverageRatio =
      totalProjectedRevenue > 0
        ? ((totalWeightedPipeline / totalProjectedRevenue) * 100).toFixed(1)
        : 0;

    res.json({
      success: true,
      data: {
        totalTargetRevenue,
        totalProjectedRevenue,
        totalActualRevenue,
        totalWeightedPipeline,
        totalProjectedUnits,
        totalEstimatedFabricKg,
        revenueGrowthPct: Number(revenueGrowthPct),
        pipelineCoverageRatio: Number(pipelineCoverageRatio),
        quarterlyData,
        categories: Object.values(categoryBreakdown),
        territories: Object.values(territoryBreakdown),
      },
    });
  } catch (err) {
    console.error('getForecastStats Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. GET FORECAST BY ID
exports.getForecastById = async (req, res) => {
  try {
    const forecast = await SalesForecast.findOne({ _id: req.params.id, is_deleted: false });
    if (!forecast) {
      return res.status(404).json({ success: false, message: 'Sales forecast plan not found.' });
    }
    res.json({ success: true, data: forecast });
  } catch (err) {
    console.error('getForecastById Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. CREATE NEW FORECAST PLAN
exports.createForecast = async (req, res) => {
  try {
    const {
      title,
      financial_year,
      period_type,
      period_name,
      season,
      confidence_level,
      target_revenue,
      projected_revenue,
      target_units,
      projected_units,
      estimated_fabric_kg,
      category_forecasts,
      territory_forecasts,
      notes,
    } = req.body;

    if (!title || !period_name || !target_revenue) {
      return res.status(400).json({
        success: false,
        message: 'Title, period name, and target revenue are required.',
      });
    }

    const newForecast = new SalesForecast({
      title: title.trim(),
      financial_year: financial_year || '2026-2027',
      period_type: period_type || 'quarterly',
      period_name: period_name.trim(),
      season: season || 'regular',
      confidence_level: confidence_level || 'realistic',
      target_revenue: Number(target_revenue || 0),
      projected_revenue: Number(projected_revenue || target_revenue || 0),
      target_units: Number(target_units || 0),
      projected_units: Number(projected_units || target_units || 0),
      estimated_fabric_kg: Number(estimated_fabric_kg || 0),
      category_forecasts: Array.isArray(category_forecasts) ? category_forecasts : [],
      territory_forecasts: Array.isArray(territory_forecasts) ? territory_forecasts : [],
      notes: notes ? notes.trim() : '',
      created_by: req.user?.name || 'Sales Strategy Team',
    });

    const saved = await newForecast.save();
    res.status(201).json({
      success: true,
      message: 'Sales forecast plan created successfully.',
      data: saved,
    });
  } catch (err) {
    console.error('createForecast Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. UPDATE FORECAST
exports.updateForecast = async (req, res) => {
  try {
    const forecast = await SalesForecast.findOne({ _id: req.params.id, is_deleted: false });
    if (!forecast) {
      return res.status(404).json({ success: false, message: 'Sales forecast plan not found.' });
    }

    const fields = [
      'title',
      'financial_year',
      'period_type',
      'period_name',
      'season',
      'confidence_level',
      'target_revenue',
      'projected_revenue',
      'actual_revenue',
      'weighted_pipeline_revenue',
      'target_units',
      'projected_units',
      'actual_units',
      'estimated_fabric_kg',
      'category_forecasts',
      'territory_forecasts',
      'status',
      'notes',
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        forecast[f] = req.body[f];
      }
    });

    const updated = await forecast.save();
    res.json({
      success: true,
      message: 'Sales forecast plan updated successfully.',
      data: updated,
    });
  } catch (err) {
    console.error('updateForecast Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6. DELETE FORECAST (SOFT DELETE)
exports.deleteForecast = async (req, res) => {
  try {
    const forecast = await SalesForecast.findOne({ _id: req.params.id, is_deleted: false });
    if (!forecast) {
      return res.status(404).json({ success: false, message: 'Sales forecast plan not found.' });
    }

    forecast.is_deleted = true;
    await forecast.save();

    res.json({ success: true, message: 'Sales forecast plan archived successfully.' });
  } catch (err) {
    console.error('deleteForecast Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 7. INTERACTIVE "WHAT-IF" SIMULATION CALCULATOR
exports.simulateGrowth = async (req, res) => {
  try {
    const { growth_rate_pct = 15 } = req.body;
    const rate = Number(growth_rate_pct);

    const forecasts = await SalesForecast.find({ is_deleted: false }).lean();

    let baselineRevenue = 0;
    let baselineUnits = 0;
    let baselineFabricKg = 0;

    forecasts.forEach((f) => {
      baselineRevenue += Number(f.projected_revenue || 0);
      baselineUnits += Number(f.projected_units || 0);
      baselineFabricKg += Number(f.estimated_fabric_kg || 0);
    });

    const multiplier = 1 + rate / 100;
    const simulatedRevenue = Math.round(baselineRevenue * multiplier);
    const simulatedUnits = Math.round(baselineUnits * multiplier);
    const simulatedFabricKg = Math.round(baselineFabricKg * multiplier);

    // Factory capacity estimate (Assume factory max single-shift capacity = 200,000 pcs / year)
    const annualCapacity = 200000;
    const capacityUtilizationPct = ((simulatedUnits / annualCapacity) * 100).toFixed(1);

    res.json({
      success: true,
      data: {
        growth_rate_pct: rate,
        baselineRevenue,
        simulatedRevenue,
        revenueDelta: simulatedRevenue - baselineRevenue,
        baselineUnits,
        simulatedUnits,
        unitsDelta: simulatedUnits - baselineUnits,
        baselineFabricKg,
        simulatedFabricKg,
        fabricKgDelta: simulatedFabricKg - baselineFabricKg,
        capacityUtilizationPct: Number(capacityUtilizationPct),
      },
    });
  } catch (err) {
    console.error('simulateGrowth Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
