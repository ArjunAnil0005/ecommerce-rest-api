const mongoose = require('mongoose');
const { ORDER_STATUSES } = require('../utils/orderStatus');
const { calculateLineTotal, calculateOrderTotal } = require('../utils/money');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    unitPricePaise: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    lineTotalPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
  },
  { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    changedAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator(items) {
          return items.length > 0;
        },
        message: 'An order must contain at least one item',
      },
    },
    totalPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'pending',
      required: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true },
);

orderSchema.pre('validate', function setOrderTotals() {
  if (!this.items || this.items.length === 0) return;

  try {
    for (const item of this.items) {
      item.lineTotalPaise = calculateLineTotal(
        item.unitPricePaise,
        item.quantity,
      );
    }
    this.totalPaise = calculateOrderTotal(this.items);
  } catch (error) {
    this.invalidate('totalPaise', error.message);
    return;
  }

  if (this.statusHistory.length === 0) {
    this.statusHistory.push({ status: this.status });
  }
});

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
