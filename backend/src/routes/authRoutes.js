const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public Auth Routes (POST for Authentication)
router.post('/signup', authController.signup);
router.post('/register', authController.signup);
router.post('/login', authController.login);

// Friendly Browser / GET Handlers (Redirects to frontend UI if configured, or returns JSON info)
router.get('/login', (req, res) => {
  if (req.accepts('html') && process.env.CLIENT_URL) {
    return res.redirect(`${process.env.CLIENT_URL}/login`);
  }
  res.json({
    success: true,
    message: 'Danza Son Auth Login API. Send a POST request with JSON body { email, password } to log in.',
  });
});

router.get('/signup', (req, res) => {
  if (req.accepts('html') && process.env.CLIENT_URL) {
    return res.redirect(`${process.env.CLIENT_URL}/signup`);
  }
  res.json({
    success: true,
    message: 'Danza Son Auth Signup API. Send a POST request with JSON body { name, email, password, phone, department, role } to register.',
  });
});

router.get('/register', (req, res) => {
  res.redirect(301, '/api/v1/auth/signup');
});

// Protected Profile Routes
router.get('/me', protect, authController.getMe);
router.get('/profile', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);

module.exports = router;
