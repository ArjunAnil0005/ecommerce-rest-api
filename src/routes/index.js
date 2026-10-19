const express = require('express');
const authRoutes = require('./authRoutes');
const categoryRoutes = require('./categoryRoutes');
const orderRoutes = require('./orderRoutes');
const productRoutes = require('./productRoutes');
const userRoutes = require('./userRoutes');
const healthController = require('../controllers/healthController');
const readinessController = require('../controllers/readinessController');

const router = express.Router();

router.get('/health', healthController.getHealth);
router.get('/ready', readinessController.getReadiness);
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/', productRoutes);
router.use('/users', userRoutes);

module.exports = router;
