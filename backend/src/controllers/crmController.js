const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const SalesOrder = require('../models/SalesOrder');
const Product = require('../models/Product');

/**
 * GET /api/admin/users/list
 */
exports.getUsersList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      search_by = 'all',
      status = 'active',
    } = req.query;

    const query = { is_deleted: false };

    // Status / Customer Type filter
    if (status && status !== 'all') {
      if (['B2B', 'B2C', 'Distributor', 'Wholesaler', 'Retailer'].includes(status)) {
        query.customer_type = status;
      } else if (['active', 'inactive'].includes(status)) {
        query.status = status;
      }
    }

    if (search && search.trim() !== '') {
      const s = search.trim();
      const regex = new RegExp(s, 'i');

      if (search_by === 'name') {
        query.$or = [{ customer_name: regex }, { contact_person: regex }];
      } else if (search_by === 'number' || search_by === 'phone') {
        query.phone = regex;
      } else if (search_by === 'email') {
        query.email = regex;
      } else {
        query.$or = [
          { customer_name: regex },
          { contact_person: regex },
          { phone: regex },
          { email: regex },
          { customer_code: regex },
        ];
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Customer.countDocuments(query),
    ]);

    const formattedUsers = users.map((u) => {
      const obj = u.toObject();
      return {
        ...obj,
        id: obj._id,
        name: obj.customer_name,
        number: obj.phone,
        addresses: obj.shipping_address ? [obj.shipping_address, obj.billing_address].filter(Boolean) : [],
        active_sessions: [],
      };
    });

    res.json({
      success: true,
      message: 'Users fetched successfully',
      data: formattedUsers,
      users: formattedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      total,
    });
  } catch (error) {
    console.error('Error fetching CRM users:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/users/:id
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid User ID' });
    }

    const customer = await Customer.findOne({ _id: id, is_deleted: false });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const obj = customer.toObject();
    const formattedUser = {
      ...obj,
      id: obj._id,
      name: obj.customer_name,
      number: obj.phone,
      addresses: [
        { type: 'billing', ...obj.billing_address },
        { type: 'shipping', ...obj.shipping_address },
      ].filter((a) => a.city || a.address_line1),
      active_sessions: [
        {
          device: 'Web Browser',
          ip_address: req.ip || '127.0.0.1',
          last_active: new Date(),
        },
      ],
    };

    res.json({
      success: true,
      message: 'User details fetched successfully',
      data: formattedUser,
      user: formattedUser,
    });
  } catch (error) {
    console.error('Error fetching CRM user by ID:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/order-request
 */
exports.getOrderRequestsList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      product_id,
      user_id,
    } = req.query;

    const query = { is_deleted: false };

    if (status && status !== 'all') {
      query.$or = [{ status: status }, { order_status: status }];
    }

    if (user_id && mongoose.Types.ObjectId.isValid(user_id)) {
      query.customer_id = new mongoose.Types.ObjectId(user_id);
    }

    if (product_id && mongoose.Types.ObjectId.isValid(product_id)) {
      query['items.product_id'] = new mongoose.Types.ObjectId(product_id);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      SalesOrder.find(query)
        .populate('customer_id')
        .populate('items.product_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SalesOrder.countDocuments(query),
    ]);

    const formattedOrders = orders.map((o) => {
      const obj = o.toObject();
      const resolvedStatus = obj.status || obj.order_status || 'pending';
      return {
        ...obj,
        id: obj._id,
        user_id: obj.customer_id?._id || obj.customer_id,
        user_name: obj.customer_id?.customer_name || obj.customer_name,
        status: resolvedStatus,
        order_status: resolvedStatus,
      };
    });

    res.json({
      success: true,
      message: 'Order requests fetched successfully',
      data: formattedOrders,
      order_requests: formattedOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      total,
    });
  } catch (error) {
    console.error('Error fetching CRM order requests:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/order-request/:id
 */
exports.getOrderRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Order Request ID' });
    }

    const order = await SalesOrder.findOne({ _id: id, is_deleted: false })
      .populate('customer_id')
      .populate('items.product_id');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order request not found' });
    }

    const obj = order.toObject();
    const resolvedStatus = obj.status || obj.order_status || 'pending';
    const formattedOrder = {
      ...obj,
      id: obj._id,
      user_id: obj.customer_id?._id || obj.customer_id,
      user_name: obj.customer_id?.customer_name || obj.customer_name,
      status: resolvedStatus,
      order_status: resolvedStatus,
    };

    res.json({
      success: true,
      message: 'Order request retrieved successfully',
      data: formattedOrder,
      order_request: formattedOrder,
    });
  } catch (error) {
    console.error('Error fetching CRM order request by ID:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
