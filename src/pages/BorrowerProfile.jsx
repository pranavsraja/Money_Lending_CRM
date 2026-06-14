import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Briefcase, Building, IndianRupee, Shield, CheckCircle, XCircle } from 'lucide-react';
import { KEYS, formatCurrency, formatDate } from '../data/store';
import { useStore } from '../data/useStore';

export default function BorrowerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { items: allBorrowers } = useStore(KEYS.BORROWERS);
  const { items: allApps } = useStore(KEYS.APPLICATIONS);
  const { items: allLoans } = useStore(KEYS.LOANS);
  const { items: allInteractions } = useStore(KEYS.INTERACTIONS);
  const { items: allInstallments } = useStore(KEYS.INSTALLMENTS);

  const borrower = allBorrowers.find(b => b.id === id);

  const applications = useMemo(() => allApps.filter(a => a.borrowerId === id), [id, allApps]);
  const loans = useMemo(() => allLoans.filter(l => l.borrowerId === id), [id, allLoans]);
  const interactions = useMemo(() => allInteractions.filter(i => i.entityId === id && i.entityType === 'Borrower'), [id, allInteractions]);
  const installments = useMemo(() => {
    const loanIds = new Set(loans.map(l => l.id));
    return allInstallments.filter(i => loanIds.has(i.loanId));
  }, [loans, allInstallments]);

  if (!borrower) {
    return (
      <div>
        <button className="btn btn-secondary" onClick={() => navigate('/borrowers')}><ArrowLeft size={16} /> Back</button>
        <div className="empty-state" style={{ marginTop: 64 }}><p>Borrower not found</p></div>
      </div>
    );
  }

  const getCibilClass = (score) => {
    if (score >= 750) return 'excellent';
    if (score >= 700) return 'good';
    if (score >= 500) return 'fair';
    return 'poor';
  };

  const initials = borrower.fullName.split(' ').map(n => n[0]).join('').toUpperCase();

  // Build timeline
  const timeline = useMemo(() => {
    const events = [];
    events.push({ date: borrower.createdAt, title: 'Borrower profile created', desc: '', type: 'indigo' });
    applications.forEach(a => {
      events.push({ date: a.createdAt, title: `${a.loanType} loan application (${formatCurrency(a.requestedAmount)})`, desc: `Status: ${a.status}`, type: a.status === 'Approved' ? 'emerald' : a.status === 'Rejected' ? 'rose' : 'amber' });
    });
    loans.forEach(l => {
      events.push({ date: l.createdAt, title: `Loan ${formatCurrency(l.principalAmount)} disbursed`, desc: `EMI: ${formatCurrency(l.emiAmount)} · ${l.interestRate}% p.a.`, type: 'emerald' });
    });
    interactions.forEach(i => {
      events.push({ date: i.createdAt, title: `${i.interactionType} — ${i.outcome}`, desc: i.notes, type: 'cyan' });
    });
    installments.filter(i => i.status === 'Paid').forEach(i => {
      events.push({ date: i.paymentDate || i.updatedAt, title: `EMI #${i.installmentNumber} paid`, desc: `${formatCurrency(i.amountPaid)} via ${i.paymentMethod || 'N/A'}`, type: 'emerald' });
    });
    installments.filter(i => i.status === 'Overdue').forEach(i => {
      events.push({ date: i.dueDate, title: `EMI #${i.installmentNumber} overdue`, desc: formatCurrency(i.amountDue), type: 'rose' });
    });
    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [borrower, applications, loans, interactions, installments]);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/borrowers')}><ArrowLeft size={16} /></button>
          <div>
            <h2>Borrower Profile</h2>
            <p>{borrower.fullName}</p>
          </div>
        </div>
      </div>

      <div className="profile-layout">
        {/* Left Panel */}
        <div className="profile-sidebar">
          <div className="profile-avatar-card">
            <div className="profile-avatar">{initials}</div>
            <div className="profile-name">{borrower.fullName}</div>
            <div className="profile-id">ID: {borrower.id}</div>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <span className={`cibil-score ${getCibilClass(borrower.creditScore)}`} style={{ fontSize: '1.4rem' }}>
                {borrower.creditScore || '—'}
              </span>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>CIBIL Score</div>
            </div>
          </div>

          <div className="profile-info-card">
            <h4>Contact</h4>
            <div className="info-row"><span className="info-label"><Phone size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />Phone</span><span className="info-value">{borrower.phone}</span></div>
            <div className="info-row"><span className="info-label"><Mail size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />Email</span><span className="info-value">{borrower.email}</span></div>
            <div className="info-row"><span className="info-label"><MapPin size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />Address</span><span className="info-value">{borrower.address}</span></div>
          </div>

          <div className="profile-info-card">
            <h4>Employment</h4>
            <div className="info-row"><span className="info-label"><Briefcase size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />Occupation</span><span className="info-value">{borrower.occupation || '—'}</span></div>
            <div className="info-row"><span className="info-label"><Building size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />Employer</span><span className="info-value">{borrower.employer || '—'}</span></div>
            <div className="info-row"><span className="info-label"><IndianRupee size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />Monthly Income</span><span className="info-value">{formatCurrency(borrower.monthlyIncome)}</span></div>
          </div>

          <div className="profile-info-card">
            <h4>Identity</h4>
            <div className="info-row"><span className="info-label">PAN</span><span className="info-value">{borrower.panNumber || '—'}</span></div>
            <div className="info-row"><span className="info-label">Aadhaar</span><span className="info-value">{borrower.aadhaarNumber || '—'}</span></div>
            <div className="info-row"><span className="info-label"><Shield size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />Docs Verified</span><span className="info-value">{borrower.documentsVerified ? <><CheckCircle size={14} style={{ color: 'var(--success)', verticalAlign: '-2px', marginRight: 4 }} /> Yes</> : <><XCircle size={14} style={{ color: 'var(--danger)', verticalAlign: '-2px', marginRight: 4 }} /> No</>}</span></div>
          </div>
        </div>

        {/* Right Panel - Timeline */}
        <div>
          <div className="glass-card">
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>Borrower Timeline</h4>
            {timeline.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No activity yet</p>
            ) : (
              <div className="timeline">
                {timeline.map((event, i) => (
                  <div key={i} className="timeline-item">
                    <div className={`timeline-dot ${event.type}`} />
                    <div className="timeline-date">{formatDate(event.date)}</div>
                    <div className="timeline-title">{event.title}</div>
                    {event.desc && <div className="timeline-desc">{event.desc}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
