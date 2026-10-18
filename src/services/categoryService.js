const mongoose = require('mongoose');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const buildCategoryTree = require('../utils/buildCategoryTree');

function assertValidCategoryId(categoryId) {
  if (!mongoose.isValidObjectId(categoryId)) {
    throw new ApiError(400, 'Invalid category id');
  }
}

function handleDuplicateName(error) {
  if (error.code === 11000) {
    throw new ApiError(
      409,
      'A category with this name already exists under that parent',
    );
  }
  throw error;
}

async function createCategory({ name, parent = null }) {
  const ancestors = [];

  if (parent) {
    assertValidCategoryId(parent);
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) throw new ApiError(404, 'Parent category not found');
    ancestors.push(...parentCategory.ancestors, parentCategory._id);
  }

  try {
    return await Category.create({ name, parent, ancestors });
  } catch (error) {
    handleDuplicateName(error);
  }
}

async function getCategoryTree() {
  const categories = await Category.find().sort({ name: 1 }).lean();
  return buildCategoryTree(categories);
}

async function moveCategory(categoryId, parentId) {
  assertValidCategoryId(categoryId);
  if (parentId) assertValidCategoryId(parentId);

  const session = await mongoose.startSession();

  try {
    let movedCategory;

    await session.withTransaction(async () => {
      const category = await Category.findById(categoryId).session(session);
      if (!category) throw new ApiError(404, 'Category not found');

      const newParent = parentId
        ? await Category.findById(parentId).session(session)
        : null;
      if (parentId && !newParent) {
        throw new ApiError(404, 'Parent category not found');
      }

      if (
        newParent &&
        (newParent._id.equals(category._id) ||
          newParent.ancestors.some((ancestorId) =>
            ancestorId.equals(category._id),
          ))
      ) {
        throw new ApiError(
          400,
          'A category cannot be moved under itself or one of its descendants',
        );
      }

      const newAncestors = newParent
        ? [...newParent.ancestors, newParent._id]
        : [];
      const descendants = await Category.find({
        ancestors: category._id,
      }).session(session);

      for (const descendant of descendants) {
        const categoryPosition = descendant.ancestors.findIndex((ancestorId) =>
          ancestorId.equals(category._id),
        );
        descendant.ancestors = [
          ...newAncestors,
          category._id,
          ...descendant.ancestors.slice(categoryPosition + 1),
        ];
        await descendant.save({ session });
      }

      category.parent = newParent ? newParent._id : null;
      category.ancestors = newAncestors;
      movedCategory = await category.save({ session });
    });

    return movedCategory;
  } catch (error) {
    if (
      error.code === 20 ||
      error.message?.includes(
        'Transaction numbers are only allowed on a replica set member',
      )
    ) {
      throw new ApiError(
        503,
        'Category moves require MongoDB to run as a replica set',
      );
    }
    handleDuplicateName(error);
  } finally {
    await session.endSession();
  }
}

module.exports = { createCategory, getCategoryTree, moveCategory };
