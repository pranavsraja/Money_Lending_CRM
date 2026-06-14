import { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, CreditCard, MessageSquare, BarChart3, Search, Bell, Menu, X, AlertTriangle, Clock, User, Settings, LogOut, ChevronRight } from 'lucide-react';
import { KEYS, formatCurrency, formatDate, getBorrowerName } from '../data/store';
import { useStore } from '../data/useStore';

export default function Layout() {
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  
  const { items: leads } = useStore(KEYS.LEADS);
  const { items: borrowers } = useStore(KEYS.BORROWERS);
  const { items: applications } = useStore(KEYS.APPLICATIONS);
  const { items: loans } = useStore(KEYS.LOANS);
  const { items: installments } = useStore(KEYS.INSTALLMENTS);
  const { items: interactions } = useStore(KEYS.INTERACTIONS);

  // ─── Global Search ───
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const results = [];

    // Search Leads
    leads.forEach(l => {
      if (l.fullName?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.phone?.includes(q)) {
        results.push({ id: l.id, name: l.fullName, type: 'Lead', detail: `${l.status} · ${l.source}`, path: '/borrowers', icon: 'lead' });
      }
    });

    // Search Borrowers
    borrowers.forEach(b => {
      if (b.fullName?.toLowerCase().includes(q) || b.email?.toLowerCase().includes(q) || b.phone?.includes(q) || b.panNumber?.toLowerCase().includes(q)) {
        results.push({ id: b.id, name: b.fullName, type: 'Borrower', detail: `CIBIL: ${b.creditScore || '—'} · ${b.occupation || '—'}`, path: `/borrowers/${b.id}`, icon: 'borrower' });
      }
    });

    // Search Loans
    loans.forEach(l => {
      const bName = getBorrowerName(l.borrowerId);
      if (bName.toLowerCase().includes(q) || l.id?.toLowerCase().includes(q)) {
        results.push({ id: l.id, name: `Loan ${formatCurrency(l.principalAmount)}`, type: 'Loan', detail: `${bName} · ${l.status}`, path: '/repayments', icon: 'loan' });
      }
    });

    // Search Applications
    applications.forEach(a => {
      const bName = getBorrowerName(a.borrowerId);
      if (bName.toLowerCase().includes(q) || a.loanType?.toLowerCase().includes(q)) {
        results.push({ id: a.id, name: `${a.loanType} — ${formatCurrency(a.requestedAmount)}`, type: 'Application', detail: `${bName} · ${a.status}`, path: '/applications', icon: 'application' });
      }
    });

    return results.slice(0, 8);
  }, [searchQuery, leads, borrowers, loans, applications]);

  const handleSearchSelect = (result) => {
    setSearchQuery('');
    setSearchOpen(false);
    navigate(result.path);
  };

  // Close search on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Notifications Panel ───
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const notifications = useMemo(() => {
    const items = [];

    // Overdue EMIs
    installments.filter(i => i.status === 'Overdue').forEach(inst => {
      const loan = loans.find(l => l.id === inst.loanId);
      items.push({
        id: `overdue-${inst.id}`,
        type: 'danger',
        title: 'Overdue EMI',
        message: `EMI #${inst.installmentNumber} of ${formatCurrency(inst.amountDue)} for ${loan ? getBorrowerName(loan.borrowerId) : 'Unknown'} is overdue`,
        time: inst.dueDate,
        action: '/repayments',
      });
    });

    // Upcoming follow-ups (within 3 days)
    const today = new Date();
    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);
    interactions.filter(i => i.nextFollowUpDate).forEach(i => {
      const fDate = new Date(i.nextFollowUpDate);
      if (fDate <= threeDays && fDate >= new Date(today.toISOString().split('T')[0])) {
        const entityName = i.entityType === 'Lead'
          ? (leads.find(l => l.id === i.entityId)?.fullName || 'Unknown')
          : getBorrowerName(i.entityId);
        items.push({
          id: `followup-${i.id}`,
          type: 'warning',
          title: 'Follow-up Due',
          message: `${i.interactionType} with ${entityName} on ${formatDate(i.nextFollowUpDate)}`,
          time: i.nextFollowUpDate,
          action: '/interactions',
        });
      }
    });

    // Pending applications
    applications.filter(a => a.status === 'Submitted' || a.status === 'Under Review').forEach(a => {
      items.push({
        id: `app-${a.id}`,
        type: 'info',
        title: 'Application Pending',
        message: `${getBorrowerName(a.borrowerId)}'s ${a.loanType} loan (${formatCurrency(a.requestedAmount)}) needs review`,
        time: a.submissionDate || a.createdAt,
        action: '/applications',
      });
    });

    return items.sort((a, b) => {
      const priority = { danger: 0, warning: 1, info: 2 };
      return (priority[a.type] ?? 3) - (priority[b.type] ?? 3);
    });
  }, [installments, loans, interactions, applications, leads]);

  // Close notif on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Profile Dropdown ───
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  // Load profile from localStorage
  const getProfile = () => {
    try {
      return JSON.parse(localStorage.getItem('crm_profile') || '{}');
    } catch { return {}; }
  };
  const [profile, setProfile] = useState(getProfile);

  const displayName = profile.name || 'Admin Kumar';
  const displayEmail = profile.email || 'admin@lendflow.com';
  const displayRole = profile.role || 'Loan Officer';
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleProfileSave = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = { name: fd.get('name'), email: fd.get('email'), role: fd.get('role'), phone: fd.get('phone') };
    localStorage.setItem('crm_profile', JSON.stringify(data));
    setProfile(data);
    setShowProfileSettings(false);
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout? (This will clear session data)')) {
      localStorage.removeItem('crm_seeded');
      localStorage.removeItem('crm_profile');
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside 
        className={`sidebar ${isSidebarExpanded ? 'expanded' : ''}`}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        <div className="sidebar-brand">
          <div className="brand-icon" onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}>
            <Menu />
          </div>
          <h1>LendFlow CRM</h1>
        </div>
        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Main</span>
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard /> <span className="nav-text">Dashboard</span>
          </NavLink>
          <NavLink to="/borrowers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users /> <span className="nav-text">Borrowers & Leads</span>
          </NavLink>
          <NavLink to="/applications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FileText /> <span className="nav-text">Applications</span>
          </NavLink>

          <span className="sidebar-section-label">Finance</span>
          <NavLink to="/repayments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <CreditCard /> <span className="nav-text">Repayments</span>
          </NavLink>

          <span className="sidebar-section-label">Activity</span>
          <NavLink to="/interactions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <MessageSquare /> <span className="nav-text">Interactions</span>
          </NavLink>
          <NavLink to="/insights" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <BarChart3 /> <span className="nav-text">Insights Engine</span>
          </NavLink>
        </nav>
      </aside>

      {/* Main */}
      <div className="main-area">
        <header className="topbar">
          {/* Global Search */}
          <div className="topbar-search" ref={searchRef}>
            <Search />
            <input
              type="text"
              placeholder="Search borrowers, leads, loans..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => searchQuery.length >= 2 && setSearchOpen(true)}
            />
            {/* Search Results Dropdown */}
            {searchOpen && searchResults.length > 0 && (
              <div className="search-dropdown">
                {searchResults.map(r => (
                  <div key={r.id} className="search-result-item" onClick={() => handleSearchSelect(r)}>
                    <div className="search-result-left">
                      <span className={`search-result-type ${r.icon}`}>{r.type}</span>
                      <div>
                        <div className="search-result-name">{r.name}</div>
                        <div className="search-result-detail">{r.detail}</div>
                      </div>
                    </div>
                    <ChevronRight size={14} className="search-result-arrow" />
                  </div>
                ))}
              </div>
            )}
            {searchOpen && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="search-dropdown">
                <div style={{ padding: '16px 20px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.88rem' }}>
                  No results found for "{searchQuery}"
                </div>
              </div>
            )}
          </div>

          <div className="topbar-actions">
            {/* Notification Bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button className="topbar-btn" onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}>
                <Bell size={18} />
                {notifications.length > 0 && <span className="notification-dot" />}
              </button>

              {notifOpen && (
                <div className="dropdown-panel notif-panel">
                  <div className="dropdown-header">
                    <h4>Notifications</h4>
                    <span className="notif-count">{notifications.length}</span>
                  </div>
                  <div className="dropdown-body">
                    {notifications.length === 0 ? (
                      <div className="dropdown-empty">No new notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`notif-item ${n.type}`} onClick={() => { navigate(n.action); setNotifOpen(false); }}>
                          <div className={`notif-icon-wrapper ${n.type}`}>
                            {n.type === 'danger' ? <AlertTriangle size={14} /> : n.type === 'warning' ? <Clock size={14} /> : <FileText size={14} />}
                          </div>
                          <div className="notif-content">
                            <div className="notif-title">{n.title}</div>
                            <div className="notif-message">{n.message}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <div className="topbar-avatar" onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}>
                {initials}
              </div>

              {profileOpen && (
                <div className="dropdown-panel profile-panel">
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-avatar">{initials}</div>
                    <div>
                      <div className="profile-dropdown-name">{displayName}</div>
                      <div className="profile-dropdown-email">{displayEmail}</div>
                      <div className="profile-dropdown-role">{displayRole}</div>
                    </div>
                  </div>
                  <div className="dropdown-divider" />
                  <button className="dropdown-menu-item" onClick={() => { setShowProfileSettings(true); setProfileOpen(false); }}>
                    <Settings size={16} /> Profile Settings
                  </button>
                  <button className="dropdown-menu-item" onClick={() => { navigate('/'); setProfileOpen(false); }}>
                    <LayoutDashboard size={16} /> Dashboard
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-menu-item danger" onClick={handleLogout}>
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {/* Profile Settings Modal */}
      {showProfileSettings && (
        <div className="modal-overlay" onClick={() => setShowProfileSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Profile Settings</h3>
              <button className="modal-close" onClick={() => setShowProfileSettings(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleProfileSave}>
              <div className="modal-body">
                <div className="profile-settings-avatar">
                  <div className="profile-dropdown-avatar large">{initials}</div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input name="name" defaultValue={displayName} required />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input name="email" type="email" defaultValue={displayEmail} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Role</label>
                    <select name="role" defaultValue={displayRole}>
                      <option>Loan Officer</option>
                      <option>Branch Manager</option>
                      <option>Collection Agent</option>
                      <option>Administrator</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input name="phone" defaultValue={profile.phone || ''} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowProfileSettings(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
