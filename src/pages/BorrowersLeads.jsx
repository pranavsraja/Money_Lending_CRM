import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MapPin, Phone, Mail, Briefcase, IndianRupee, Building, FileText, CheckCircle2, XCircle, Edit, Trash2, Eye, UserCheck, X, Filter, SlidersHorizontal, Scan, Info } from 'lucide-react';
import { useStore } from '../data/useStore';
import { KEYS, formatDate, create } from '../data/store';

const LEAD_STATUSES = ['New', 'Contacted', 'Interested', 'Not Interested', 'Converted'];
const LEAD_SOURCES = ['Referral', 'Walk-in', 'Website', 'Social Media', 'Agent'];

export default function BorrowersLeads() {
  const navigate = useNavigate();
  const { items: leads, addItem: addLead, updateItem: updateLead, removeItem: removeLead } = useStore(KEYS.LEADS);
  const { items: borrowers, addItem: addBorrower, updateItem: updateBorrower, removeItem: removeBorrower } = useStore(KEYS.BORROWERS);

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [modalType, setModalType] = useState('lead');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [mergeReport, setMergeReport] = useState(null);

  // ─── Advanced Filters ───
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterCibilMin, setFilterCibilMin] = useState('');
  const [filterCibilMax, setFilterCibilMax] = useState('');
  const [filterDocsVerified, setFilterDocsVerified] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (filterSource !== 'all') count++;
    if (filterCibilMin) count++;
    if (filterCibilMax) count++;
    if (filterDocsVerified !== 'all') count++;
    return count;
  }, [filterStatus, filterSource, filterCibilMin, filterCibilMax, filterDocsVerified]);

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterSource('all');
    setFilterCibilMin('');
    setFilterCibilMax('');
    setFilterDocsVerified('all');
    setSortField('name');
    setSortDir('asc');
  };

  const combined = useMemo(() => {
    let items = [
      ...leads.map(l => ({ ...l, entityType: 'Lead' })),
      ...borrowers.map(b => ({ ...b, entityType: 'Borrower', status: b.documentsVerified ? 'Active' : 'Pending' })),
    ];

    // Tab filter
    if (activeTab === 'leads') items = items.filter(i => i.entityType === 'Lead' && i.status !== 'Converted');
    else if (activeTab === 'active') items = items.filter(i => i.entityType === 'Borrower');
    else if (activeTab === 'defaulters') {
      const defaultedBorrowerIds = new Set();
      const loans = JSON.parse(localStorage.getItem(KEYS.LOANS) || '[]');
      loans.filter(l => l.status === 'Defaulted').forEach(l => defaultedBorrowerIds.add(l.borrowerId));
      const installments = JSON.parse(localStorage.getItem(KEYS.INSTALLMENTS) || '[]');
      installments.filter(i => i.status === 'Overdue').forEach(i => {
        const loan = loans.find(l => l.id === i.loanId);
        if (loan) defaultedBorrowerIds.add(loan.borrowerId);
      });
      items = items.filter(i => i.entityType === 'Borrower' && defaultedBorrowerIds.has(i.id));
    }

    // Text search
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => i.fullName?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q) || i.phone?.includes(q));
    }

    // Status filter
    if (filterStatus !== 'all') {
      items = items.filter(i => i.status === filterStatus);
    }

    // Source filter (leads only)
    if (filterSource !== 'all') {
      items = items.filter(i => i.source === filterSource);
    }

    // CIBIL filter
    if (filterCibilMin) {
      items = items.filter(i => (i.creditScore || 0) >= Number(filterCibilMin));
    }
    if (filterCibilMax) {
      items = items.filter(i => i.creditScore && i.creditScore <= Number(filterCibilMax));
    }

    // Docs verified filter
    if (filterDocsVerified !== 'all') {
      const target = filterDocsVerified === 'yes';
      items = items.filter(i => i.documentsVerified === target);
    }

    // Sorting
    items.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = (a.fullName || '').localeCompare(b.fullName || '');
      else if (sortField === 'cibil') cmp = (a.creditScore || 0) - (b.creditScore || 0);
      else if (sortField === 'type') cmp = a.entityType.localeCompare(b.entityType);
      else if (sortField === 'status') cmp = (a.status || '').localeCompare(b.status || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [leads, borrowers, activeTab, search, filterStatus, filterSource, filterCibilMin, filterCibilMax, filterDocsVerified, sortField, sortDir]);

  const getCibilClass = (score) => {
    if (!score) return '';
    if (score >= 750) return 'excellent';
    if (score >= 700) return 'good';
    if (score >= 500) return 'fair';
    return 'poor';
  };

  const openAdd = (type) => {
    setEditItem(null);
    setModalType(type);
    setModalError(null);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setModalType(item.entityType === 'Lead' ? 'lead' : 'borrower');
    setModalError(null);
    setShowModal(true);
  };

  const handleConvert = (lead) => {
    const newBorrower = {
      leadId: lead.id,
      fullName: lead.fullName,
      dob: '',
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      nationalId: '',
      panNumber: '',
      aadhaarNumber: '',
      occupation: '',
      employer: '',
      monthlyIncome: 0,
      creditScore: 0,
      documentsVerified: false,
    };
    addBorrower(newBorrower);
    updateLead(lead.id, { status: 'Converted' });
  };

  const handleSave = (e) => {
    e.preventDefault();
    setModalError(null);
    
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if (data.monthlyIncome) data.monthlyIncome = Number(data.monthlyIncome);
    if (data.creditScore) data.creditScore = Number(data.creditScore);
    if (data.documentsVerified) data.documentsVerified = data.documentsVerified === 'true';

    // Cross-reference Validation
    const isEditing = !!editItem;
    const currentId = isEditing ? editItem.id : null;
    const fullName = data.fullName?.trim().toLowerCase();
    const phone = data.phone?.trim();
    const email = data.email?.trim().toLowerCase();
    const pan = data.panNumber?.trim().toUpperCase();
    const aadhaar = data.aadhaarNumber?.trim();

    if (modalType === 'lead') {
      // 1. Cross-collection check
      const duplicateBorrower = borrowers.find(b => 
        b.id !== currentId && 
        ((phone && b.phone === phone) || (email && b.email?.toLowerCase() === email) || (fullName && b.fullName?.toLowerCase() === fullName))
      );
      if (duplicateBorrower) {
        setModalError("This person is already an active Borrower. Please add the new application directly to their Borrower profile.");
        return;
      }

      // 2. Internal collection check
      const duplicateLead = leads.find(l => 
        l.id !== currentId && l.status !== 'Converted' &&
        ((phone && l.phone === phone) || (email && l.email?.toLowerCase() === email) || (fullName && l.fullName?.toLowerCase() === fullName))
      );
      if (duplicateLead) {
        setModalError("A Lead with this Name, Phone, or Email already exists.");
        return;
      }

    } else {
      // 1. Cross-collection check
      const duplicateLead = leads.find(l => 
        l.status !== 'Converted' && l.id !== data.leadId && 
        ((phone && l.phone === phone) || (email && l.email?.toLowerCase() === email) || (fullName && l.fullName?.toLowerCase() === fullName))
      );
      if (duplicateLead) {
        setModalError("This person already exists as an active Lead. Please find their Lead profile and use the 'Convert' button.");
        return;
      }

      // 2. Internal collection check
      const duplicateBorrower = borrowers.find(b => {
        if (b.id === currentId) return false;
        if (fullName && b.fullName?.toLowerCase() === fullName) return true;
        if (phone && b.phone === phone) return true;
        if (email && b.email?.toLowerCase() === email) return true;
        if (pan && b.panNumber?.toUpperCase() === pan) return true;
        if (aadhaar && b.aadhaarNumber === aadhaar) return true;
        return false;
      });
      if (duplicateBorrower) {
        setModalError("A Borrower with this Name, Phone, Email, PAN, or Aadhaar already exists.");
        return;
      }
    }

    if (isEditing) {
      if (modalType === 'lead') updateLead(editItem.id, data);
      else updateBorrower(editItem.id, data);
    } else {
      if (modalType === 'lead') addLead(data);
      else addBorrower(data);
    }
    setShowModal(false);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.entityType === 'Lead') removeLead(deleteConfirm.id);
    else removeBorrower(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const handleMergeDuplicates = () => {
    let convertedLeads = 0;
    let removedLeads = 0;
    let removedBorrowers = 0;

    let currentLeads = [...leads];
    let currentBorrowers = [...borrowers];

    const isMatch = (a, b) => {
      if (a.id === b.id) return false;
      const nameA = a.fullName?.trim().toLowerCase();
      const nameB = b.fullName?.trim().toLowerCase();
      if (nameA && nameA === nameB) return true;
      
      const phoneA = a.phone?.trim();
      const phoneB = b.phone?.trim();
      if (phoneA && phoneA === phoneB) return true;

      const emailA = a.email?.trim().toLowerCase();
      const emailB = b.email?.trim().toLowerCase();
      if (emailA && emailA === emailB) return true;
      
      return false;
    };

    // 1. Cross-Collection: Lead vs Borrower
    for (let l of currentLeads) {
      if (l.status === 'Converted') continue;
      const match = currentBorrowers.find(b => isMatch(l, b));
      if (match) {
        updateLead(l.id, { status: 'Converted' });
        l.status = 'Converted';
        convertedLeads++;
      }
    }

    // 2. Internal: Lead vs Lead
    currentLeads.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    const leadsToRemove = new Set();
    for (let i = 0; i < currentLeads.length; i++) {
      const a = currentLeads[i];
      if (leadsToRemove.has(a.id)) continue;
      if (a.status === 'Converted') continue;
      
      for (let j = i + 1; j < currentLeads.length; j++) {
        const b = currentLeads[j];
        if (leadsToRemove.has(b.id)) continue;
        if (isMatch(a, b)) {
          leadsToRemove.add(a.id); // keep the older one (a), remove newer one (b) - wait, user said "keep newest". Let's remove 'a' instead!
          // Actually, 'a' is older. Let's remove 'a' and keep 'b'.
          leadsToRemove.add(a.id);
          removeLead(a.id);
          removedLeads++;
          break;
        }
      }
    }

    // 3. Internal: Borrower vs Borrower
    currentBorrowers.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    const borrowersToRemove = new Set();
    for (let i = 0; i < currentBorrowers.length; i++) {
      const a = currentBorrowers[i];
      if (borrowersToRemove.has(a.id)) continue;

      for (let j = i + 1; j < currentBorrowers.length; j++) {
        const b = currentBorrowers[j];
        if (borrowersToRemove.has(b.id)) continue;
        if (isMatch(a, b)) {
          borrowersToRemove.add(a.id);
          removeBorrower(a.id);
          removedBorrowers++;
          break;
        }
      }
    }

    setMergeReport({ convertedLeads, removedLeads, removedBorrowers });
    setTimeout(() => setMergeReport(null), 8000);
  };

  const tabCounts = {
    all: leads.length + borrowers.length,
    leads: leads.filter(l => l.status !== 'Converted').length,
    active: borrowers.length,
    defaulters: (() => {
      const defaultedBorrowerIds = new Set();
      const loans = JSON.parse(localStorage.getItem(KEYS.LOANS) || '[]');
      loans.filter(l => l.status === 'Defaulted').forEach(l => defaultedBorrowerIds.add(l.borrowerId));
      const installments = JSON.parse(localStorage.getItem(KEYS.INSTALLMENTS) || '[]');
      installments.filter(i => i.status === 'Overdue').forEach(i => {
        const loan = loans.find(l => l.id === i.loanId);
        if (loan) defaultedBorrowerIds.add(loan.borrowerId);
      });
      return defaultedBorrowerIds.size;
    })(),
  };

  // Unique statuses for filter dropdown
  const allStatuses = useMemo(() => {
    const s = new Set();
    leads.forEach(l => s.add(l.status));
    borrowers.forEach(b => s.add(b.documentsVerified ? 'Active' : 'Pending'));
    return [...s].sort();
  }, [leads, borrowers]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Borrowers & Leads</h2>
          <p>Manage your contacts and pipeline</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={handleMergeDuplicates} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}><Scan size={16} /> Scan & Merge Duplicates</button>
          <button className="btn btn-secondary" onClick={() => openAdd('lead')}><Plus size={16} /> Add Lead</button>
          <button className="btn btn-primary" onClick={() => openAdd('borrower')}><Plus size={16} /> Add Borrower</button>
        </div>
      </div>

      {mergeReport && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderLeft: '3px solid var(--accent-emerald)', padding: '12px 16px', borderRadius: 4, marginBottom: 24, color: 'var(--accent-emerald)', fontSize: '0.9rem', display: 'flex', gap: 8, alignItems: 'center' }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <div><strong>Cleanup Complete!</strong> Converted {mergeReport.convertedLeads} matching leads to borrowers. Removed {mergeReport.removedLeads} duplicate leads and {mergeReport.removedBorrowers} duplicate borrowers.</div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'all', label: 'All' },
          { key: 'leads', label: 'Leads' },
          { key: 'active', label: 'Active Borrowers' },
          { key: 'defaulters', label: 'Defaulters' },
        ].map(tab => (
          <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
            <span className="tab-count">{tabCounts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* Search + Filter Toggle */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search />
          <input className="search-input" placeholder="Search by name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={`btn btn-secondary filter-toggle ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal size={16} />
          Filters
          {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
        </button>
        <select className="filter-select" value={`${sortField}-${sortDir}`} onChange={e => {
          const [f, d] = e.target.value.split('-');
          setSortField(f);
          setSortDir(d);
        }}>
          <option value="name-asc">Name A→Z</option>
          <option value="name-desc">Name Z→A</option>
          <option value="cibil-desc">CIBIL High→Low</option>
          <option value="cibil-asc">CIBIL Low→High</option>
          <option value="type-asc">Type A→Z</option>
          <option value="status-asc">Status A→Z</option>
        </select>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="advanced-filters-panel">
          <div className="filter-grid">
            <div className="form-group">
              <label>Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All Statuses</option>
                {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Lead Source</label>
              <select value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                <option value="all">All Sources</option>
                {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>CIBIL Min</label>
              <input type="number" min="0" max="900" placeholder="e.g. 500" value={filterCibilMin} onChange={e => setFilterCibilMin(e.target.value)} />
            </div>
            <div className="form-group">
              <label>CIBIL Max</label>
              <input type="number" min="0" max="900" placeholder="e.g. 800" value={filterCibilMax} onChange={e => setFilterCibilMax(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Docs Verified</label>
              <select value={filterDocsVerified} onChange={e => setFilterDocsVerified(e.target.value)}>
                <option value="all">All</option>
                <option value="yes">Verified ✓</option>
                <option value="no">Not Verified ✕</option>
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={clearFilters} style={{ width: '100%' }}>
                <X size={14} /> Clear All
              </button>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="active-filters-summary">
              Showing {combined.length} result{combined.length !== 1 ? 's' : ''} with {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Contact</th>
              <th>Status</th>
              <th>CIBIL Score</th>
              <th>Docs Verified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {combined.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No records found</td></tr>
            ) : combined.map(item => (
              <tr key={item.id}>
                <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.fullName}</td>
                <td><span className={`status-badge ${item.entityType === 'Lead' ? 'new' : 'active'}`}>{item.entityType}</span></td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>{item.phone}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.email}</div>
                </td>
                <td>
                  <span className={`status-badge ${(item.status || '').toLowerCase().replace(/ /g, '-')}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  {item.creditScore ? (
                    <span className={`cibil-score ${getCibilClass(item.creditScore)}`}>{item.creditScore}</span>
                  ) : '—'}
                </td>
                <td>{item.documentsVerified != null ? (item.documentsVerified ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} /> : <XCircle size={16} style={{ color: 'var(--danger)' }} />) : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {item.entityType === 'Borrower' && (
                      <button className="btn-icon" title="View Profile" onClick={() => navigate(`/borrowers/${item.id}`)}><Eye size={15} /></button>
                    )}
                    <button className="btn-icon" title="Edit" onClick={() => openEdit(item)}><Edit size={15} /></button>
                    {item.entityType === 'Lead' && item.status !== 'Converted' && (
                      <button className="btn-icon" title="Convert to Borrower" onClick={() => handleConvert(item)} style={{ color: 'var(--accent-emerald)' }}><UserCheck size={15} /></button>
                    )}
                    <button className="btn-icon" title="Delete" onClick={() => setDeleteConfirm(item)} style={{ color: 'var(--accent-rose)' }}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? 'Edit' : 'Add'} {modalType === 'lead' ? 'Lead' : 'Borrower'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {modalError && (
                  <div style={{ background: 'rgba(244, 63, 94, 0.1)', borderLeft: '3px solid #f43f5e', padding: '12px 16px', borderRadius: 4, marginBottom: 20, color: '#f43f5e', fontSize: '0.9rem', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div><strong>Validation Failed:</strong><br/>{modalError}</div>
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input name="fullName" defaultValue={editItem?.fullName || ''} required />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input name="phone" defaultValue={editItem?.phone || ''} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input name="email" type="email" defaultValue={editItem?.email || ''} />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <input name="address" defaultValue={editItem?.address || ''} />
                  </div>
                </div>

                {modalType === 'lead' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Source</label>
                      <select name="source" defaultValue={editItem?.source || 'Website'}>
                        {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select name="status" defaultValue={editItem?.status || 'New'}>
                        {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {modalType === 'lead' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Assigned Officer</label>
                      <input name="assignedOfficer" defaultValue={editItem?.assignedOfficer || ''} />
                    </div>
                    <div className="form-group">
                      <label>Next Follow-Up</label>
                      <input name="nextFollowUpDate" type="date" defaultValue={editItem?.nextFollowUpDate || ''} />
                    </div>
                  </div>
                )}

                {modalType === 'borrower' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Date of Birth</label>
                        <input name="dob" type="date" defaultValue={editItem?.dob || ''} />
                      </div>
                      <div className="form-group">
                        <label>Occupation</label>
                        <input name="occupation" defaultValue={editItem?.occupation || ''} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Employer</label>
                        <input name="employer" defaultValue={editItem?.employer || ''} />
                      </div>
                      <div className="form-group">
                        <label>Monthly Income</label>
                        <input name="monthlyIncome" type="number" defaultValue={editItem?.monthlyIncome || ''} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>PAN Number</label>
                        <input name="panNumber" defaultValue={editItem?.panNumber || ''} />
                      </div>
                      <div className="form-group">
                        <label>Aadhaar Number</label>
                        <input name="aadhaarNumber" defaultValue={editItem?.aadhaarNumber || ''} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Credit / CIBIL Score</label>
                        <input name="creditScore" type="number" min="0" max="900" defaultValue={editItem?.creditScore || ''} />
                      </div>
                      <div className="form-group">
                        <label>Documents Verified</label>
                        <select name="documentsVerified" defaultValue={String(editItem?.documentsVerified ?? false)}>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {modalType === 'lead' && (
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea name="notes" defaultValue={editItem?.notes || ''} />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add'}</button>
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
              <h3>Confirm Delete</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{deleteConfirm.fullName}</strong>? This action cannot be undone.</p>
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
