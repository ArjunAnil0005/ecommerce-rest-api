const express = require('express');
const categoryController = require('../controllers/categoryController');
const authenticate = require('../middleware/authenticate');
const requireAdmin = require('../middleware/requireAdmin');
const validate = require('../middleware/validate');
const {
  createCategorySchema,
  moveCategorySchema,
  categoryIdParamsSchema,
} = require('../validation/categorySchemas');

const router = express.Router();

router.get('/tree', categoryController.getCategoryTree);
router.post(
  '/',
  authenticate,
  requireAdmin,
  validate({ body: createCategorySchema }),
  categoryController.createCategory,
);
router.patch(
  '/:categoryId',
  authenticate,
  requireAdmin,
  validate({ params: categoryIdParamsSchema, body: moveCategorySchema }),
  categoryController.moveCategory,
);

module.exports = router;
