import { useMemo } from 'react';
import { Wallet, TrendingUp, AlertTriangle, FileText, Clock, Activity, Users, DollarSign, CheckCircle2 } from 'lucide-react';
import { getAll, KEYS, formatCurrency, formatDate, getBorrowerName, timeAgo } from '../data/store';
import { useStore } from '../data/useStore';

export default function Dashboard() {
  const { items: loans } = useStore(KEYS.LOANS);
  const { items: borrowers } = useStore(KEYS.BORROWERS);
  const { items: leads } = useStore(KEYS.LEADS);
  const { items: applications } = useStore(KEYS.APPLICATIONS);
  const { items: installments } = useStore(KEYS.INSTALLMENTS);
  const { items: interactions } = useStore(KEYS.INTERACTIONS);

  const activeLoans = loans.filter(l => l.status === 'Active');
  const portfolioValue = activeLoans.reduce((sum, l) => sum + l.principalAmount, 0);
  const overdueInstallments = installments.filter(i => i.status === 'Overdue');
  const overdueAmount = overdueInstallments.reduce((sum, i) => sum + (i.amountDue - i.amountPaid), 0);
  const pendingApps = applications.filter(a => a.status === 'Submitted' || a.status === 'Under Review');
  const paidInstallments = installments.filter(i => i.status === 'Paid');
  const collectedThisMonth = paidInstallments.reduce((sum, i) => sum + i.amountPaid, 0);

  // Overdue alerts grouped by loan
  const overdueAlerts = useMemo(() => {
    const grouped = {};
    overdueInstallments.forEach(inst => {
      const loan = loans.find(l => l.id === inst.loanId);
      if (!loan) return;
      if (!grouped[loan.borrowerId]) {
        grouped[loan.borrowerId] = { name: getBorrowerName(loan.borrowerId), count: 0, amount: 0 };
      }
      grouped[loan.borrowerId].count++;
      grouped[loan.borrowerId].amount += (inst.amountDue - inst.amountPaid);
    });
    return Object.values(grouped);
  }, [overdueInstallments, loans]);

  // Upcoming follow-ups
  const upcomingFollowups = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return interactions
      .filter(i => i.nextFollowUpDate && i.nextFollowUpDate >= today)
      .sort((a, b) => a.nextFollowUpDate.localeCompare(b.nextFollowUpDate))
      .slice(0, 5)
      .map(i => {
        const name = i.entityType === 'Lead'
          ? (leads.find(l => l.id === i.entityId)?.fullName || 'Unknown')
          : getBorrowerName(i.entityId);
        const daysAway = Math.ceil((new Date(i.nextFollowUpDate) - new Date()) / 86400000);
        return { ...i, name, daysAway };
      });
  }, [interactions]);

  // Recent applications
  const recentApps = useMemo(() => {
    return [...applications]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [applications]);

  // Build activity feed from all entities
  const activities = useMemo(() => {
    const items = [];
    leads.forEach(l => items.push({ type: 'lead', text: `New lead <strong>${l.fullName}</strong> added from ${l.source}`, time: l.createdAt }));
    applications.filter(a => a.status === 'Approved').forEach(a => items.push({ type: 'loan', text: `Loan application <strong>${formatCurrency(a.requestedAmount)}</strong> approved for ${getBorrowerName(a.borrowerId)}`, time: a.updatedAt }));
    paidInstallments.slice(-3).forEach(inst => {
      const loan = loans.find(l => l.id === inst.loanId);
      items.push({ type: 'payment', text: `Repayment <strong>${formatCurrency(inst.amountPaid)}</strong> received from ${loan ? getBorrowerName(loan.borrowerId) : 'Unknown'}`, time: inst.paymentDate || inst.updatedAt });
    });
    interactions.slice(-3).forEach(i => items.push({ type: 'followup', text: `${i.interactionType} with <strong>${i.entityType === 'Lead' ? 'lead' : 'borrower'}</strong> — ${i.outcome}`, time: i.createdAt }));
    return items.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);
  }, [leads, applications, paidInstallments, interactions, loans]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome back! Here's your portfolio overview.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card indigo">
          <div className="kpi-icon indigo"><Wallet size={22} /></div>
          <div className="kpi-content">
            <div className="kpi-label">Portfolio Value</div>
            <div className="kpi-value">{formatCurrency(portfolioValue)}</div>
          </div>
        </div>
        <div className="kpi-card emerald">
          <div className="kpi-icon emerald"><TrendingUp size={22} /></div>
          <div className="kpi-content">
            <div className="kpi-label">Active Loans</div>
            <div className="kpi-value">{activeLoans.length}</div>
          </div>
        </div>
        <div className="kpi-card rose">
          <div className="kpi-icon rose"><AlertTriangle size={22} /></div>
          <div className="kpi-content">
            <div className="kpi-label">Overdue Amount</div>
            <div className="kpi-value">{formatCurrency(overdueAmount)}</div>
          </div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-icon amber"><FileText size={22} /></div>
          <div className="kpi-content">
            <div className="kpi-label">Pending Applications</div>
            <div className="kpi-value">{pendingApps.length}</div>
          </div>
        </div>
        <div className="kpi-card cyan">
          <div className="kpi-icon cyan"><DollarSign size={22} /></div>
          <div className="kpi-content">
            <div className="kpi-label">Collected</div>
            <div className="kpi-value">{formatCurrency(collectedThisMonth)}</div>
          </div>
        </div>
        <div className="kpi-card indigo">
          <div className="kpi-icon indigo"><Users size={22} /></div>
          <div className="kpi-content">
            <div className="kpi-label">Total Borrowers</div>
            <div className="kpi-value">{borrowers.length}</div>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Overdue Alerts */}
        <div className="glass-card">
          <h4><AlertTriangle /> Overdue Alerts</h4>
          {overdueAlerts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><CheckCircle2 size={16} style={{color: 'var(--success)'}}/> No overdue payments</p>
          ) : (
            overdueAlerts.map((alert, i) => (
              <div key={i} className="alert-item">
                <div>
                  <div className="alert-name">{alert.name}</div>
                  <div className="alert-detail">{alert.count} EMI{alert.count > 1 ? 's' : ''} overdue</div>
                </div>
                <span className="overdue-amount">{formatCurrency(alert.amount)}</span>
              </div>
            ))
          )}
        </div>

        {/* Upcoming Follow-ups */}
        <div className="glass-card">
          <h4><Clock /> Upcoming Follow-ups</h4>
          {upcomingFollowups.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '16px 0' }}>No upcoming follow-ups</p>
          ) : (
            upcomingFollowups.map((fu, i) => (
              <div key={i} className="alert-item">
                <div>
                  <div className="alert-name">{fu.name}</div>
                  <div className="alert-detail">{fu.interactionType} · {formatDate(fu.nextFollowUpDate)}</div>
                </div>
                <span className="status-badge interested">{fu.daysAway <= 0 ? 'Today' : `${fu.daysAway}d`}</span>
              </div>
            ))
          )}
        </div>

        {/* Recent Applications */}
        <div className="glass-card">
          <h4><FileText /> Recent Applications</h4>
          <div className="data-table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentApps.map(app => (
                  <tr key={app.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{getBorrowerName(app.borrowerId)}</td>
                    <td>{formatCurrency(app.requestedAmount)}</td>
                    <td>{app.loanType}</td>
                    <td><span className={`status-badge ${app.status.toLowerCase().replace(/ /g, '-')}`}>{app.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="glass-card">
          <h4><Activity /> Recent Activity</h4>
          {activities.map((act, i) => (
            <div key={i} className="activity-item">
              <div className={`activity-dot ${act.type}`} />
              <div>
                <div className="activity-text" dangerouslySetInnerHTML={{ __html: act.text }} />
                <div className="activity-time">{timeAgo(act.time)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
