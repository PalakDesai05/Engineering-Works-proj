# Sairaj Engineering Works 🏗️

A full-stack field management system for **Sairaj Engineering Works** — built to manage workers, track attendance via face recognition, and generate professional bills and quotations as downloadable PDFs.

---

## ✨ Features

| Module | Description |
|---|---|
| 📊 **Dashboard** | Live KPI cards — total workers, today's attendance, monthly revenue |
| 👷 **Workers Management** | Add / edit / delete workers with photo upload |
| 📷 **Labour Attendance** | Mark attendance via webcam face recognition |
| 🧾 **Bill Generator** | A4 inline-editable invoice with PDF download |
| 📋 **Quotation Generator** | A4 inline-editable quotation with PDF download |
| 🔔 **Notifications** | Global toast system for all events |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **Lucide React** for icons

### Backend
- **Node.js** + **Express**
- **SQLite** (`better-sqlite3`) — zero-config, file-based database
- **Puppeteer** — server-side PDF generation
- **Multer** — local disk file upload for worker photos

### Python Face Recognition Service
- **Flask** + **face-recognition** library (dlib-based)
- REST API for face registration and identification

---

## 📁 Project Structure

```
Engineering-Works-proj/
├── Engineering-Works-proj-main/   # React frontend (Vite)
│   ├── src/
│   │   ├── components/            # Sidebar, Navbar, ToastContainer
│   │   ├── context/               # ToastContext (global notifications)
│   │   ├── pages/                 # Dashboard, Workers, Attendance, Bill, Quotation
│   │   └── lib/                   # API client (api.ts)
│   ├── .env.example
│   └── package.json
│
├── sairaj-backend/                # Node.js Express API
│   ├── src/
│   │   ├── config/                # database.js (SQLite init + schema)
│   │   ├── controllers/           # workerController, billController, etc.
│   │   ├── middleware/            # upload.js (Multer)
│   │   ├── routes/                # REST route definitions
│   │   └── services/              # pdfService.js, faceService.js
│   ├── face_service/              # Python Flask face recognition
│   │   ├── app.py
│   │   └── requirements.txt
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🚀 Setup & Running

### Prerequisites
- Node.js ≥ 18
- Python ≥ 3.9
- `cmake` (required for dlib / face-recognition)

---

### 1️⃣ Backend (Node.js)

```bash
cd sairaj-backend

# Copy env template and fill in values
cp .env.example .env

# Install dependencies
npm install

# Start development server (auto-restarts on changes)
npm run dev
# → API running at http://localhost:5000
```

> The SQLite database (`sairaj.db`) and `uploads/` folder are created automatically on first start.

---

### 2️⃣ Python Face Recognition Service

```bash
cd sairaj-backend/face_service

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start service
python app.py
# → Running at http://localhost:8000
```

> **Note:** `cmake` must be installed before `pip install face-recognition`. On Windows, install via [cmake.org](https://cmake.org/download/) and add to PATH.

---

### 3️⃣ Frontend (React)

```bash
cd Engineering-Works-proj-main

# Copy env template
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
# → App running at http://localhost:5173
```

---

## 🔑 Environment Variables

### Backend (`sairaj-backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | API server port | `5000` |
| `DB_PATH` | SQLite database path | `./sairaj.db` |
| `FACE_SERVICE_URL` | Python service URL | `http://localhost:8000` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `COMPANY_NAME` | Used in PDF header | `Sairaj Engineering Works` |

### Frontend (`Engineering-Works-proj-main/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api` |

---

## 📸 Screenshots

> _Coming soon — add screenshots of Dashboard, Bill Generator, and Attendance pages here._

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

MIT © Sairaj Engineering Works
