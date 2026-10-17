const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../config/env');

// Define a Mongoose schema for the User model with fields for name, email, password, role, and isActive status. It includes validation rules for each field and sets up pre-save middleware to hash the password before saving it to the database. The schema also defines a toJSON transformation to exclude sensitive information like the password hash from API responses.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  // Store only a hash, never the original password.
  this.password = await bcrypt.hash(this.password, env.BCRYPT_ROUNDS);
});

userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    // Keep password hashes out of API responses.
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
