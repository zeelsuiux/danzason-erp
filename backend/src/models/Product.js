const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    product_name: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    product_code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    sku_id: {
      type: String,
      trim: true,
      default: '',
    },
    sku: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupplierCategory',
      default: null,
    },
    category: {
      type: String,
      default: 'T-SHIRT',
      trim: true,
      uppercase: true,
    },
    product_type: {
      type: String,
      default: 'apparel',
    },
    types: {
      type: [String],
      default: ['B2B', 'B2C'],
    },
    uom: {
      type: String,
      default: 'PCS',
    },
    purchase_rate: {
      type: Number,
      default: 0,
    },
    cost_rate: {
      type: Number,
      default: 0,
    },
    pricing_rule: {
      method: {
        type: String,
        enum: ['markup', 'margin'],
        default: 'markup',
      },
      value: {
        type: Number,
        default: 20,
      },
      last_purchase_rate: {
        type: Number,
        default: 0,
      },
      suggested_sales_rate: {
        type: Number,
        default: 0,
      },
      auto_update_suggested: {
        type: Boolean,
        default: true,
      },
    },
    selling_rate: {
      type: Number,
      default: 0,
    },
    b2b_price: {
      type: Number,
      default: 0,
    },
    b2c_price: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      default: 0,
    },
    mrp: {
      type: Number,
      default: 0,
    },
    discount_percent: {
      type: Number,
      default: 0,
    },
    variant_count: {
      type: Number,
      default: 0,
    },
    gst_rate: {
      type: Number,
      default: 5,
    },
    hsn_code: {
      type: String,
      default: '6109',
      trim: true,
    },
    current_stock: {
      type: Number,
      default: 100,
    },
    reorder_level: {
      type: Number,
      default: 20,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    sort_order: {
      type: Number,
      default: 99,
    },
    is_featured: {
      type: Boolean,
      default: false,
    },
    is_new: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String,
      default: '',
    },
    images: {
      type: [String],
      default: [],
    },
    colors: [
      {
        name: { type: String, default: '' },
        hex: { type: String, default: '#000000' },
        image: { type: String, default: '' },
      },
    ],
    variants: [
      {
        variant_name: { type: String, default: '' },
        color: { type: String, default: '' },
        color_code: { type: String, default: '#000000' },
        size: { type: String, default: '' },
        sizes: { type: [String], default: ['S', 'M', 'L', 'XL', '2XL'] },
        sku: { type: String, default: '' },
        price: { type: Number, default: 0 },
        b2b_price: { type: Number, default: 0 },
        b2c_price: { type: Number, default: 0 },
        mrp: { type: Number, default: 0 },
        stock: { type: Number, default: 0 },
        image: { type: String, default: '' },
        attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook
productSchema.pre('save', function (next) {
  if (!this.title && this.product_name) {
    this.title = this.product_name;
  } else if (!this.product_name && this.title) {
    this.product_name = this.title;
  }

  if (!this.sku_id && this.product_code) {
    this.sku_id = this.product_code;
  } else if (!this.product_code && this.sku_id) {
    this.product_code = this.sku_id;
  }

  if (!this.sku && (this.sku_id || this.product_code)) {
    this.sku = this.sku_id || this.product_code;
  }

  if (!this.price && this.selling_rate) {
    this.price = this.selling_rate;
  } else if (!this.selling_rate && this.price) {
    this.selling_rate = this.price;
  }

  if (!this.b2b_price) {
    this.b2b_price = this.selling_rate || this.price || 0;
  }
  if (!this.b2c_price) {
    this.b2c_price = this.mrp || (this.b2b_price ? Math.round(this.b2b_price * 1.35) : 0);
  }

  if (Array.isArray(this.variants)) {
    this.variants.forEach((v) => {
      if (!v.b2b_price) {
        v.b2b_price = v.price || this.b2b_price || 0;
      }
      if (!v.b2c_price) {
        v.b2c_price = v.mrp || (v.b2b_price ? Math.round(v.b2b_price * 1.35) : 0);
      }
    });
  }

  if (this.mrp && this.price && (!this.discount_percent || this.discount_percent === 0)) {
    if (this.mrp > this.price) {
      this.discount_percent = Math.round(((this.mrp - this.price) / this.mrp) * 100);
    }
  }

  if (!this.variant_count && this.variants && this.variants.length > 0) {
    this.variant_count = this.variants.length;
  }

  if (this.category) {
    this.category = this.category.toUpperCase().trim();
  }

  next();
});

module.exports = mongoose.model('Product', productSchema);
