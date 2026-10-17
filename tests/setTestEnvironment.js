process.env.NODE_ENV = 'test';
process.env.MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/ecommerce_test?replicaSet=rs0';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ||
  'test-secret-that-is-long-enough-for-jwt-validation';
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '10';
