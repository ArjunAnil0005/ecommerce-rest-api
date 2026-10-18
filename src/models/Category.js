const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    slug: { type: String, required: true, index: true },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    ancestors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

categorySchema.index(
  { parent: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);
categorySchema.index({ ancestors: 1 });

module.exports =
  mongoose.models.Category || mongoose.model('Category', categorySchema);
