# FIT.AI Fashion Recommendation System

FIT.AI is a full-stack fashion recommendation and demo e-commerce app built with React, FastAPI, Pandas, and MongoDB. It includes AI-style product recommendations, authentication, wishlist, cart, shopping filters, checkout, UPI QR payment UI, card/COD demo flows, and an order confirmation screen.

## Tech Stack

- Frontend: React, Vite, Axios
- Backend: FastAPI, Pandas, PyMongo
- Database: MongoDB
- Deployment-ready for: Vercel/Netlify frontend and Render/Railway backend

## Local Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

Set real values in `backend/.env`:

```bash
MONGO_URL=your_mongodb_connection_string
MONGO_DB_NAME=fitai_db
SECRET_KEY=your_long_random_secret
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Set the backend URL in `frontend/.env`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Deployment

### Backend on Render

1. Create a new Render web service using the `backend` folder.
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables:
   - `MONGO_URL`
   - `MONGO_DB_NAME`
   - `SECRET_KEY`
   - `CORS_ORIGINS` with your deployed frontend URL

### Frontend on Vercel

1. Import the project in Vercel.
2. Set root directory to `frontend`.
3. Add environment variable:
   - `VITE_API_BASE_URL` with your deployed backend URL
4. Deploy.

## Payment QR

The app uses `frontend/public/payment-qr.png` for the UPI QR shown at checkout. Replace it with your own QR if needed.

## Before Public Upload

- Do not commit `.env` files.
- Rotate any database password that was previously hardcoded.
- Keep `node_modules`, `venv`, `dist`, `__pycache__`, and `.DS_Store` out of Git.
