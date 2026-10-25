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

// Hierarchy Levels Master CRUD (Managed from Settings)
router.get('/hierarchy', teamController.getHierarchyLevels);
router.post('/hierarchy', teamController.createHierarchyLevel);
router.put('/hierarchy/:id', teamController.updateHierarchyLevel);
router.put('/hierarchy', teamController.updateHierarchyLevel);
router.delete('/hierarchy/:id', teamController.deleteHierarchyLevel);
router.delete('/hierarchy', teamController.deleteHierarchyLevel);

// Performance Report & Hierarchy Rollup
router.get('/performance', teamController.getPerformanceReport);

// Team Members CRUD
router.get('/', teamController.getTeamMembers);
router.get('/:id', teamController.getTeamMemberById);
router.post('/', teamController.createTeamMember);
router.put('/:id', teamController.updateTeamMember);
router.delete('/:id', teamController.deleteTeamMember);

module.exports = router;
