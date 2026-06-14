import { useState, useMemo, useEffect } from 'react';
import { CheckCircle, AlertCircle, X, CreditCard, Wallet, TrendingUp, AlertTriangle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '../data/useStore';
import { KEYS, formatCurrency, formatDate, getBorrowerName, calculateEMI } from '../data/store';

export default function Repayments() {
  const { items: installments, updateItem, replaceAll: replaceAllInstallments } = useStore(KEYS.INSTALLMENTS);
  const { items: loans, updateItem: updateLoan } = useStore(KEYS.LOANS);
  const { items: applications } = useStore(KEYS.APPLICATIONS);
  
  const activeLoans = useMemo(() => loans.filter(l => l.status === 'Active'), [loans]);
  
  const groupedBorrowers = useMemo(() => {
    const map = {};
    activeLoans.forEach(loan => {
      if (!map[loan.borrowerId]) map[loan.borrowerId] = { borrowerId: loan.borrowerId, loans: [] };
      map[loan.borrowerId].loans.push(loan);
    });
    return Object.values(map);
  }, [activeLoans]);
  
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [expandedBorrowerId, setExpandedBorrowerId] = useState(null);
  const [showPayModal, setShowPayModal] = useState(null);
  const [emiFilter, setEmiFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [payAmountInput, setPayAmountInput] = useState('');

  // Reactively auto-select the first loan if none is selected
  const effectiveSelectedId = selectedLoanId || activeLoans[0]?.id || null;
  const selectedLoan = activeLoans.find(l => l.id === effectiveSelectedId);

  // Auto-expand the borrower that has the selected loan
  useEffect(() => {
    if (effectiveSelectedId) {
      const loan = activeLoans.find(l => l.id === effectiveSelectedId);
      if (loan) setExpandedBorrowerId(loan.borrowerId);
    }
  }, [effectiveSelectedId, activeLoans]);

  const loanInstallments = useMemo(() => {
    let filtered = installments.filter(i => i.loanId === effectiveSelectedId);
    if (emiFilter !== 'all') filtered = filtered.filter(i => i.status === emiFilter);
    if (methodFilter !== 'all') filtered = filtered.filter(i => i.paymentMethod === methodFilter);
    return filtered.sort((a, b) => a.installmentNumber - b.installmentNumber);
  }, [installments, effectiveSelectedId, emiFilter, methodFilter]);

  const totalPaid = loanInstallments.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amountPaid, 0);
  const totalDue = loanInstallments.reduce((s, i) => s + i.amountDue, 0);
  const totalOverdue = loanInstallments.filter(i => i.status === 'Overdue').reduce((s, i) => s + (i.amountDue - i.amountPaid), 0);

  const getProgressPct = (loan) => {
    if (!loan) return 0;
    const li = installments.filter(i => i.loanId === loan.id);
    const paid = li.filter(i => i.status === 'Paid').length;
    return li.length ? Math.round((paid / li.length) * 100) : 0;
  };

  const getProgressClass = (pct) => {
    if (pct >= 60) return 'good';
    if (pct >= 30) return 'warning';
    return 'danger';
  };

  const handleMarkPaid = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const amountPaid = Number(fd.get('amountPaid'));
    const amountDue = showPayModal.amountDue;
    const loan = activeLoans.find(l => l.id === showPayModal.loanId);

    const paymentDate = fd.get('paymentDate');
    const paymentMethod = fd.get('paymentMethod');

    // Calculate interest for this month
    const interestForMonth = (loan.outstandingBalance * (loan.interestRate / 100)) / 12;
    // Calculate how much went to principal
    const principalPaid = Math.max(0, amountPaid - interestForMonth);
    const newOutstanding = Math.max(0, loan.outstandingBalance - principalPaid);

    if (amountPaid > amountDue) {
      if (newOutstanding === 0) {
        // Loan fully closed!
        updateLoan(loan.id, { outstandingBalance: 0, status: 'Closed' });
        const newInsts = installments.map(i => {
          if (i.id === showPayModal.id) return { ...i, status: 'Paid', amountPaid, paymentDate, paymentMethod };
          if (i.loanId === loan.id && i.status === 'Pending') return { ...i, status: 'Paid', amountPaid: 0, amountDue: 0 };
          return i;
        });
        replaceAllInstallments(newInsts);
      } else {
        // Prepayment! Recalculate remaining EMIs
        const pending = installments.filter(i => i.loanId === loan.id && i.status === 'Pending' && i.id !== showPayModal.id);
        const remainingCount = pending.length;
        
        if (remainingCount > 0) {
           const newEmi = calculateEMI(newOutstanding, loan.interestRate, remainingCount);
           updateLoan(loan.id, { outstandingBalance: newOutstanding, emiAmount: newEmi });
           
           const newInsts = installments.map(i => {
             if (i.id === showPayModal.id) return { ...i, status: 'Paid', amountPaid, paymentDate, paymentMethod };
             if (i.loanId === loan.id && i.status === 'Pending') return { ...i, amountDue: newEmi };
             return i;
           });
           replaceAllInstallments(newInsts);
        } else {
           updateLoan(loan.id, { outstandingBalance: newOutstanding });
           updateItem(showPayModal.id, { status: 'Paid', amountPaid, paymentDate, paymentMethod });
        }
      }
    } else {
      // Normal payment or underpayment
      const status = amountPaid < amountDue ? 'Partially Paid' : 'Paid';
      updateLoan(loan.id, { outstandingBalance: newOutstanding });
      updateItem(showPayModal.id, { status, amountPaid, paymentDate, paymentMethod });
    }
    
    setShowPayModal(null);
  };

  const handleMarkOverdue = (inst) => {
    updateItem(inst.id, { status: 'Overdue' });
  };

  const overdueCount = (loan) => installments.filter(i => i.loanId === loan.id && i.status === 'Overdue').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Repayments</h2>
          <p>Track EMI schedules, collections, and overdue accounts</p>
        </div>
      </div>

      <div className="repayments-layout" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-lg)', alignItems: 'start' }}>
        {/* Left: Loan Selector */}
        <div className="loan-selector glass-panel" style={{ padding: 'var(--space-md)', maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-md)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Active Loans</span>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 12 }}>{activeLoans.length}</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {groupedBorrowers.map(group => {
              const isExpanded = expandedBorrowerId === group.borrowerId;
              
              // Calculate borrower-level metrics
              let totalOverdueForBorrower = 0;
              group.loans.forEach(loan => { totalOverdueForBorrower += overdueCount(loan); });
              
              return (
                <div 
                  key={group.borrowerId} 
                  className="borrower-accordion-card"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    boxShadow: isExpanded ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  {/* Accordion Header */}
                  <div 
                    onClick={() => setExpandedBorrowerId(isExpanded ? null : group.borrowerId)}
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: isExpanded ? 'rgba(0,0,0,0.02)' : 'transparent'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {getBorrowerName(group.borrowerId)}
                        {totalOverdueForBorrower > 0 && <AlertCircle size={14} color="#f43f5e" />}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {group.loans.length} active loan{group.loans.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div>
                      {isExpanded ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
                    </div>
                  </div>

                  {/* Accordion Body (Loans List) */}
                  {isExpanded && (
                    <div style={{ padding: '0 12px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {group.loans.map(loan => {
                        const pct = getProgressPct(loan);
                        const oc = overdueCount(loan);
                        const isSelected = effectiveSelectedId === loan.id;
                        const app = applications.find(a => a.id === loan.applicationId);
                        const loanType = app ? app.loanType : 'Loan';

                        return (
                          <div 
                            key={loan.id}
                            onClick={() => setSelectedLoanId(loan.id)}
                            style={{
                              padding: '10px 12px',
                              background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-input)',
                              border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.4)' : 'transparent'}`,
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: isSelected ? 'var(--accent-indigo)' : 'var(--text-secondary)' }}>
                                {loanType}
                              </span>
                              {oc > 0 && <span className="status-badge overdue" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>{oc} overdue</span>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                              {formatCurrency(loan.principalAmount)} · EMI {formatCurrency(loan.emiAmount)}
                            </div>
                            <div className="progress-bar-wrapper" style={{ height: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                              <div className={`progress-bar-fill ${getProgressClass(pct)}`} style={{ width: `${pct}%`, height: '100%' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            
            {groupedBorrowers.length === 0 && (
              <div className="empty-state" style={{ padding: 'var(--space-xl) 0' }}>
                <CreditCard size={32} style={{ opacity: 0.5, marginBottom: 'var(--space-sm)' }} />
                <p>No active loans found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: EMI Schedule */}
        <div className="emi-schedule-panel">
          {selectedLoan ? (
            <>
              {/* Premium Dashboard Totals */}
              <div className="emi-totals" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                <div className="emi-total-card glass-panel" style={{ padding: 'var(--space-lg)', borderLeft: '4px solid var(--text-muted)' }}>
                  <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}><Wallet size={16} /> Total Due</div>
                  <div className="value" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(totalDue)}</div>
                </div>
                <div className="emi-total-card glass-panel" style={{ padding: 'var(--space-lg)', borderLeft: '4px solid #10b981' }}>
                  <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}><TrendingUp size={16} color="#10b981" /> Collected</div>
                  <div className="value emerald" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>{formatCurrency(totalPaid)}</div>
                </div>
                <div className="emi-total-card glass-panel" style={{ padding: 'var(--space-lg)', borderLeft: '4px solid #f43f5e' }}>
                  <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}><AlertTriangle size={16} color="#f43f5e" /> Overdue</div>
                  <div className="value rose" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f43f5e' }}>{formatCurrency(totalOverdue)}</div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                  <h3 style={{ margin: 0 }}>EMI Schedule</h3>
                  {/* EMI Filter Tabs */}
                  <div className="tabs" style={{ margin: 0, padding: 4, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    {['all', 'Pending', 'Paid', 'Overdue'].map(f => (
                      <button 
                        key={f} 
                        className={`tab-btn ${emiFilter === f ? 'active' : ''}`} 
                        onClick={() => setEmiFilter(f)}
                        style={{ padding: '4px 16px', borderRadius: 'var(--radius-sm)' }}
                      >
                        {f === 'all' ? 'All' : f}
                      </button>
                    ))}
                  </div>
                  
                  <select 
                    value={methodFilter} 
                    onChange={e => setMethodFilter(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-input)', color: 'var(--text-secondary)', outline: 'none', marginLeft: 'var(--space-md)' }}
                  >
                    <option value="all">All Methods</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                <div className="data-table-wrapper">
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Due Date</th>
                        <th>Amount Due</th>
                        <th>Paid</th>
                        <th>Status</th>
                        <th>Method</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loanInstallments.map((inst, idx) => {
                        // Highlight the "Next Pending" EMI
                        const isNextPending = inst.status === 'Pending' && loanInstallments.findIndex(i => i.status === 'Pending') === idx;
                        
                        return (
                          <tr key={inst.id} style={{ 
                            background: inst.status === 'Overdue' ? 'rgba(251,113,133,0.05)' : isNextPending ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                            borderLeft: isNextPending ? '3px solid var(--primary)' : '3px solid transparent'
                          }}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inst.installmentNumber}</td>
                            <td style={{ fontWeight: isNextPending ? 600 : 400 }}>{formatDate(inst.dueDate)} {isNextPending && <span style={{ fontSize: '0.65rem', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: 10, marginLeft: 6 }}>NEXT</span>}</td>
                            <td style={{ fontWeight: 500 }}>{formatCurrency(inst.amountDue)}</td>
                            <td style={{ color: inst.amountPaid > 0 ? '#10b981' : 'var(--text-muted)' }}>{inst.amountPaid ? formatCurrency(inst.amountPaid) : '—'}</td>
                            <td>
                              <span className={`status-badge ${inst.status.toLowerCase()}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {inst.status === 'Paid' && <CheckCircle size={12} />}
                                {inst.status === 'Pending' && <Clock size={12} />}
                                {inst.status === 'Overdue' && <AlertCircle size={12} />}
                                {inst.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{inst.paymentMethod || '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                {inst.status !== 'Paid' && (
                                  <button className="btn btn-sm btn-success" onClick={() => { setShowPayModal(inst); setPayAmountInput(inst.amountDue); }} style={{ padding: '4px 10px' }}>
                                    <CheckCircle size={14} /> Pay
                                  </button>
                                )}
                                {inst.status === 'Pending' && (
                                  <button className="btn btn-sm btn-danger" onClick={() => handleMarkOverdue(inst)} style={{ padding: '4px 10px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                                    <AlertCircle size={14} /> Overdue
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {loanInstallments.length === 0 && (
                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 0' }}>No installments found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state glass-panel" style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <CreditCard size={40} style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 style={{ margin: '0 0 8px 0' }}>No Loan Selected</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, maxWidth: 300, textAlign: 'center' }}>Select a loan from the sidebar to view and manage its complete EMI schedule.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mark Paid Modal */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(null)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>Record Payment — EMI #{showPayModal.installmentNumber}</h3>
              <button className="modal-close" onClick={() => setShowPayModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleMarkPaid}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Amount Paid (₹)</label>
                  <input 
                    name="amountPaid" 
                    type="number" 
                    value={payAmountInput} 
                    onChange={e => setPayAmountInput(e.target.value)}
                    required 
                  />
                </div>
                {Number(payAmountInput) > showPayModal.amountDue && (
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid var(--primary)', padding: '10px 14px', borderRadius: 4, marginBottom: 16, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <strong>Prepayment Detected:</strong> Excess amount of {formatCurrency(Number(payAmountInput) - showPayModal.amountDue)} will be applied towards principal, reducing future EMIs.
                  </div>
                )}
                <div className="form-group">
                  <label>Payment Date</label>
                  <input name="paymentDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select name="paymentMethod">
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-success"><CheckCircle size={16} /> Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
