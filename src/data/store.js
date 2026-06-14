// ═══════════════════════════════════════════════════════
// Backend API + localStorage Data Layer
// ═══════════════════════════════════════════════════════

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const API_BASE = '/api';
function getEndpoint(key) {
  return key.replace('crm_', '');
}

// ─── API Sync Helpers (Fire & Forget) ───
export async function apiCreate(key, item) {
  try {
    await fetch(`${API_BASE}/${getEndpoint(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
  } catch(e) { console.error('API Sync Error', e); }
}

export async function apiUpdate(key, id, updates) {
  try {
    await fetch(`${API_BASE}/${getEndpoint(key)}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  } catch(e) { console.error('API Sync Error', e); }
}

export async function apiRemove(key, id) {
  try {
    await fetch(`${API_BASE}/${getEndpoint(key)}/${id}`, {
      method: 'DELETE'
    });
  } catch(e) { console.error('API Sync Error', e); }
}

// ─── Generic CRUD helpers ───
export function getAll(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

export function saveAll(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getById(key, id) {
  return getAll(key).find(item => item.id === id);
}

export function create(key, item) {
  const items = getAll(key);
  // Item can bring its own ID (e.g. seed data, installments), otherwise generate one
  const newItem = { id: uuid(), createdAt: now(), updatedAt: now(), ...item };
  items.push(newItem);
  saveAll(key, items);
  apiCreate(key, newItem);
  return newItem;
}

export function update(key, id, updates) {
  const items = getAll(key);
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return null;
  const updatedItem = { ...items[idx], ...updates, updatedAt: now() };
  items[idx] = updatedItem;
  saveAll(key, items);
  apiUpdate(key, id, updates);
  return updatedItem;
}

export function remove(key, id) {
  const items = getAll(key).filter(i => i.id !== id);
  saveAll(key, items);
  apiRemove(key, id);
}

// ─── Table Keys ───
export const KEYS = {
  LEADS: 'crm_leads',
  BORROWERS: 'crm_borrowers',
  APPLICATIONS: 'crm_applications',
  LOANS: 'crm_loans',
  INSTALLMENTS: 'crm_installments',
  INTERACTIONS: 'crm_interactions',
};

// ─── EMI Calculation ───
export function calculateEMI(principal, annualRate, tenureMonths) {
  if (!principal || !annualRate || !tenureMonths) return 0;
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / tenureMonths;
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  return Math.round(emi * 100) / 100;
}

// ─── Generate Installments for a Loan ───
export function generateInstallments(loan) {
  const installments = [];
  const startDate = new Date(loan.startDate);
  for (let i = 1; i <= Math.ceil(loan.principalAmount / loan.emiAmount); i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    installments.push({
      id: uuid(),
      loanId: loan.id,
      installmentNumber: i,
      dueDate: dueDate.toISOString().split('T')[0],
      amountDue: loan.emiAmount,
      amountPaid: 0,
      status: 'Pending',
      paymentDate: null,
      paymentMethod: null,
      createdAt: now(),
      updatedAt: now(),
    });
  }
  return installments;
}

// ─── Seed Data ───
export async function seedData() {
  if (localStorage.getItem('crm_seeded') === 'true') return;

  try {
    const checkRes = await fetch(`${API_BASE}/leads`);
    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (existing.length > 0) {
        localStorage.setItem('crm_seeded', 'true');
        return;
      }
    }
  } catch (err) {
    console.warn('Could not check existing data before seeding', err);
  }

  // Leads
  const leads = [
    { id: uuid(), fullName: 'Priya Sharma', phone: '+91 98765 43210', email: 'priya.s@email.com', address: '12 MG Road, Bangalore', source: 'Website', status: 'New', assignedOfficer: 'Raj Kumar', nextFollowUpDate: '2026-06-15', notes: 'Interested in personal loan for wedding', createdAt: '2026-06-10T10:00:00Z', updatedAt: '2026-06-10T10:00:00Z' },
    { id: uuid(), fullName: 'Arun Patel', phone: '+91 87654 32109', email: 'arun.p@email.com', address: '45 Park Street, Mumbai', source: 'Referral', status: 'Contacted', assignedOfficer: 'Meera Nair', nextFollowUpDate: '2026-06-14', notes: 'Vehicle loan inquiry', createdAt: '2026-06-08T09:00:00Z', updatedAt: '2026-06-11T14:00:00Z' },
    { id: uuid(), fullName: 'Deepa Krishnan', phone: '+91 76543 21098', email: 'deepa.k@email.com', address: '78 Anna Salai, Chennai', source: 'Walk-in', status: 'Interested', assignedOfficer: 'Raj Kumar', nextFollowUpDate: '2026-06-16', notes: 'Education loan for daughter', createdAt: '2026-06-05T11:00:00Z', updatedAt: '2026-06-12T16:00:00Z' },
    { id: uuid(), fullName: 'Vikram Singh', phone: '+91 65432 10987', email: 'vikram.s@email.com', address: '23 Nehru Place, Delhi', source: 'Social Media', status: 'Not Interested', assignedOfficer: 'Meera Nair', nextFollowUpDate: null, notes: 'Rates too high', createdAt: '2026-06-01T08:00:00Z', updatedAt: '2026-06-09T10:00:00Z' },
    { id: uuid(), fullName: 'Sunita Reddy', phone: '+91 54321 09876', email: 'sunita.r@email.com', address: '56 Jubilee Hills, Hyderabad', source: 'Agent', status: 'Interested', assignedOfficer: 'Raj Kumar', nextFollowUpDate: '2026-06-17', notes: 'Business expansion loan', createdAt: '2026-06-03T12:00:00Z', updatedAt: '2026-06-11T11:00:00Z' },
  ];

  // Borrowers
  const borrowers = [
    { id: 'bwr-001', leadId: null, fullName: 'Rajesh Menon', dob: '1985-03-15', phone: '+91 98901 23456', email: 'rajesh.m@email.com', address: '34 Koramangala, Bangalore', nationalId: 'ABCDE1234F', panNumber: 'ABCPD1234E', aadhaarNumber: '1234 5678 9012', occupation: 'Software Engineer', employer: 'TechCorp India', monthlyIncome: 120000, creditScore: 780, documentsVerified: true, createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-06-10T10:00:00Z' },
    { id: 'bwr-002', leadId: null, fullName: 'Anjali Gupta', dob: '1990-07-22', phone: '+91 87890 12345', email: 'anjali.g@email.com', address: '67 Bandra West, Mumbai', nationalId: 'FGHIJ5678K', panNumber: 'FGHPG5678L', aadhaarNumber: '2345 6789 0123', occupation: 'Business Owner', employer: 'Gupta Textiles', monthlyIncome: 250000, creditScore: 720, documentsVerified: true, createdAt: '2026-02-20T09:00:00Z', updatedAt: '2026-06-10T09:00:00Z' },
    { id: 'bwr-003', leadId: null, fullName: 'Mohan Das', dob: '1978-11-30', phone: '+91 76789 01234', email: 'mohan.d@email.com', address: '12 T Nagar, Chennai', nationalId: 'KLMNO9012P', panNumber: 'KLMPD9012Q', aadhaarNumber: '3456 7890 1234', occupation: 'Teacher', employer: 'DPS School', monthlyIncome: 65000, creditScore: 580, documentsVerified: true, createdAt: '2026-03-10T11:00:00Z', updatedAt: '2026-06-10T11:00:00Z' },
    { id: 'bwr-004', leadId: null, fullName: 'Kavita Joshi', dob: '1992-05-18', phone: '+91 65678 90123', email: 'kavita.j@email.com', address: '89 Connaught Place, Delhi', nationalId: 'PQRST3456U', panNumber: 'PQRPJ3456V', aadhaarNumber: '4567 8901 2345', occupation: 'Doctor', employer: 'Apollo Hospital', monthlyIncome: 180000, creditScore: 820, documentsVerified: true, createdAt: '2026-04-05T08:00:00Z', updatedAt: '2026-06-10T08:00:00Z' },
    { id: 'bwr-005', leadId: null, fullName: 'Suresh Kumar', dob: '1982-09-10', phone: '+91 54567 89012', email: 'suresh.k@email.com', address: '45 Banjara Hills, Hyderabad', nationalId: 'UVWXY7890Z', panNumber: 'UVWPK7890A', aadhaarNumber: '5678 9012 3456', occupation: 'Shop Owner', employer: 'Self-Employed', monthlyIncome: 85000, creditScore: 450, documentsVerified: false, createdAt: '2026-05-01T12:00:00Z', updatedAt: '2026-06-10T12:00:00Z' },
  ];

  // Applications
  const applications = [
    { id: 'app-001', borrowerId: 'bwr-001', loanType: 'Personal', requestedAmount: 500000, interestRate: 12, tenureMonths: 24, emiPreviewAmount: calculateEMI(500000, 12, 24), status: 'Approved', reviewNotes: 'Strong credit profile', submissionDate: '2026-02-01', createdAt: '2026-02-01T10:00:00Z', updatedAt: '2026-02-15T10:00:00Z' },
    { id: 'app-002', borrowerId: 'bwr-002', loanType: 'Business', requestedAmount: 2000000, interestRate: 14, tenureMonths: 36, emiPreviewAmount: calculateEMI(2000000, 14, 36), status: 'Approved', reviewNotes: 'Business plan verified', submissionDate: '2026-03-01', createdAt: '2026-03-01T09:00:00Z', updatedAt: '2026-03-20T09:00:00Z' },
    { id: 'app-003', borrowerId: 'bwr-003', loanType: 'Education', requestedAmount: 300000, interestRate: 10, tenureMonths: 48, emiPreviewAmount: calculateEMI(300000, 10, 48), status: 'Under Review', reviewNotes: '', submissionDate: '2026-06-01', createdAt: '2026-06-01T11:00:00Z', updatedAt: '2026-06-01T11:00:00Z' },
    { id: 'app-004', borrowerId: 'bwr-004', loanType: 'Vehicle', requestedAmount: 800000, interestRate: 9, tenureMonths: 60, emiPreviewAmount: calculateEMI(800000, 9, 60), status: 'Submitted', reviewNotes: '', submissionDate: '2026-06-10', createdAt: '2026-06-10T08:00:00Z', updatedAt: '2026-06-10T08:00:00Z' },
    { id: 'app-005', borrowerId: 'bwr-005', loanType: 'Personal', requestedAmount: 150000, interestRate: 18, tenureMonths: 12, emiPreviewAmount: calculateEMI(150000, 18, 12), status: 'Rejected', reviewNotes: 'Low credit score, insufficient income', submissionDate: '2026-05-15', createdAt: '2026-05-15T12:00:00Z', updatedAt: '2026-05-25T12:00:00Z' },
    { id: 'app-006', borrowerId: 'bwr-001', loanType: 'Vehicle', requestedAmount: 600000, interestRate: 10, tenureMonths: 48, emiPreviewAmount: calculateEMI(600000, 10, 48), status: 'Draft', reviewNotes: '', submissionDate: null, createdAt: '2026-06-12T10:00:00Z', updatedAt: '2026-06-12T10:00:00Z' },
  ];

  // Loans
  const loan1 = {
    id: 'loan-001',
    applicationId: 'app-001',
    borrowerId: 'bwr-001',
    principalAmount: 500000,
    interestRate: 12,
    emiAmount: calculateEMI(500000, 12, 24),
    startDate: '2026-02-20',
    endDate: '2028-02-20',
    disbursementDate: '2026-02-20',
    outstandingBalance: 350000,
    status: 'Active',
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-06-10T10:00:00Z',
  };
  const loan2 = {
    id: 'loan-002',
    applicationId: 'app-002',
    borrowerId: 'bwr-002',
    principalAmount: 2000000,
    interestRate: 14,
    emiAmount: calculateEMI(2000000, 14, 36),
    startDate: '2026-03-25',
    endDate: '2029-03-25',
    disbursementDate: '2026-03-25',
    outstandingBalance: 1800000,
    status: 'Active',
    createdAt: '2026-03-25T09:00:00Z',
    updatedAt: '2026-06-10T09:00:00Z',
  };

  const inst1 = generateInstallments(loan1);
  const inst2 = generateInstallments(loan2);
  if (inst1[0]) { inst1[0].status = 'Paid'; inst1[0].amountPaid = inst1[0].amountDue; inst1[0].paymentDate = '2026-03-20'; inst1[0].paymentMethod = 'Bank Transfer'; }
  if (inst1[1]) { inst1[1].status = 'Paid'; inst1[1].amountPaid = inst1[1].amountDue; inst1[1].paymentDate = '2026-04-20'; inst1[1].paymentMethod = 'UPI'; }
  if (inst1[2]) { inst1[2].status = 'Paid'; inst1[2].amountPaid = inst1[2].amountDue; inst1[2].paymentDate = '2026-05-20'; inst1[2].paymentMethod = 'Cash'; }
  if (inst1[3]) { inst1[3].status = 'Overdue'; }
  if (inst2[0]) { inst2[0].status = 'Paid'; inst2[0].amountPaid = inst2[0].amountDue; inst2[0].paymentDate = '2026-04-25'; inst2[0].paymentMethod = 'Bank Transfer'; }
  if (inst2[1]) { inst2[1].status = 'Paid'; inst2[1].amountPaid = inst2[1].amountDue; inst2[1].paymentDate = '2026-05-25'; inst2[1].paymentMethod = 'Bank Transfer'; }
  if (inst2[2]) { inst2[2].status = 'Overdue'; }

  const interactions = [
    { id: uuid(), entityId: leads[0].id, entityType: 'Lead', officerName: 'Raj Kumar', interactionType: 'Call', date: '2026-06-10', outcome: 'Interested', notes: 'Discussed personal loan options for wedding in December. Will send documentation checklist.', nextFollowUpDate: '2026-06-15', createdAt: '2026-06-10T10:30:00Z' },
    { id: uuid(), entityId: leads[1].id, entityType: 'Lead', officerName: 'Meera Nair', interactionType: 'WhatsApp', date: '2026-06-11', outcome: 'Follow Up Later', notes: 'Shared vehicle loan brochure. Client will discuss with family.', nextFollowUpDate: '2026-06-14', createdAt: '2026-06-11T14:00:00Z' },
    { id: uuid(), entityId: 'bwr-001', entityType: 'Borrower', officerName: 'Raj Kumar', interactionType: 'Email', date: '2026-06-09', outcome: 'Documents Pending', notes: 'Sent reminder for pending salary slips for vehicle loan application.', nextFollowUpDate: '2026-06-14', createdAt: '2026-06-09T09:00:00Z' },
    { id: uuid(), entityId: 'bwr-002', entityType: 'Borrower', officerName: 'Meera Nair', interactionType: 'Meeting', date: '2026-06-08', outcome: 'Interested', notes: 'Quarterly review meeting. Business growing well, may apply for additional working capital.', nextFollowUpDate: '2026-06-22', createdAt: '2026-06-08T15:00:00Z' },
    { id: uuid(), entityId: 'bwr-003', entityType: 'Borrower', officerName: 'Raj Kumar', interactionType: 'Call', date: '2026-06-12', outcome: 'No Response', notes: 'Called to discuss education loan application under review. No answer.', nextFollowUpDate: '2026-06-13', createdAt: '2026-06-12T11:00:00Z' },
    { id: uuid(), entityId: leads[2].id, entityType: 'Lead', officerName: 'Raj Kumar', interactionType: 'Field Visit', date: '2026-06-07', outcome: 'Interested', notes: 'Visited home. Verified address. Family supportive of education loan.', nextFollowUpDate: '2026-06-16', createdAt: '2026-06-07T16:00:00Z' },
    { id: uuid(), entityId: 'bwr-005', entityType: 'Borrower', officerName: 'Meera Nair', interactionType: 'SMS', date: '2026-06-11', outcome: 'No Response', notes: 'Sent SMS regarding rejected application. Suggested ways to improve credit score.', nextFollowUpDate: null, createdAt: '2026-06-11T10:00:00Z' },
  ];

  const payload = {
    leads,
    borrowers,
    applications,
    loans: [loan1, loan2],
    installments: [...inst1, ...inst2],
    interactions
  };

  try {
    const res = await fetch(`${API_BASE}/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      saveAll(KEYS.LEADS, leads);
      saveAll(KEYS.BORROWERS, borrowers);
      saveAll(KEYS.APPLICATIONS, applications);
      saveAll(KEYS.LOANS, [loan1, loan2]);
      saveAll(KEYS.INSTALLMENTS, [...inst1, ...inst2]);
      saveAll(KEYS.INTERACTIONS, interactions);
      localStorage.setItem('crm_seeded', 'true');
    }
  } catch (err) {
    console.error('Seed failed', err);
  }
}

// ─── Convenience helpers ───
export function getBorrowerName(borrowerId) {
  const b = getById(KEYS.BORROWERS, borrowerId);
  return b ? b.fullName : 'Unknown';
}

export function getLeadName(leadId) {
  const l = getById(KEYS.LEADS, leadId);
  return l ? l.fullName : 'Unknown';
}

export function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
