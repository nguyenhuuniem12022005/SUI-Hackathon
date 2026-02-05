# P-Market

Modern inventory, store, and fulfillment platform built with a Node.js + Express REST API and a Next.js 14 frontend. The repository is structured as a lightweight monorepo so you can manage the full stack (database, services, and UI) from one place.

## Highlights

- **Full-featured admin API** covering authentication, users, products, categories, customers, suppliers, stores, warehouses, carts, reports, and chat rooms (see `backend/src/routers`).
- **Layered backend architecture** (controllers → services → repositories/middleware) with centralized validation, error handling, caching, and file uploads.
- **Next.js App Router frontend** with Tailwind CSS, reusable UI primitives, and context-based state management for carts, stores, and warehousing views.
- **MySQL data layer** configured via `mysql2`, with `.env.example` to speed up local database provisioning.
- **Ready-to-use dev tooling**: Babel + Nodemon for the API, Next.js hot reload for the app, strict lint config, and environment-specific `.env` files for both stacks.

## Tech Stack

| Layer     | Technology                                                                 |
|---------- |-----------------------------------------------------------------------------|
| Frontend  | Next.js 14, React 18, Tailwind CSS, Embla Carousel, Lucide Icons, Axios     |
| Backend   | Node.js (ESM), Express 4, Babel, JWT, Joi, Multer, Node-Cache, Moment       |
| Database  | MySQL (via `mysql2`)                                                        |
| Tooling   | Nodemon, dotenv, PostCSS, Autoprefixer, Tailwind CLI                        |

## Repository Layout

```
P-Market/
|-- backend/
|   |-- package.json
|   `-- src/
|       |-- index.js              # Express app entry
|       |-- configs/mysql.js      # MySQL pool configuration
|       |-- handlers/errorHandler # Centralized error responses
|       |-- routers/              # REST endpoints (auth, users, products, etc.)
|       |-- app/
|           |-- controllers/
|           |-- services/
|           |-- middleware/
|           `-- requests/         # Joi validation schemas
|-- frontend/
|   |-- package.json
|   |-- app/                      # Next.js App Router pages/layouts
|   |-- components/               # Shared UI building blocks
|   |-- context/, hooks/, lib/    # Client state + helpers
|   `-- public/                   # Static assets
|-- test/                         # Placeholder for automated tests
`-- README.md
```

## Getting Started

### 1. Prerequisites

- Node.js 18+ and npm 9+
- MySQL 8+ (or MariaDB equivalent)
- Optional: a tool such as TablePlus / MySQL Workbench for seeding data

### 2. Install dependencies

```bash
# From the repository root
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure environment variables

Create `backend/.env` based on `.env.example`:

```ini
APP_PORT=3001

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_NAME=p-market

SECRET_KEY=your_jwt_secret
LOGIN_EXPIRE_IN=7d
```

Create `frontend/.env.local` (used by Next.js):

```ini
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

> Tip: keep the backend and frontend origins aligned with the CORS config in `backend/src/index.js`. The default expects the frontend on `http://localhost:3000`.

### 4. Prepare the database

1. Create a MySQL database named `p-market` (or change `DB_NAME` to match your choice).
2. Apply the latest schema/data dump (not included in the repo). Import your SQL file or run migrations/scripts from your team.
3. Verify connectivity by running a simple `SELECT 1` via your MySQL client.

### 5. Run the apps

Use separate terminals for backend and frontend:

```bash
# Backend (Express + Babel + Nodemon)
cd backend
npm run dev

# Frontend (Next.js dev server)
cd frontend
npm run dev
```

- Backend defaults to `http://localhost:3001`, serving REST endpoints plus uploaded assets at `/uploads`.
- Frontend defaults to `http://localhost:3000`, proxying API calls through `NEXT_PUBLIC_API_BASE_URL`.

## Available Scripts

| Location  | Command        | Description                                |
|-----------|----------------|--------------------------------------------|
| backend   | `npm run dev`  | Start Express API with Nodemon + Babel     |
| backend   | `npm start`    | Run API with Babel (no file watching)      |
| frontend  | `npm run dev`  | Launch Next.js dev server                  |
| frontend  | `npm run build`| Production build                           |
| frontend  | `npm start`    | Serve the compiled Next.js app             |
| frontend  | `npm run lint` | Run Next.js linting (ESLint)               |

## API Surface (high-level)

All routes are rooted at `http://localhost:<APP_PORT>/`.

| Base path      | Purpose (see router)          |
|----------------|-------------------------------|
| `/auth`        | Sign-up, login, refresh       |
| `/users`       | CRUD + role/permission mgmt   |
| `/products`    | Catalog, variants, inventory  |
| `/categories`  | Category hierarchy endpoints  |
| `/customers`   | Customer profiles/orders      |
| `/suppliers`   | Supplier onboarding + listings|
| `/stores`      | Store information and staff   |
| `/warehouses`  | Warehouse + stock operations  |
| `/cart`        | Cart state for B2B/B2C flows  |
| `/reports`     | Overview/analytics summaries  |
| `/chatrooms`   | Internal chat/support rooms   |

For request/response details, inspect the corresponding controller in `backend/src/app/controllers` and the validation schema in `backend/src/app/requests`.

## Development Tips

- **Static uploads**: Files stored under `backend/src/public/uploads` are auto-served via `/uploads`. Use Multer in controllers to handle file inputs.
- **Validation**: Add new Joi schemas in `backend/src/app/requests` and wire them through the validators in `middleware/common`.
- **Caching**: `node-cache` is available for frequently accessed lookups (see services using it to avoid repeated DB calls).
- **CORS**: Update `corsOptions` in `backend/src/index.js` if you expose the frontend on another origin or deploy behind a proxy.
- **Next.js Images**: Remote patterns are whitelisted for `localhost:3001/uploads` and `placehold.co`. Add more in `frontend/next.config.js` when hosting assets elsewhere.

## Testing & Quality

- Placeholder `test/backend` and `test/frontend` folders are ready for integration/unit tests (Vitest, Jest, or Playwright). Add scripts to each package.json as you grow coverage.
- Until automated tests exist, manually verify mission-critical flows (auth, product CRUD, stock transfers, checkout) after changing services or middleware.

## Deployment Checklist

1. Build both apps (`npm run build` in each workspace).
2. Provide production-ready environment files with secure secrets and correct origins.
3. Run database migrations/seeders on the target MySQL instance.
4. Configure a process manager (PM2, systemd, or Docker) for the backend and a static host/Vercel for the frontend.

## Deployment on Render

### Backend Service
1. Create a new **Web Service** on Render.
2. Connect your repository.
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `PORT`: `10000` (Render sets this automatically, but good to know)
     - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`: Your MySQL database details.
     - `HSCOIN_API_KEY`: API Key for HScoin (if required).
     - `HSCOIN_ADMIN_EMAIL`: Admin email for HScoin.
     - `HSCOIN_ADMIN_PASSWORD`: Admin password for HScoin.
     - `CLIENT_URL`: URL of your deployed frontend (e.g., `https://your-frontend.onrender.com`).

### Frontend Service
1. Create a new **Web Service** on Render.
2. Connect your repository.
3. Settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `NEXT_PUBLIC_API_BASE_URL`: URL of your deployed backend (e.g., `https://your-backend.onrender.com`).
     - `NEXT_PUBLIC_HSCOIN_EXPLORER`: URL to HScoin explorer (optional).

## HScoin Integration

The project is pre-configured to connect with the HScoin blockchain via the backend.
- **Backend**: `src/app/services/blockchainService.js` handles all blockchain interactions.
- **Frontend**: Uses `WalletContext` to manage wallet connections and sends requests to the backend.

Ensure you set the `HSCOIN_*` environment variables in your backend service on Render.

## License

Backend `package.json` lists ISC; update this section if the project adopts a different license.

---

Need help extending the documentation (API reference, ERD, or deployment scripts)? Open an issue or add to this README so future contributors stay productive.
