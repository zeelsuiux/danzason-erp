const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');

// Masters & Role Templates
router.get('/masters', teamController.getRolesMasters);

// Departments Master CRUD (Managed from Settings)
router.get('/departments', teamController.getDepartments);
router.post('/departments', teamController.createDepartment);
router.put('/departments/:id', teamController.updateDepartment);
router.delete('/departments/:id', teamController.deleteDepartment);

// Performance Report & Hierarchy Rollup
router.get('/performance', teamController.getPerformanceReport);

// Team Members CRUD
router.get('/', teamController.getTeamMembers);
router.get('/:id', teamController.getTeamMemberById);
router.post('/', teamController.createTeamMember);
router.put('/:id', teamController.updateTeamMember);
router.delete('/:id', teamController.deleteTeamMember);

module.exports = router;
