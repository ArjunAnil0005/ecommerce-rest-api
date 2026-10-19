const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    pricePaise: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    salePricePaise: {
      type: Number,
      default: null,
      min: 1,
      validate: {
        validator(value) {
          return value === null || Number.isSafeInteger(value);
        },
        message: 'Sale price must be a whole number of paise',
      },
    },
    effectivePricePaise: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      required: true,
    },
  },
  { timestamps: true },
);

productSchema.pre('validate', function validateAndSetPrices() {
  if (this.salePricePaise > this.pricePaise) {
    this.invalidate(
      'salePricePaise',
      'Sale price cannot be greater than regular price',
    );
  }

  this.effectivePricePaise = this.salePricePaise ?? this.pricePaise;
});

productSchema.index({ status: 1, category: 1, effectivePricePaise: 1 });
productSchema.index({ status: 1, name: 1 });

productSchema.set('toJSON', {
  transform(_document, product) {
    delete product.__v;
    return product;
  },
});

module.exports =
  mongoose.models.Product || mongoose.model('Product', productSchema);
