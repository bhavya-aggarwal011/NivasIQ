# NivasIQ 🏠

> **Smart Hostel Management System** — Built for scale, designed for simplicity.

NivasIQ is a full-stack hostel allotment and management platform engineered to handle large-scale residential operations — managing 960+ rooms with real-time tracking, automated fee management, and a clean admin dashboard.

---

## ✨ Features

- **Room Allotment Management** — Allocate, transfer, and vacate rooms with full audit trails
- **Occupancy Dashboard** — Real-time overview of room availability and occupancy status
- **Fee Tracking** — Monitor payment dues, receipts, and outstanding balances per resident
- **Student/Resident Profiles** — Centralized records including contact info, room history, and documents
- **Admin Controls** — Role-based access for hostel wardens, managers, and administrators
- **Dark-Themed UI** — Clean, modern interface optimized for daily operational use

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Server | Express.js (`server.js`) |
| Frontend | HTML/CSS/JS (served from `/public`) |
| Config | `.env` for environment variables |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/bhavya-aggarwal011/NivasIQ.git
cd NivasIQ

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Running the Server

```bash
# Development
node server.js

# Or with auto-reload (if nodemon is installed)
npx nodemon server.js
```

The application will be available at `http://localhost:3000` (or the port defined in your `.env`).

---

## 📁 Project Structure

```
NivasIQ/
├── public/           # Static frontend assets (HTML, CSS, JS)
├── server.js         # Main Express server & API routes
├── package.json      # Project metadata & dependencies
├── .env.example      # Environment variable template
└── .gitignore
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=3000
# Add your database connection and other secrets here
```

---

## 📊 Scale

NivasIQ is built to comfortably manage:

- **960+ rooms** across multiple floors/blocks
- Concurrent admin sessions
- Full occupancy history and reporting

---

## 👤 Author

**Bhavya Aggarwal** — [@bhavya-aggarwal011](https://github.com/bhavya-aggarwal011)

---

*NivasIQ — Because managing a hostel shouldn't feel like living in one.*
