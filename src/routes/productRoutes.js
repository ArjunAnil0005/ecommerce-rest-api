const express = require('express');
const productController = require('../controllers/productController');
const authenticate = require('../middleware/authenticate');
const requireAdmin = require('../middleware/requireAdmin');
const validate = require('../middleware/validate');
const {
  createProductSchema,
  updateProductSchema,
  productIdParamsSchema,
  productListQuerySchema,
} = require('../validation/productSchemas');

const router = express.Router();

router.get(
  '/admin/products',
  authenticate,
  requireAdmin,
  validate({ query: productListQuerySchema }),
  productController.listAdminProducts,
);
router.get(
  '/products',
  validate({ query: productListQuerySchema }),
  productController.listProducts,
);
router.get(
  '/products/:productId',
  validate({ params: productIdParamsSchema }),
  productController.getProduct,
);
router.post(
  '/products',
  authenticate,
  requireAdmin,
  validate({ body: createProductSchema }),
  productController.createProduct,
);
router.patch(
  '/products/:productId',
  authenticate,
  requireAdmin,
  validate({ params: productIdParamsSchema, body: updateProductSchema }),
  productController.updateProduct,
);
router.delete(
  '/products/:productId',
  authenticate,
  requireAdmin,
  validate({ params: productIdParamsSchema }),
  productController.deleteProduct,
);

module.exports = router;
