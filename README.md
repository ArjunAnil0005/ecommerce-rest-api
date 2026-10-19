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

Category moves use MongoDB transactions, so configure the local server as a
single-node replica set. Open the MongoDB configuration file as Administrator:

```powershell
notepad "C:\Program Files\MongoDB\Server\9.0\bin\mongod.cfg"
```

Add or uncomment this section, then save:

```yaml
replication:
  replSetName: rs0
```

Restart MongoDB from an Administrator PowerShell window:

```powershell
Restart-Service MongoDB
```

Initialize the replica set once:

```powershell
mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]})"
```

If MongoDB says the replica set is already initialized, check it with
`mongosh --eval "rs.status()"` and do not initialize it again.

Then, from the project folder, install the API dependencies and open `.env`.
Use `npm.cmd` if PowerShell blocks the `npm.ps1` script because of its execution
policy.

```powershell
npm.cmd install
notepad .env
```

Make sure `.env` contains the replica-set address and a private JWT secret:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/ecommerce?replicaSet=rs0
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

| Method   | Path                      | Access    | Purpose                                           |
| -------- | ------------------------- | --------- | ------------------------------------------------- |
| `GET`    | `/health`                 | Public    | Check that the API is running                     |
| `POST`   | `/auth/register`          | Public    | Create a customer account                         |
| `POST`   | `/auth/login`             | Public    | Sign in and receive a JWT                         |
| `GET`    | `/users/me`               | Signed in | View your profile                                 |
| `PATCH`  | `/users/me`               | Signed in | Change your name                                  |
| `GET`    | `/users`                  | Admin     | View all user accounts                            |
| `PATCH`  | `/users/:userId/status`   | Admin     | Activate or deactivate an account                 |
| `GET`    | `/categories/tree`        | Public    | Get the category tree                             |
| `POST`   | `/categories`             | Admin     | Create a category                                 |
| `PATCH`  | `/categories/:categoryId` | Admin     | Rename and/or move a category                     |
| `DELETE` | `/categories/:categoryId` | Admin     | Delete a category without descendants or products |
| `GET`    | `/products`               | Public    | List and filter active products                   |
| `GET`    | `/products/:productId`    | Public    | Get one active product                            |
| `POST`   | `/products`               | Admin     | Create a product                                  |
| `PATCH`  | `/products/:productId`    | Admin     | Update a product                                  |
| `DELETE` | `/products/:productId`    | Admin     | Deactivate a product                              |
| `GET`    | `/admin/products`         | Admin     | List active and inactive products                 |

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
- **The Category model** stores each category's parent and ancestor IDs.
- **The error handler** turns expected and unexpected errors into JSON responses.

The category module supports creating categories, moving categories, and
viewing the full tree. Each category stores its direct `parent` and its ordered
`ancestors`, which lets the API find descendants when a category moves.
Category names must be unique among siblings. Moves update the category and
all descendants in a MongoDB transaction. Category responses include a slug
derived from the name. A category with descendants cannot be deleted.

Create a root category by omitting `parent`; create a child by providing its
parent ID. To move a category to the root, set `parent` to `null`. The API
calculates `ancestors`; clients must not send that field. A category cannot be
moved beneath itself or any of its descendants. For example, after creating
`Electronics -> Mobiles`, moving `Electronics` under `Mobiles` returns `400`.

Use `PATCH /api/v1/categories/:categoryId` with `{"name":"Samsung Phones"}` to
rename a category, `{"parent":"<parentCategoryId>"}` to move it, or include
both fields to rename and move in one request. Circular-move and parent-delete
checks must run before moving descendants out from under that parent; after
moving `Mobiles` elsewhere, `Electronics` no longer contains those descendants.

## Configuration

| Variable         | Required       | Purpose                                        |
| ---------------- | -------------- | ---------------------------------------------- |
| `MONGODB_URI`    | Yes            | MongoDB replica-set connection string          |
| `JWT_SECRET`     | Yes            | Private signing secret, at least 32 characters |
| `PORT`           | No             | API port; defaults to `5000`                   |
| `NODE_ENV`       | No             | `development`, `test`, or `production`         |
| `JWT_EXPIRES_IN` | No             | Token lifetime; defaults to `1d`               |
| `BCRYPT_ROUNDS`  | No             | Password hashing cost; defaults to `12`        |
| `CORS_ORIGINS`   | No             | Comma-separated allowed browser origins        |
| `ADMIN_NAME`     | For admin seed | Name for the initial admin                     |
| `ADMIN_EMAIL`    | For admin seed | Login email for the initial admin              |
| `ADMIN_PASSWORD` | For admin seed | Admin password, at least 12 characters         |

If startup reports missing environment variables, check that `.env` contains
`MONGODB_URI` and a real `JWT_SECRET`.

## Tests and lint

```powershell
npm.cmd test
npm.cmd run lint
```

Tests use a temporary in-memory MongoDB replica set, so they do not need your
development database. The first test run may download a MongoDB binary.

## Day 3: products and order foundations

Product prices are stored as integer paise in `pricePaise`,
`salePricePaise`, and `effectivePricePaise`. For example, ₹199.99 is `19999`.
Listing filters `minPrice` and `maxPrice` also take paise; `sort=price` sorts
by effective selling price. A product's effective price is its sale price when
provided, otherwise its regular price. Search matches product name or SKU;
category filtering includes products assigned to that category and any of its
descendants. Public listing and product detail only return active products;
the admin listing includes inactive products.

Create a product as an admin:

```json
{
  "name": "Wireless Headphones",
  "sku": "AUDIO-001",
  "description": "Bluetooth headphones",
  "pricePaise": 125000,
  "salePricePaise": 99900,
  "stock": 10,
  "category": "<categoryId>"
}
```

The effective price is calculated by the API and is not accepted from clients.
To list products in a category subtree with a price range, search and
pagination, use:

```text
GET /api/v1/products?category=<categoryId>&minPrice=50000&maxPrice=200000&sort=price&page=1&limit=10
```

Search and sort options are `search=<name-or-sku>` and `sort=price`,
`sort=-price`, `sort=name`, `sort=-name`, `sort=newest`, or `sort=oldest`.
Price range values are paise (for example, `50000` is INR 500). Page size is
between 1 and 100.

`DELETE /api/v1/products/:productId` marks the product inactive instead of
physically removing it, so an order can retain its product reference and
purchase snapshots. A category with descendants or any product reference,
including an inactive product, cannot be deleted.

The Order model and validation are foundations only; order placement and HTTP
order routes are not implemented yet. Order item snapshots retain product,
name, SKU, unit price in paise, quantity, and calculated line total. Order
status progresses from `pending` to `confirmed`, `processing`, `shipped`, and
`delivered`. Cancellation is allowed while `pending` or `confirmed`; delivered
and cancelled orders are terminal. Day 4 must use `canTransition` before
changing order status. The future order request schema accepts:

```json
{
  "items": [
    {
      "productId": "<productId>",
      "quantity": 2
    }
  ]
}
```
