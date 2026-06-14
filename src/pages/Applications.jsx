import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { useStore } from '../data/useStore';
import { KEYS, formatCurrency, formatDate, getBorrowerName, calculateEMI, getAll, generateInstallments, saveAll, create } from '../data/store';

const LOAN_TYPES = ['Personal', 'Business', 'Education', 'Vehicle'];
const STATUSES = ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'];

export default function Applications() {
  const { items: applications, addItem, updateItem, removeItem, refresh } = useStore(KEYS.APPLICATIONS);
  const borrowers = useMemo(() => getAll(KEYS.BORROWERS), []);
  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editApp, setEditApp] = useState(null);
  const [emiPreview, setEmiPreview] = useState({ amount: 0, rate: 0, tenure: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return applications;
    const statusMap = {
      pending: 'Submitted',
      review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected',
      draft: 'Draft',
    };
    return applications.filter(a => a.status === statusMap[activeTab]);
  }, [applications, activeTab]);

  const counts = {
    all: applications.length,
    draft: applications.filter(a => a.status === 'Draft').length,
    pending: applications.filter(a => a.status === 'Submitted').length,
    review: applications.filter(a => a.status === 'Under Review').length,
    approved: applications.filter(a => a.status === 'Approved').length,
    rejected: applications.filter(a => a.status === 'Rejected').length,
  };

  const previewEMI = calculateEMI(emiPreview.amount, emiPreview.rate, emiPreview.tenure);

  const openAdd = () => {
    setEditApp(null);
    setEmiPreview({ amount: 0, rate: 0, tenure: 0 });
    setShowModal(true);
  };

  const openEdit = (app) => {
    setEditApp(app);
    setEmiPreview({ amount: app.requestedAmount, rate: app.interestRate, tenure: app.tenureMonths });
    setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      borrowerId: fd.get('borrowerId'),
      loanType: fd.get('loanType'),
      requestedAmount: Number(fd.get('requestedAmount')),
      interestRate: Number(fd.get('interestRate')),
      tenureMonths: Number(fd.get('tenureMonths')),
      status: fd.get('status'),
      reviewNotes: fd.get('reviewNotes') || '',
      emiPreviewAmount: calculateEMI(Number(fd.get('requestedAmount')), Number(fd.get('interestRate')), Number(fd.get('tenureMonths'))),
      submissionDate: fd.get('status') !== 'Draft' ? new Date().toISOString().split('T')[0] : null,
    };

    if (editApp) {
      updateItem(editApp.id, data);
      // If status changed to Approved, create a loan
      if (data.status === 'Approved' && editApp.status !== 'Approved') {
        createLoanFromApp({ ...editApp, ...data });
      }
    } else {
      const newApp = addItem(data);
      if (data.status === 'Approved') {
        createLoanFromApp(newApp);
      }
    }
    setShowModal(false);
  };

  const createLoanFromApp = (app) => {
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (app.tenureMonths || 12));
    const emi = calculateEMI(app.requestedAmount, app.interestRate, app.tenureMonths);

    const loan = {
      applicationId: app.id,
      borrowerId: app.borrowerId,
      loanType: app.loanType,
      principalAmount: app.requestedAmount,
      interestRate: app.interestRate,
      tenureMonths: app.tenureMonths,
      emiAmount: emi,
      startDate,
      endDate: endDate.toISOString().split('T')[0],
      disbursementDate: startDate,
      outstandingBalance: app.requestedAmount,
      status: 'Active',
    };

    const newLoan = create(KEYS.LOANS, loan);

    const installments = generateInstallments(newLoan);
    installments.forEach(inst => create(KEYS.INSTALLMENTS, inst));
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      removeItem(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Loan Applications</h2>
          <p>Track and manage loan requests</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> New Application</button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'all', label: 'All' },
          { key: 'draft', label: 'Draft' },
          { key: 'pending', label: 'Pending' },
          { key: 'review', label: 'Under Review' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
        ].map(tab => (
          <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            {tab.label} <span className="tab-count">{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state"><p>No applications in this category</p></div>
      ) : (
        <div className="loan-cards-grid">
          {filtered.map(app => (
            <div key={app.id} className="loan-app-card">
              <div className="card-top">
                <div className="card-amount">{formatCurrency(app.requestedAmount)}</div>
                <span className={`status-badge ${app.status.toLowerCase().replace(/ /g, '-')}`}>{app.status}</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                {getBorrowerName(app.borrowerId)}
              </div>
              <div className="card-meta">
                <div className="meta-item">Type <span>{app.loanType}</span></div>
                <div className="meta-item">Tenure <span>{app.tenureMonths} months</span></div>
                <div className="meta-item">Rate <span>{app.interestRate}% p.a.</span></div>
                <div className="meta-item">EMI <span>{formatCurrency(app.emiPreviewAmount)}</span></div>
              </div>
              <div className="card-actions">
                <button className="btn btn-sm btn-secondary" onClick={() => openEdit(app)}><Edit size={14} /> Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(app)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editApp ? 'Edit Application' : 'New Loan Application'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Borrower</label>
                    <select name="borrowerId" defaultValue={editApp?.borrowerId || ''} required>
                      <option value="">Select borrower...</option>
                      {borrowers.map(b => <option key={b.id} value={b.id}>{b.fullName}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Loan Type</label>
                    <select name="loanType" defaultValue={editApp?.loanType || 'Personal'}>
                      {LOAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Loan Amount (₹)</label>
                    <input name="requestedAmount" type="number" required defaultValue={editApp?.requestedAmount || ''}
                      onChange={e => setEmiPreview(p => ({ ...p, amount: Number(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label>Interest Rate (% p.a.)</label>
                    <input name="interestRate" type="number" step="0.1" required defaultValue={editApp?.interestRate || ''}
                      onChange={e => setEmiPreview(p => ({ ...p, rate: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tenure (Months)</label>
                    <input name="tenureMonths" type="number" required defaultValue={editApp?.tenureMonths || ''}
                      onChange={e => setEmiPreview(p => ({ ...p, tenure: Number(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" defaultValue={editApp?.status || 'Draft'}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Live EMI Preview */}
                {previewEMI > 0 && (
                  <div className="emi-preview">
                    <div className="emi-label">Estimated Monthly EMI</div>
                    <div className="emi-amount">{formatCurrency(previewEMI)}</div>
                    <div className="emi-detail">
                      Total Payable: {formatCurrency(previewEMI * emiPreview.tenure)} · Interest: {formatCurrency(previewEMI * emiPreview.tenure - emiPreview.amount)}
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                  <label>Review Notes</label>
                  <textarea name="reviewNotes" defaultValue={editApp?.reviewNotes || ''} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editApp ? 'Save' : 'Submit Application'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Delete Application</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p>Delete application for <strong>{formatCurrency(deleteConfirm.requestedAmount)}</strong>?</p>
              <div className="confirm-actions">
                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
