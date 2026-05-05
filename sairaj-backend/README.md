# Sairaj Engineering Works – Backend API

> Production-grade Node.js + Express REST API with **MongoDB**, **Cloudinary**, **Puppeteer PDFs**, and a **Python face-recognition microservice**.

---

## Project Structure

```
sairaj-backend/
├── server.js
├── package.json
├── .env.example
├── src/
│   ├── config/
│   │   ├── database.js          # Mongoose connection
│   │   └── cloudinary.js        # Cloudinary v2 config + helpers
│   ├── models/
│   │   ├── Worker.js
│   │   ├── Attendance.js
│   │   ├── Bill.js
│   │   └── Quotation.js
│   ├── controllers/
│   │   ├── workerController.js
│   │   ├── attendanceController.js
│   │   ├── billController.js
│   │   ├── quotationController.js
│   │   └── dashboardController.js
│   ├── routes/
│   │   ├── workers.js
│   │   ├── attendance.js
│   │   ├── bills.js
│   │   ├── quotations.js
│   │   └── dashboard.js
│   ├── middleware/
│   │   ├── upload.js            # Multer → Cloudinary / memory storage
│   │   └── validate.js          # express-validator result checker
│   └── services/
│       ├── faceService.js       # Axios client for Python face service
│       └── pdfService.js        # Puppeteer PDF generator
├── face_service/
│   ├── app.py                   # Flask face-recognition microservice
│   └── requirements.txt
└── README.md
```

---

## Quick Start

### 1. Install Node dependencies
```bash
cd sairaj-backend
npm install
```

### 2. Configure environment
```bash
copy .env.example .env   # Windows
# Edit .env with your MongoDB URI, Cloudinary keys, etc.
```

### 3. Start the API server
```bash
npm run dev    # nodemon (development)
npm start      # node (production)
```
API runs at **http://localhost:5000**

### 4. Start the Face Recognition service
```bash
cd face_service
pip install -r requirements.txt
# Optionally install dlib + face-recognition (see requirements.txt)
python app.py
```
Face service runs at **http://localhost:8000**

---

## API Reference

### Workers `(/api/workers)`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workers` | List workers (`?search=&active=&page=&limit=`) |
| GET | `/api/workers/:id` | Single worker |
| POST | `/api/workers` | Create worker — multipart `photo` required |
| PUT | `/api/workers/:id` | Update worker — multipart `photo` optional |
| DELETE | `/api/workers/:id` | Delete worker (removes Cloudinary photo + face embedding) |

### Attendance `(/api/attendance)`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/attendance/mark` | Face-recognition attendance — multipart `image` |
| POST | `/api/attendance/mark-manual` | Manual mark — body `{ worker_id, date? }` |
| GET | `/api/attendance/today` | All present workers today |
| GET | `/api/attendance/absent` | All absent active workers today |
| GET | `/api/attendance/report` | Date-range report (`?start_date=&end_date=&worker_id=`) |
| DELETE | `/api/attendance/:id` | Delete a record |

### Bills `(/api/bill)`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bill` | List bills (`?search=&page=&limit=`) |
| GET | `/api/bill/:id` | Single bill |
| GET | `/api/bill/:id/pdf` | Generate & download PDF invoice |
| POST | `/api/bill` | Create bill with line items |
| PUT | `/api/bill/:id` | Update bill |
| DELETE | `/api/bill/:id` | Delete bill |

### Quotations `(/api/quotation)`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/quotation` | List quotations (`?search=&status=&page=&limit=`) |
| GET | `/api/quotation/:id` | Single quotation |
| GET | `/api/quotation/:id/pdf` | Generate & download PDF quotation |
| POST | `/api/quotation` | Create quotation |
| PUT | `/api/quotation/:id` | Update quotation (including status) |
| DELETE | `/api/quotation/:id` | Delete quotation |

### Dashboard `(/api/dashboard)`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/summary` | KPI cards (workers, attendance, billing, quotations) |
| GET | `/api/dashboard/attendance-chart` | Daily attendance counts (`?days=30`) |
| GET | `/api/dashboard/revenue-chart` | Monthly revenue (`?months=6`) |
| GET | `/api/dashboard/recent-activity` | Latest 10 bills + quotations |
| GET | `/api/dashboard/top-workers` | Top 5 workers by monthly attendance |

### Face Service (Python — port 8000)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| POST | `/register` | Register face via file upload or Cloudinary URL |
| POST | `/recognize` | Identify worker from uploaded image |
| GET | `/workers` | List registered worker IDs |
| DELETE | `/workers/:id` | Remove face embedding |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | API server port |
| `NODE_ENV` | `development` | Environment |
| `CLIENT_URL` | `*` | CORS allowed origin |
| `MONGO_URI` | — | MongoDB Atlas connection string |
| `CLOUDINARY_CLOUD_NAME` | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | — | Cloudinary API secret |
| `FACE_SERVICE_URL` | `http://localhost:8000` | Python face service base URL |
| `COMPANY_NAME` | — | Used in generated PDFs |
| `COMPANY_ADDRESS` | — | Used in generated PDFs |
| `COMPANY_PHONE` | — | Used in generated PDFs |
| `COMPANY_EMAIL` | — | Used in generated PDFs |
| `COMPANY_GST` | — | Used in generated PDFs |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js ≥ 18 |
| Framework | Express 4 |
| Database | MongoDB via Mongoose 8 |
| File Storage | Cloudinary |
| PDF Generation | Puppeteer 22 |
| Face Recognition | Python 3.10+, Flask, face-recognition (dlib) |
| Security | Helmet, express-rate-limit, CORS |
| Logging | Morgan |
