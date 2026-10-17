# E-commerce REST API

Day 1 provides the project foundation, customer authentication, and basic user
management. It uses Node.js 24, Express, MongoDB/Mongoose, JWT, and Zod.

## Start locally (Windows PowerShell)

Requirements: Node.js 24 and Docker Desktop.

Run these commands from the project root:

```powershell
npm.cmd install
Copy-Item .env.example .env
notepad .env
docker compose up -d
npm.cmd run dev
```

In `.env`, replace `JWT_SECRET` with a private random value of at least 32
characters. Generate one with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep `.env` private; it is ignored by Git. The example config points to the
MongoDB replica set started by Docker Compose. The API starts at
`http://localhost:5000`; check `http://localhost:5000/api/v1/health`.

Run the tests (they do not need Docker or a running MongoDB):

```powershell
npm.cmd test
npm.cmd run lint
```

Tests start a throwaway in-memory MongoDB replica set with
`mongodb-memory-server`, so nothing touches your local database. The first run
downloads a MongoDB binary once and caches it.

## Request flow

```text
app -> versioned routes -> middleware -> controller -> service -> model -> MongoDB
```

- **Routes** select middleware and the controller.
- **Middleware** validates input and checks identity/role.
- **Controllers** pass validated inputs to services and return responses.
- **Services** contain business rules.
- **Models** define persisted data.

For example, `PATCH /api/v1/users/me` authenticates and validates the request,
then the controller calls the user service, which updates the user model.

## Day 1 endpoints

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Public | Check that the API is running |
| `POST` | `/api/v1/auth/register` | Public | Register a customer |
| `POST` | `/api/v1/auth/login` | Public | Log in and receive a JWT |
| `GET` | `/api/v1/users/me` | Authenticated | Read your profile |
| `PATCH` | `/api/v1/users/me` | Authenticated | Update your name |
| `GET` | `/api/v1/users` | Admin | Search and paginate users |
| `PATCH` | `/api/v1/users/:id/status` | Admin | Activate or deactivate a user |

Registration always creates a customer. Passwords are hashed and omitted from
responses. Send protected requests with `Authorization: Bearer <token>`.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development`, `test`, or `production` |
| `PORT` | No | `5000` | HTTP port |
| `MONGODB_URI` | Yes | – | MongoDB connection string |
| `JWT_SECRET` | Yes | – | Signing secret, at least 32 characters |
| `JWT_EXPIRES_IN` | No | `1d` | Token lifetime |
| `BCRYPT_ROUNDS` | No | `12` | Password hashing cost (10–15) |
| `CORS_ORIGINS` | No | – | Comma-separated browser origins allowed |
| `ADMIN_NAME` | For seeding | – | Admin display name |
| `ADMIN_EMAIL` | For seeding | – | Admin login email |
| `ADMIN_PASSWORD` | For seeding | – | Admin password, at least 12 characters |

Configuration is validated by Zod at boot, so the process exits with a clear
message when a required value is missing or malformed.

## Admin account

Admin creation is deliberately separate from public registration. To seed one,
add `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` to your private `.env`
file, then run:

```powershell
npm.cmd run seed:admin
```

Use a unique strong password. The seed script does not expose admin signup to
the public API.

## Before production

- Set `MONGODB_URI` to the production MongoDB connection string and store it in
  the deployment secret manager, not in source control.
- Generate a new, private `JWT_SECRET` for each environment.
- Set and rotate the admin credentials securely; do not use development values.
- Use a managed, backed-up MongoDB deployment and restrict network access.
- Configure production logging, monitoring, HTTPS, and request rate limits.
- Complete and test the planned categories, products, orders, and stock flows.
