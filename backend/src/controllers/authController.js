const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'danzason_erp_jwt_secret_token_2026_secure';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

// Seed default administrator if no users exist
async function ensureDefaultAdmin() {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      await User.create({
        name: 'Danza Son Admin',
        email: 'admin@danzason.com',
        password: 'Admin@123',
        phone: '9876543210',
        role: 'admin',
        department: 'Management & Admin',
        is_active: true,
      });
      console.log('🌱 Default Admin user seeded: admin@danzason.com / Admin@123');
    }
  } catch (err) {
    console.error('ensureDefaultAdmin error:', err.message);
  }
}

// 1. SIGNUP / REGISTER
exports.signup = async (req, res) => {
  try {
    await ensureDefaultAdmin();

    const { name, email, password, phone, role, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.',
      });
    }

    // Determine initial role (if it's the first registered user, make them admin, otherwise specified role or staff)
    const userCount = await User.countDocuments();
    const assignedRole = userCount === 0 ? 'admin' : (role || 'admin');

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      phone: (phone || '').trim(),
      role: assignedRole,
      department: (department || 'Sales & CRM').trim(),
      last_login: new Date(),
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to Danza Son ERP.',
      token,
      data: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        is_active: user.is_active,
        last_login: user.last_login,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error occurred during signup.',
    });
  }
};

// 2. LOGIN
exports.login = async (req, res) => {
  try {
    await ensureDefaultAdmin();

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Find user with password included for verification
    const user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact the administrator.',
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials.',
      });
    }

    // Update last login timestamp
    user.last_login = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      data: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        is_active: user.is_active,
        last_login: user.last_login,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error occurred during login.',
    });
  }
};

// 3. GET CURRENT USER PROFILE
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. UPDATE CURRENT USER PROFILE
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { name, phone, department, currentPassword, newPassword } = req.body;

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (department) user.department = department.trim();

    // If updating password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password.',
        });
      }

      const userWithPassword = await User.findById(req.user.id).select('+password');
      const isMatch = await userWithPassword.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect.',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long.',
        });
      }

      user.password = newPassword;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        is_active: user.is_active,
      },
    });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper for initial server boot
exports.ensureDefaultAdmin = ensureDefaultAdmin;
