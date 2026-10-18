const mongoose = require('mongoose');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const buildCategoryTree = require('../utils/buildCategoryTree');

function makeSlug(name) {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'category';
}

function assertValidCategoryId(categoryId) {
  if (!mongoose.isValidObjectId(categoryId)) {
    throw new ApiError(400, 'Invalid category id');
  }
}

function isVisible(category, categoriesById) {
  if (!category.isActive) return false;
  // A category is hidden if any ancestor is inactive or missing.
  return category.ancestors.every(
    (ancestorId) => categoriesById.get(String(ancestorId))?.isActive,
  );
}

async function getCategories(includeInactive = false) {
  const categories = await Category.find().sort({ name: 1 }).lean();
  if (includeInactive) return categories;

  const categoriesById = new Map(
    categories.map((category) => [String(category._id), category]),
  );

  return categories.filter((category) => isVisible(category, categoriesById));
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

async function createCategory({ name, parent = null, isActive = true }) {
  let ancestors = [];

  if (parent) {
    assertValidCategoryId(parent);
    const parentCategory = await Category.findById(parent);
    if (!parentCategory || !parentCategory.isActive) {
      throw new ApiError(404, 'Active parent category not found');
    }
    ancestors = [...parentCategory.ancestors, parentCategory._id];
  }

  try {
    return await Category.create({
      name,
      slug: makeSlug(name),
      parent,
      ancestors,
      isActive,
    });
  } catch (error) {
    handleDuplicateName(error);
  }
}

async function listCategories(query, includeInactive) {
  let categories = await getCategories(includeInactive);

  if (query.parent === 'null') {
    categories = categories.filter((category) => category.parent === null);
  } else if (query.parent) {
    categories = categories.filter(
      (category) => String(category.parent) === query.parent,
    );
  }

  if (query.isActive !== undefined) {
    const isActive = query.isActive === 'true';
    categories = categories.filter(
      (category) => category.isActive === isActive,
    );
  }

  if (query.search) {
    const escapedSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchPattern = new RegExp(escapedSearch, 'i');
    categories = categories.filter((category) =>
      searchPattern.test(category.name),
    );
  }

  const total = categories.length;
  const start = (query.page - 1) * query.limit;
  const pageCategories = categories.slice(start, start + query.limit);

  return {
    categories: pageCategories,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
}

async function getCategoryById(categoryId, includeInactive) {
  assertValidCategoryId(categoryId);
  const categories = await getCategories(includeInactive);
  const category = categories.find((item) => String(item._id) === categoryId);

  if (!category) throw new ApiError(404, 'Category not found');

  const children = categories.filter(
    (item) => String(item.parent) === categoryId,
  );
  return { ...category, children };
}

async function getCategoryTree(includeInactive) {
  const categories = await getCategories(includeInactive);
  return buildCategoryTree(categories);
}

async function updateCategory(categoryId, updates) {
  assertValidCategoryId(categoryId);
  if (updates.parent) assertValidCategoryId(updates.parent);

  const session = await mongoose.startSession();

  try {
    let updatedCategory;

    // Save the moved category and all descendants as one database change.
    await session.withTransaction(async () => {
      const category = await Category.findById(categoryId).session(session);
      if (!category) throw new ApiError(404, 'Category not found');

      if (
        Object.hasOwn(updates, 'parent') &&
        String(updates.parent || '') !== String(category.parent || '')
      ) {
        const newParent = updates.parent
          ? await Category.findById(updates.parent).session(session)
          : null;

        if (updates.parent && (!newParent || !newParent.isActive)) {
          throw new ApiError(404, 'Active parent category not found');
        }

        if (
          newParent &&
          (newParent._id.equals(category._id) ||
            newParent.ancestors.some((id) => id.equals(category._id)))
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
          const categoryPosition = descendant.ancestors.findIndex((id) =>
            id.equals(category._id),
          );
          // Keep the moved category and lower ancestors after the new path.
          descendant.ancestors = [
            ...newAncestors,
            category._id,
            ...descendant.ancestors.slice(categoryPosition + 1),
          ];
          await descendant.save({ session });
        }

        category.parent = newParent ? newParent._id : null;
        category.ancestors = newAncestors;
      }

      if (updates.name !== undefined) {
        category.name = updates.name;
        category.slug = makeSlug(updates.name);
      }
      if (updates.isActive !== undefined) {
        category.isActive = updates.isActive;
      }

      updatedCategory = await category.save({ session });
    });

    return updatedCategory;
  } catch (error) {
    if (
      error.code === 20 ||
      error.message?.includes(
        'Transaction numbers are only allowed on a replica set member',
      )
    ) {
      throw new ApiError(
        503,
        'Category updates require MongoDB to run as a replica set',
      );
    }
    handleDuplicateName(error);
  } finally {
    await session.endSession();
  }
}

async function deleteCategory(categoryId) {
  assertValidCategoryId(categoryId);
  const category = await Category.findById(categoryId);
  if (!category) throw new ApiError(404, 'Category not found');

  if (await Category.exists({ parent: category._id })) {
    throw new ApiError(409, 'Cannot delete a category that has children');
  }

  await category.deleteOne();
}

module.exports = {
  createCategory,
  listCategories,
  getCategoryById,
  getCategoryTree,
  updateCategory,
  deleteCategory,
};
