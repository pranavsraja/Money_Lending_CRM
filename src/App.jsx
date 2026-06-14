import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { seedData } from './data/store';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import BorrowersLeads from './pages/BorrowersLeads';
import BorrowerProfile from './pages/BorrowerProfile';
import Applications from './pages/Applications';
import Repayments from './pages/Repayments';
import Interactions from './pages/Interactions';
import Insights from './pages/Insights';

// Seed demo data on first load
seedData();

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/borrowers" element={<BorrowersLeads />} />
          <Route path="/borrowers/:id" element={<BorrowerProfile />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/repayments" element={<Repayments />} />
          <Route path="/interactions" element={<Interactions />} />
          <Route path="/insights" element={<Insights />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
