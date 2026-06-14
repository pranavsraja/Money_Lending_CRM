# LendFlow CRM - Money Lending Management System

A full-stack web application for managing lending operations, borrower profiles, loan applications, repayments, and interactions.

## Tech Stack

### Frontend
- **React** 19.2.6
- **Vite** 8.0.12 (Build tool)
- **React Router DOM** 7.17.0 (Routing)
- **Recharts** 3.8.1 (Data visualization)
- **Lucide React** 1.18.0 (Icons)

### Backend
- **Node.js** with **Express** 5.2.1
- **SQLite3** 6.0.1 (Database)
- **CORS** 2.8.6 (Cross-origin support)

## Project Structure

```
CRM_final/
├── backend/                 # Express API server
│   ├── server.js           # Main server file
│   ├── db.js               # Database setup & queries
│   ├── package.json
│   └── node_modules/
├── src/                    # React frontend
│   ├── main.jsx           # Entry point
│   ├── App.jsx            # Main app component
│   ├── components/        # React components
│   ├── pages/             # Page components
│   ├── data/              # Store & hooks
│   └── assets/            # Images & styles
├── public/                # Static files
├── package.json           # Frontend dependencies
├── vite.config.js        # Vite configuration
└── index.html            # HTML template
```

## Prerequisites

Before running this project, ensure you have:
- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v9.0.0 or higher) - comes with Node.js
- A code editor like VS Code

## Installation & Setup

### Step 1: Clone or Extract the Project
If you received this as a zip file:
```bash
# Extract the zip file to your desired location
unzip CRM_final.zip
cd CRM_final
```

### Step 2: Install Frontend Dependencies
```bash
npm install
```

### Step 3: Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

## Running the Project

You'll need to run two servers - the backend and frontend. Open two terminal windows:

### Terminal 1: Start the Backend Server
```bash
cd backend
node server.js
```

You should see:
```
Backend API running on http://localhost:3000
```

### Terminal 2: Start the Frontend Development Server
```bash
npm run dev
```

You should see:
```
VITE v8.0.16  ready in [time] ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 3: Open the Application
Open your browser and navigate to:
```
http://localhost:5173
```

## Available Routes

The application includes the following pages:
- **Dashboard** - Portfolio overview and key metrics
- **Borrowers/Leads** - Manage borrower information and leads
- **Applications** - Track loan applications
- **Loans** - Manage active loans
- **Repayments** - Track payment history
- **Interactions** - Log and manage customer interactions
- **Insights** - Analytics and reports

## API Endpoints

The backend API runs on `http://localhost:3000` with the following endpoints:

- `GET /api/leads` - Get all leads
- `GET /api/borrowers` - Get all borrowers
- `GET /api/applications` - Get all applications
- `GET /api/loans` - Get all loans
- `GET /api/installments` - Get all installments
- `GET /api/interactions` - Get all interactions
- `POST /api/[entity]` - Create new entity
- `PUT /api/[entity]/:id` - Update entity
- `DELETE /api/[entity]/:id` - Delete entity

## Build for Production

To create an optimized production build:

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Troubleshooting

### Port Already in Use
If you get an error that port 3000 or 5173 is already in use:
- **For Port 3000**: `lsof -i :3000` to find the process, then `kill -9 <PID>`
- **For Port 5173**: `lsof -i :5173` to find the process, then `kill -9 <PID>`

### Module Not Found Errors
Try cleaning and reinstalling dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Database Issues
The SQLite database is automatically created on first run. If you encounter database errors, the backend will handle them gracefully.

## Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend
- `node server.js` - Start the server

## License

ISC

## Support

For issues or questions, please check the project structure and ensure both servers are running on their respective ports.
