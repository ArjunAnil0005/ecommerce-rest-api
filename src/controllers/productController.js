const productService = require('../services/productService');
const asyncHandler = require('../utils/asyncHandler');

const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.validated.body);
  res.status(201).json({ success: true, data: { product } });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(
    req.validated.params.productId,
  );
  res.status(200).json({ success: true, data: { product } });
});

const listProducts = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.validated.query);
  res.status(200).json({
    success: true,
    data: result.products,
    meta: result.meta,
  });
});

const listAdminProducts = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.validated.query, true);
  res.status(200).json({
    success: true,
    data: result.products,
    meta: result.meta,
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(
    req.validated.params.productId,
    req.validated.body,
  );
  res.status(200).json({ success: true, data: { product } });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await productService.deactivateProduct(
    req.validated.params.productId,
  );
  res.status(200).json({ success: true, data: { product } });
});

module.exports = {
  createProduct,
  getProduct,
  listProducts,
  listAdminProducts,
  updateProduct,
  deleteProduct,
};
