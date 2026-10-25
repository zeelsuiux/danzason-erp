const mongoose = require('mongoose');
const { getNextSequence } = require('./Counter');

const timelineItemSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: Date.now,
    },
    type: {
      type: String,
      enum: [
        'status_change',
        'customer_call',
        'whatsapp_chat',
        'internal_note',
        'factory_qc',
        'resolution_proposed',
        'resolved',
      ],
      default: 'internal_note',
    },
    author: {
      type: String,
      default: 'Customer Service Team',
      trim: true,
    },
    notes: {
      type: String,
      required: true,
      trim: true,
    },
    customer_feedback: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true, timestamps: true }
);

const complaintSchema = new mongoose.Schema(
  {
    ticket_number: {
      type: String,
      unique: true,
      trim: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    customer_name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    company_name: {
      type: String,
      default: '',
      trim: true,
    },
    contact_person: {
      type: String,
      default: '',
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required for SMS/WhatsApp updates'],
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    channel: {
      type: String,
      enum: ['phone', 'whatsapp', 'email', 'in_person', 'portal', 'sales_rep'],
      default: 'phone',
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesOrder',
      default: null,
    },
    so_number: {
      type: String,
      default: '',
      trim: true,
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesInvoice',
      default: null,
    },
    invoice_number: {
      type: String,
      default: '',
      trim: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    product_name: {
      type: String,
      default: '',
      trim: true,
    },
    batch_or_lot_number: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'fabric_quality',
        'stitching_defect',
        'printing_embroidery',
        'quantity_shortage',
        'delivery_delay',
        'billing_payment',
        'packaging_labeling',
        'other',
      ],
      default: 'fabric_quality',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Defect description is required'],
      trim: true,
    },
    defective_quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    affected_order_value: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        'open',
        'pending',
        'in_investigation',
        'in_process',
        'action_proposed',
        'resolved',
        'solved',
        'closed',
        'rejected',
        'cancelled',
      ],
      default: 'open',
    },
    assigned_to: {
      type: String,
      default: 'Unassigned',
      trim: true,
    },
    assigned_to_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeamMember',
      default: null,
    },
    assigned_at: {
      type: Date,
      default: null,
    },
    sla_due_date: {
      type: Date,
      default: null,
    },
    resolution: {
      resolution_type: {
        type: String,
        enum: [
          'none',
          'replacement',
          'credit_note',
          'repair_alteration',
          'discount_next_order',
          'refund',
          'explanation_only',
        ],
        default: 'none',
      },
      resolution_notes: {
        type: String,
        default: '',
        trim: true,
      },
      compensation_amount: {
        type: Number,
        default: 0,
        min: 0,
      },
      replacement_order_number: {
        type: String,
        default: '',
        trim: true,
      },
      credit_note_number: {
        type: String,
        default: '',
        trim: true,
      },
      resolved_by: {
        type: String,
        default: '',
        trim: true,
      },
      resolved_at: {
        type: Date,
        default: null,
      },
    },
    timeline: [timelineItemSchema],
    created_by: {
      type: String,
      default: 'Customer Service',
      trim: true,
    },
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

// Auto-generate ticket number and SLA due date
complaintSchema.pre('save', async function (next) {
  if (this.isNew && !this.ticket_number) {
    const year = new Date().getFullYear();
    const seq = await getNextSequence(`ticket_${year}`, 'Complaint', 'ticket_number');
    this.ticket_number = `TKT-${year}-${String(seq).padStart(5, '0')}`;
  }

  // Calculate default SLA based on priority if not manually assigned
  if (this.isNew && !this.sla_due_date) {
    const hoursMap = {
      critical: 24, // 24 hours for critical order rejections
      high: 48,     // 48 hours for major complaints
      medium: 72,   // 3 days
      low: 120,     // 5 days
    };
    const hours = hoursMap[this.priority] || 72;
    this.sla_due_date = new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  next();
});

complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ customer_name: 'text', subject: 'text', ticket_number: 'text' });
complaintSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
