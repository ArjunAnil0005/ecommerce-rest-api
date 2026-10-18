const categoryService = require('../services/categoryService');
const asyncHandler = require('../utils/asyncHandler');

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.validated.body);
  res.status(201).json({ success: true, data: { category } });
});

const getCategoryTree = asyncHandler(async (_req, res) => {
  const categories = await categoryService.getCategoryTree();
  res.status(200).json({ success: true, data: categories });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(
    req.validated.params.categoryId,
    req.validated.body,
  );
  res.status(200).json({ success: true, data: { category } });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.deleteCategory(
    req.validated.params.categoryId,
  );
  res.status(200).json({ success: true, data: { category } });
});

module.exports = {
  createCategory,
  getCategoryTree,
  updateCategory,
  deleteCategory,
};
