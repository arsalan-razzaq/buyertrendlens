# Dataset Marketplace

Full-stack web application for selling controlled access to dataset exports.

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT + Google OAuth
- State: React Context API

## Features

- Email/password signup and login
- Google sign-in
- JWT protected API routes
- User/admin roles
- Wallet with coin balance and transaction history
- Advanced dataset filters with pagination
- CSV export with `0.5` coin cost per row
- Binance payment requests with admin approval
- Standalone Vue 3 TRON TRC20 USDT payment module at `client/tron-payment.html`
- Admin user management and balance adjustments
- Admin CSV dataset import
- Rate limiting and request validation
- Short-lived caching on dataset queries

## Project Structure

```text
client/   React frontend
server/   Express API and MongoDB models
```

## Environment Setup

Copy these files and fill in the values:

- `client/.env.example` -> `client/.env`
- `server/.env.example` -> `server/.env`

Key backend variables:

- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `CORS_ORIGINS` (optional comma-separated list for browser origins)
- `REMOTE_DATASET_API_URL` (optional Laravel dataset source for filters/exports)
- `REMOTE_DATASET_API_URL_ELDORADO` (optional second remote dataset source for Eldorado)
- `GOOGLE_CLIENT_ID`
- `BINANCE_RECEIVE_ADDRESS`
- `COINS_PER_USDT`

Frontend TRON payment variables:

- `VITE_RECEIVER_ADDRESS`
- `VITE_USDT_TRC20_CONTRACT`
- `VITE_TRONGRID_API_KEY`
- `VITE_WALLETCONNECT_PROJECT_ID` (optional, needed for mobile WalletConnect)

## Run Locally

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

Frontend runs on `http://localhost:5173`

Standalone Vue payment page runs on `http://localhost:5173/tron-payment.html`

Backend runs on `http://localhost:5000`

If `server/.env` includes `REMOTE_DATASET_API_URL`, the Node API keeps auth, wallet, and export billing locally but reads dataset rows from the remote Laravel endpoint instead of MongoDB for `/api/data`, export previews, and CSV exports. `REMOTE_DATASET_API_URL_ELDORADO` enables the same flow for the Eldorado sidebar item.

## VPS Deployment

This repo includes production deployment templates under [`deploy/`](./deploy):

- `deploy/ecosystem.config.cjs` for PM2
- `deploy/nginx.buyertrendlens.com.conf` for Nginx
- `deploy/client.env.production.example` for the frontend build
- `deploy/server.env.production.example` for the backend service

Recommended production layout:

- Nginx serves `client/dist`
- PM2 runs the API from `server/src/server.js`
- Nginx proxies `/api/*` to `127.0.0.1:5000`
- Frontend uses `VITE_API_URL=/api`

Typical Ubuntu deployment flow:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

cd /var/www
sudo git clone <repo-url> babar-1
sudo chown -R $USER:$USER /var/www/babar-1
cd /var/www/babar-1

npm install
npm install --prefix server
npm install --prefix client

cp deploy/client.env.production.example client/.env
cp deploy/server.env.production.example server/.env
npm run build --prefix client

pm2 start deploy/ecosystem.config.cjs
pm2 save
```

Nginx setup:

```bash
sudo cp deploy/nginx.buyertrendlens.com.conf /etc/nginx/sites-available/buyertrendlens.com
sudo ln -s /etc/nginx/sites-available/buyertrendlens.com /etc/nginx/sites-enabled/buyertrendlens.com
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d buyertrendlens.com -d www.buyertrendlens.com
```

Before enabling SSL, the domain's `A` records for `buyertrendlens.com` and `www.buyertrendlens.com` must point to the VPS IP.

## Admin User

You can either:

- sign up with the same email as `DEFAULT_ADMIN_EMAIL`, or
- run `npm run seed:admin --prefix server`

## CSV Import Columns

The admin dataset upload expects these columns:

```text
title, category, gameName, sellerName, price, rating, userLevel, sellerRank, score, groupName, ordersSold
```

## Main API Routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/me`
- `GET /api/data`
- `POST /api/export/preview`
- `POST /api/export`
- `GET /api/wallet`
- `POST /api/payment/request`
- `GET /api/payment`
- `PATCH /api/payment/:paymentId/submit-proof`
- `PATCH /api/payment/confirm/:paymentId`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:userId/coins`
- `POST /api/admin/datasets/import`
- `GET /api/admin/payments/pending`
- `PATCH /api/admin/payments/:paymentId/approve`
- `PATCH /api/admin/payments/:paymentId/reject`

## Notes

- The client build succeeds.
- Server modules load correctly, but a running MongoDB instance is required to boot the API fully.
- Google OAuth and Binance approval flows require real environment values before production use.
- The TRON payment module is documented in `client/README.tron-payment.md`.
