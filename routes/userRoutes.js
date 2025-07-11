const express = require('express');
const router = express.Router();
const { createUser, toggleUserStatuses,getDistance,getUserListingByWeekday } = require('../controllers/userController');
const authenticate = require('../middleware/auth');

router.post('/register', createUser);
router.put('/toggle-status', authenticate, toggleUserStatuses);
router.get('/distance', authenticate, getDistance);
router.get('/listing', authenticate, getUserListingByWeekday);

module.exports = router;
