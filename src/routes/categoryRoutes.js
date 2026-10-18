const express = require('express');
const categoryController = require('../controllers/categoryController');
const authenticate = require('../middleware/authenticate');
const requireAdmin = require('../middleware/requireAdmin');
const validate = require('../middleware/validate');
const {
  createCategorySchema,
  updateCategorySchema,
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
  validate({ params: categoryIdParamsSchema, body: updateCategorySchema }),
  categoryController.updateCategory,
);
router.delete(
  '/:categoryId',
  authenticate,
  requireAdmin,
  validate({ params: categoryIdParamsSchema }),
  categoryController.deleteCategory,
);

module.exports = router;
