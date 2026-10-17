const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const emptyToUndefined = (schema) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

// Do not let an obvious placeholder sign real tokens.
const PLACEHOLDER_SECRET = /^(replace|change[-_ ]?me|your[-_ ]|placeholder|secret$|test$)/i;

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z
    .string()
    .min(32)
    .refine((value) => !PLACEHOLDER_SECRET.test(value.trim()), {
      message: 'must be a real random value, not a placeholder',
    }),
  JWT_EXPIRES_IN: z.string().min(1).default('1d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  // Seeding the admin is optional, so an empty value means "not configured".
  ADMIN_NAME: emptyToUndefined(z.string().trim().min(1)),
  ADMIN_EMAIL: emptyToUndefined(z.string().email()),
  ADMIN_PASSWORD: emptyToUndefined(z.string().min(12)),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(
    [
      'Invalid environment configuration:',
      details,
      '',
      'Set MONGODB_URI and JWT_SECRET in your .env file, then try again.',
    ].join('\n'),
  );
  process.exit(1);
}

module.exports = result.data;
