# E-commerce REST API

A small learning project for the essentials of a REST API: Node.js, Express,
MongoDB, password hashing, JWT authentication, input validation, and consistent
error responses. Public registration creates customer accounts. Admins can
view users and activate or deactivate accounts.

## Requirements

- Node.js 24 or later
- MongoDB Community Server installed on Windows

## Quick start with Docker

Docker Compose starts the API and MongoDB together. MongoDB runs as a
single-node replica set, which is required for category moves and order
transactions.

1. Copy `.env.example` to `.env`, then set a private JWT secret and unique
   passwords. Do not use the example values.

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

2. Build and start both services:

   ```powershell
   docker compose up --build
   ```

3. In a second terminal, seed an admin and demo data:

   ```powershell
   docker compose exec api npm run seed:admin
   docker compose exec api npm run seed:demo
   ```

4. Open `http://localhost:5000/api-docs` or import the Postman collection from
   `postman/`.

Compose waits for MongoDB's health check to confirm the replica set is primary
before starting the API. The API uses the Compose hostname `mongo`; the local
MongoDB URI in `.env` is overridden only inside the container. Use
`docker compose down` to stop the services. Data remains in the `mongo-data`
volume; `docker compose down -v` removes that database data.

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

Then, from the project folder, install the API dependencies and create `.env`
from `.env.example`.
Use `npm.cmd` if PowerShell blocks the `npm.ps1` script because of its execution
policy.

```powershell
npm.cmd install
Copy-Item .env.example .env
notepad .env
```

Make sure `.env` contains the replica-set address and a private JWT secret.
Replace the example secret and passwords with unique values before running:

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

## Seed demo data

Set `DEMO_CUSTOMER_NAME`, `DEMO_CUSTOMER_EMAIL`, and
`DEMO_CUSTOMER_PASSWORD` in `.env`, then run:

```powershell
npm.cmd run seed:demo
```

The script creates `Electronics -> Mobiles` and `Electronics -> Accessories`,
two sample products, and one customer. It is safe to run again: existing
categories, products, and customers are reused rather than duplicated or
overwritten. If the configured demo email belongs to an admin, the script
stops instead of changing that account.

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
| `POST`   | `/orders`                 | Customer  | Place an order and reserve stock                  |
| `GET`    | `/orders`                 | Signed in | List own orders; admin can filter all orders      |
| `GET`    | `/orders/:orderId`        | Signed in | Get own order; admin can get any order            |
| `PATCH`  | `/orders/:orderId/cancel` | Customer  | Cancel own pending order and restore stock        |
| `PATCH`  | `/orders/:orderId/status` | Admin     | Move an order through valid statuses              |
| `GET`    | `/ready`                  | Public    | Check database readiness                          |

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

| Variable                 | Required       | Purpose                                        |
| ------------------------ | -------------- | ---------------------------------------------- |
| `MONGODB_URI`            | Yes            | MongoDB replica-set connection string          |
| `JWT_SECRET`             | Yes            | Private signing secret, at least 32 characters |
| `PORT`                   | No             | API port; defaults to `5000`                   |
| `NODE_ENV`               | No             | `development`, `test`, or `production`         |
| `JWT_EXPIRES_IN`         | No             | Token lifetime; defaults to `1d`               |
| `BCRYPT_ROUNDS`          | No             | Password hashing cost; defaults to `12`        |
| `CORS_ORIGINS`           | No             | Comma-separated allowed browser origins        |
| `ADMIN_NAME`             | For admin seed | Name for the initial admin                     |
| `ADMIN_EMAIL`            | For admin seed | Login email for the initial admin              |
| `ADMIN_PASSWORD`         | For admin seed | Admin password, at least 12 characters         |
| `DEMO_CUSTOMER_NAME`     | For demo seed  | Name for the demo customer                     |
| `DEMO_CUSTOMER_EMAIL`    | For demo seed  | Login email for the demo customer              |
| `DEMO_CUSTOMER_PASSWORD` | For demo seed  | Demo customer password, at least 12 characters |

If startup reports missing environment variables, check that `.env` contains
`MONGODB_URI` and a real `JWT_SECRET`.

## API documentation and Postman

- Swagger UI: `http://localhost:5000/api-docs`
- OpenAPI YAML: [`docs/openapi.yaml`](./docs/openapi.yaml)
- Postman collection: [`postman/ecommerce-rest-api.postman_collection.json`](./postman/ecommerce-rest-api.postman_collection.json)
- Postman environment: [`postman/ecommerce-rest-api.postman_environment.json`](./postman/ecommerce-rest-api.postman_environment.json)

Import both Postman files, set `adminEmail` and `adminPassword` to the seeded
admin credentials, then run the collection in order. It registers a customer,
creates a category tree and product, checks descendant filtering, places an
order, cancels it, and exercises the admin status/cancellation workflow.

## Tests and lint

```powershell
npm.cmd test -- --runInBand
npm.cmd run lint
npm.cmd run format:check
```

Tests use a temporary in-memory MongoDB replica set, so they do not need your
development database. The first test run may download a MongoDB binary.

## Project structure and design decisions

```text
src/
  config/       Environment validation and MongoDB connection
  controllers/  HTTP request/response handlers
  middleware/   Authentication, validation, errors, and request logging
  models/       Mongoose schemas and indexes
  routes/       URL-to-controller mappings
  scripts/      Admin and demo data seed commands
  services/     Business rules and database operations
  utils/        Shared errors, money, category-tree, and order-status helpers
  validation/   Zod request schemas
docs/           OpenAPI specification
postman/        Collection and local environment
tests/          Unit and MongoDB integration tests
```

Requests flow through routes, middleware, controllers, services, and models.
Validation, authorization, and business rules stay close to their respective
layers so a learner can follow each request without a framework-specific
abstraction layer.

- **Category hierarchy:** each category stores a `parent` reference and an
  ordered `ancestors` list. This makes descendant filtering straightforward;
  moving a subtree updates its descendants in a transaction.
- **Money:** product prices and order totals use integer paise, avoiding
  floating-point currency arithmetic.
- **Orders:** the server reads current product prices and stores product name,
  SKU, and price snapshots. Conditional stock updates and order writes share a
  MongoDB transaction, so an unavailable item rolls back the whole order.
- **Cancellation:** status changes and stock restoration are transactional.
  Conditional status updates prevent simultaneous cancellation requests from
  restoring stock twice.
- **API errors:** validation errors return `422`, missing/invalid authentication
  returns `401`, role failures return `403`, conflicts return `409`, and
  unexpected server errors do not expose internal details.

## Known limitations

- The login limiter uses process memory. It is appropriate for this
  single-instance learning application; multiple API instances need a shared
  rate-limit store.
- The Compose MongoDB service is for local development and has no database
  authentication or TLS. Do not expose it to an untrusted network.
- The project does not implement payments, shipping integrations, or
  distributed production deployment.

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

Order item snapshots retain product, name, SKU, unit price in paise, quantity,
and calculated line total. Order status progresses from `pending` to
`confirmed`, `processing`, `shipped`, and `delivered`. A customer can cancel
their own pending order only; an admin can also cancel a processing order.
Delivered and cancelled orders are terminal.

## Day 4: order placement and stock safety

Customers place orders with product IDs and quantities only. The server reads
the current active product price and calculates totals; the request does not
accept client prices:

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

Duplicate product IDs in one cart are combined, up to 100 units per product.
Stock is reserved with a conditional database update inside the same MongoDB
transaction that creates the order. If any item is unavailable, the transaction
rolls back and stock remains unchanged. Cancelling restores stock in a
transaction and only changes an order from `pending` for customer cancellation,
so simultaneous cancellations restore inventory once. Customers see only their
own orders; requesting another customer's order returns `404`. Admins can view
all orders and filter with `?status=pending&page=1&limit=20`.

Admin status changes use the transition rules:

| Current status | Allowed next status       |
| -------------- | ------------------------- |
| `pending`      | `confirmed`, `cancelled`  |
| `confirmed`    | `processing`, `cancelled` |
| `processing`   | `shipped`, `cancelled`    |
| `shipped`      | `delivered`               |
| `delivered`    | None                      |
| `cancelled`    | None                      |

Login attempts are rate-limited per client IP, request logs contain a generated
request ID and omit query strings, request bodies and headers, JWT verification
accepts only `HS256`, and `/api/v1/ready` returns `503` when MongoDB is not
connected. The server closes its HTTP listener and disconnects from MongoDB on
`SIGINT` and `SIGTERM`.

## Customer order walkthrough

After creating an active product as an admin, register or log in as a customer
and send its ID and quantity. The server uses the current effective price;
never include a client-supplied price.

```powershell
$token = "<customer-jwt>"
$body = '{"items":[{"productId":"<product-id>","quantity":1}]}'
Invoke-RestMethod `
  -Uri "http://localhost:5000/api/v1/orders" `
  -Method Post `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body $body
```

A successful response contains a `pending` order and its price snapshot.
Available stock is reduced in the same transaction. If an item is out of stock,
the request returns `409` and any earlier stock reservations are rolled back.
Cancel the pending order with `PATCH /api/v1/orders/<order-id>/cancel` as the
same customer; stock is restored exactly once.
