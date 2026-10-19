const mongoose = require('mongoose');
const slugifyCategoryName = require('../utils/slugifyCategoryName');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  ancestors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  isActive: { type: Boolean, default: true },
});

categorySchema.virtual('slug').get(function getSlug() {
  return slugifyCategoryName(this.name, this._id);
});

categorySchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.id;
    return ret;
  },
});

categorySchema.index(
  { parent: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);
categorySchema.index({ ancestors: 1 });

module.exports =
  mongoose.models.Category || mongoose.model('Category', categorySchema);
