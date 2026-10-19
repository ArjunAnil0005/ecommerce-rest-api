function calculateLineTotal(unitPricePaise, quantity) {
  if (!Number.isSafeInteger(unitPricePaise) || unitPricePaise < 0) {
    throw new TypeError(
      'Unit price must be a non-negative whole number of paise',
    );
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new TypeError('Quantity must be a positive whole number');
  }

  const lineTotalPaise = unitPricePaise * quantity;
  if (!Number.isSafeInteger(lineTotalPaise)) {
    throw new RangeError('Line total exceeds the safe integer limit');
  }
  return lineTotalPaise;
}

function calculateOrderTotal(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new TypeError('Order must contain at least one item');
  }

  const total = items.reduce(
    (sum, item) => sum + calculateLineTotal(item.unitPricePaise, item.quantity),
    0,
  );
  if (!Number.isSafeInteger(total)) {
    throw new RangeError('Order total exceeds the safe integer limit');
  }
  return total;
}

module.exports = { calculateLineTotal, calculateOrderTotal };
