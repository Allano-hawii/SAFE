# SafeSite — Cloud-Based Construction Log & Reporting System

SafeSite is a modern, responsive web application designed to replace paper-based construction site logs with real-time digital reporting, safety incident management, and automated field progress tracking.

---

## 🏗️ Key Features

- **Daily Site Progress Logs**:
  - Record weather conditions, work progress summaries, and percentage completion.
  - Track skilled and unskilled labor counts on-site.
  - Log materials consumed (Cement, Steel, Sand, Aggregates, Bricks, etc.).
  - Monitor equipment status and maintain supervisor notes.

- **Safety Incident & Hazard Reporting**:
  - Log hazards and safety incidents by category (Near Miss, Injury, Equipment Failure, Fall Hazard, Electrical, etc.).
  - Classify urgency levels (`Low`, `Medium`, `High`) with automatic warning badges.
  - Record injury details and corrective actions taken.
  - Track incident resolution status (`Open`, `Under Review`, `Resolved`).

- **Live Site Management Dashboard**:
  - KPI metric cards for active sites, today's labor count, open safety incidents, and daily reports logged.
  - Recent activity feed and open incident alerts.

- **Reporting & Data Export**:
  - Filter daily reports and safety logs by date range and site location.
  - Search and filter records with detailed modal/drawer views.
  - Export reports to CSV for site meetings, audits, and compliance archiving.

- **Role-Based Authentication**:
  - Support for multiple roles: Site Supervisors, Safety Officers, Project Managers, Site Engineers, and Administrators.
  - Account registration and user profile management.
  - Cloud database integration with offline localStorage fallback.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or bun

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Allano-hawii/SAFE.git
   cd SAFE
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 📁 Project Structure

```
├── css/
│   └── style.css            # Responsive UI styles and theme variables
├── js/
│   ├── auth.js              # Authentication and user session management
│   ├── daily-report.js      # Daily construction log form handling
│   ├── dashboard.js         # KPI metrics, recent activity, and site overview
│   ├── firebase-config.js   # Cloud database client & offline data store
│   ├── reports.js           # Filtering, pagination, detail modals, and CSV export
│   ├── safety-incident.js   # Incident reporting and hazard tracking
│   └── ui.js                # Reusable UI helpers (toasts, modals, drawer)
├── daily-report.html        # Daily progress logging interface
├── dashboard.html           # Main management dashboard
├── index.html               # Sign in and user registration portal
├── reports.html             # Historical reports and data export viewer
├── safety-incident.html     # Incident and hazard submission form
├── firestore.rules          # Security rules for cloud database collections
├── server.js                # Express static server for local/production runtime
├── package.json             # Project dependencies and run scripts
└── README.md                # Project documentation
```

---

## 📄 License

This project is licensed under the MIT License.
