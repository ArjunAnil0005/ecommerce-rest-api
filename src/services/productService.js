const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');

function assertValidProductId(productId) {
  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(400, 'Invalid product id');
  }
}

async function assertActiveCategory(categoryId) {
  if (!mongoose.isValidObjectId(categoryId)) {
    throw new ApiError(400, 'Invalid category id');
  }

  const category = await Category.findById(categoryId).select('_id isActive');
  if (!category || category.isActive === false) {
    throw new ApiError(404, 'Active category not found');
  }
}

async function createProduct(productDetails) {
  await assertActiveCategory(productDetails.category);
  return Product.create(productDetails);
}

async function getProductById(productId) {
  assertValidProductId(productId);
  const product = await Product.findOne({
    _id: productId,
    status: 'active',
  })
    .select('-__v')
    .lean();

  if (!product) throw new ApiError(404, 'Product not found');
  return product;
}

async function findProductOrThrow(productId) {
  assertValidProductId(productId);
  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');
  return product;
}

async function listProducts(query, includeInactive = false) {
  const filter = includeInactive ? {} : { status: 'active' };

  if (query.category) {
    const category = await Category.findById(query.category).select(
      '_id isActive',
    );
    if (!category || (!includeInactive && category.isActive === false)) {
      throw new ApiError(404, 'Category not found');
    }

    const descendantFilter = { ancestors: category._id };
    if (!includeInactive) descendantFilter.isActive = { $ne: false };
    const descendantIds = await Category.distinct('_id', descendantFilter);
    filter.category = { $in: [category._id, ...descendantIds] };
  }

  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: search }, { sku: search }];
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.effectivePricePaise = {};
    if (query.minPrice !== undefined) {
      filter.effectivePricePaise.$gte = query.minPrice;
    }
    if (query.maxPrice !== undefined) {
      filter.effectivePricePaise.$lte = query.maxPrice;
    }
  }

  const sort = getSort(query.sort);
  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .select('-__v')
    .sort(sort)
    .skip((query.page - 1) * query.limit)
    .limit(query.limit)
    .lean();

  return {
    products,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

async function updateProduct(productId, updates) {
  if (updates.category !== undefined) {
    await assertActiveCategory(updates.category);
  }

  const product = await findProductOrThrow(productId);
  Object.assign(product, updates);
  return product.save();
}

async function deactivateProduct(productId) {
  const product = await findProductOrThrow(productId);
  product.status = 'inactive';
  return product.save();
}

function getSort(sort) {
  const sorts = {
    price: { effectivePricePaise: 1, _id: 1 },
    '-price': { effectivePricePaise: -1, _id: 1 },
    name: { name: 1, _id: 1 },
    '-name': { name: -1, _id: 1 },
    newest: { createdAt: -1, _id: 1 },
    oldest: { createdAt: 1, _id: 1 },
  };
  return sorts[sort];
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  createProduct,
  getProductById,
  listProducts,
  updateProduct,
  deactivateProduct,
};
