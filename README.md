# E-commerce REST API

A small learning project for the essentials of a REST API: Node.js, Express,
MongoDB, password hashing, JWT authentication, input validation, and consistent
error responses. Public registration creates customer accounts. Admins can
view users and activate or deactivate accounts.

## Requirements

- Node.js 24 or later
- MongoDB Community Server installed on Windows

## Start on Windows

Install MongoDB Community Server and make sure its Windows service is running.
You can check the service from PowerShell:

```powershell
Get-Service MongoDB
```

If it is stopped, start it from the Windows Services app or run PowerShell as
Administrator and use `Start-Service MongoDB`.

This project uses a local standalone MongoDB server. It is enough for the
current user and authentication APIs; MongoDB transactions, if needed in a
future feature, require changing the database to a replica set.

Then, from the project folder, install the API dependencies and open `.env`.
Use `npm.cmd` if PowerShell blocks the `npm.ps1` script because of its execution
policy.

```powershell
npm.cmd install
notepad .env
```

Make sure `.env` contains the local MongoDB address and a private JWT secret:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/ecommerce
JWT_SECRET=put-a-random-secret-here
```

Generate a secret and replace the example text with its output:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The secret must be at least 32 characters. Do not commit or share `.env`.

Start the API:

```powershell
npm.cmd run dev
```

It listens on `http://localhost:5000`. Check
`http://localhost:5000/api/v1/health`.

## Create an admin

Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env`. Use a unique
password of at least 12 characters, then run:

```powershell
npm.cmd run seed:admin
```

The seed script creates a new admin and refuses to promote an existing account.
Public registration always creates a customer.

## API

All routes use the `/api/v1` prefix.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | Check that the API is running |
| `POST` | `/auth/register` | Public | Create a customer account |
| `POST` | `/auth/login` | Public | Sign in and receive a JWT |
| `GET` | `/users/me` | Signed in | View your profile |
| `PATCH` | `/users/me` | Signed in | Change your name |
| `GET` | `/users` | Admin | View all user accounts |
| `PATCH` | `/users/:id/status` | Admin | Activate or deactivate an account |

For protected routes, send the token returned by register or login in the
`Authorization` header:

```text
Authorization: Bearer <token>
```

Example registration request:

```json
{
  "name": "Sam Example",
  "email": "sam@example.com",
  "password": "a-unique-password"
}
```

Passwords are hashed before storage and never returned by the API. Admin users
cannot deactivate their own accounts. API errors use a JSON response with
`success: false` and a readable `message`; invalid request fields are included
in an `errors` array.

## How the code is organized

```text
request -> routes -> middleware -> controllers -> services -> User model -> MongoDB
                                      errors -> shared error handler
```

- **Routes** connect a URL to a controller and add the required middleware.
- **Validation and authentication middleware** check incoming data and JWTs.
- **Controllers** read validated input, call a service, and send the response.
- **Services** contain the auth and user-management logic and access the model.
- **The User model** describes stored user fields and hashes passwords.
- **The error handler** turns expected and unexpected errors into JSON responses.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Private signing secret, at least 32 characters |
| `PORT` | No | API port; defaults to `5000` |
| `NODE_ENV` | No | `development`, `test`, or `production` |
| `JWT_EXPIRES_IN` | No | Token lifetime; defaults to `1d` |
| `BCRYPT_ROUNDS` | No | Password hashing cost; defaults to `12` |
| `CORS_ORIGINS` | No | Comma-separated allowed browser origins |
| `ADMIN_NAME` | For admin seed | Name for the initial admin |
| `ADMIN_EMAIL` | For admin seed | Login email for the initial admin |
| `ADMIN_PASSWORD` | For admin seed | Admin password, at least 12 characters |

If startup reports missing environment variables, check that `.env` contains
`MONGODB_URI` and a real `JWT_SECRET`.

## Tests and lint

```powershell
npm.cmd test
npm.cmd run lint
```

Tests use a temporary in-memory MongoDB, so they do not need your development
database. The first test run may download a MongoDB binary.

## Project scope

This project intentionally does not include products, orders, search, or
pagination. The admin user list is intended for a small learning project, not a
large production user base. Before exposing an API publicly, add appropriate
rate limiting, pagination, deployment secrets, HTTPS, monitoring, and database
backup/recovery procedures.
