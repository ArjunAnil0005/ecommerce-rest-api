const categoryService = require('../services/categoryService');
const asyncHandler = require('../utils/asyncHandler');

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.validated.body);
  res.status(201).json({ success: true, data: { category } });
});

const listCategories = asyncHandler(async (req, res) => {
  const includeInactive = req.user?.role === 'admin';
  const result = await categoryService.listCategories(
    req.validated.query,
    includeInactive,
  );
  res.status(200).json({
    success: true,
    data: result.categories,
    meta: result.meta,
  });
});

const getCategoryTree = asyncHandler(async (req, res) => {
  const includeInactive = req.user?.role === 'admin';
  const categories = await categoryService.getCategoryTree(includeInactive);
  res.status(200).json({ success: true, data: categories });
});

const getCategoryById = asyncHandler(async (req, res) => {
  const includeInactive = req.user?.role === 'admin';
  const category = await categoryService.getCategoryById(
    req.validated.params.categoryId,
    includeInactive,
  );
  res.status(200).json({ success: true, data: { category } });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(
    req.validated.params.categoryId,
    req.validated.body,
  );
  res.status(200).json({ success: true, data: { category } });
});

const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.validated.params.categoryId);
  res.status(204).send();
});

module.exports = {
  createCategory,
  listCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
