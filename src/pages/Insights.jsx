import { useMemo } from 'react';
import { BarChart3, TrendingUp, PieChart as PieChartIcon, Target, Briefcase, MessageSquare, Users } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, AreaChart, Area 
} from 'recharts';
import { KEYS, formatCurrency } from '../data/store';
import { useStore } from '../data/useStore';

export default function Insights() {
  const { items: leads } = useStore(KEYS.LEADS);
  const { items: applications } = useStore(KEYS.APPLICATIONS);
  const { items: loans } = useStore(KEYS.LOANS);
  const { items: installments } = useStore(KEYS.INSTALLMENTS);
  const { items: interactions } = useStore(KEYS.INTERACTIONS);

  // ─── Lead Stage Pipeline ───
  const leadPipelineData = useMemo(() => {
    const statuses = ['New', 'Contacted', 'Interested', 'Not Interested', 'Converted'];
    const counts = {};
    statuses.forEach(s => counts[s] = 0);
    leads.forEach(l => {
      if (counts[l.status] !== undefined) counts[l.status]++;
    });
    
    return [
      { name: 'New', value: counts['New'], fill: 'var(--text-muted)' },
      { name: 'Contacted', value: counts['Contacted'], fill: 'var(--accent-cyan)' },
      { name: 'Interested', value: counts['Interested'], fill: 'var(--accent-indigo)' },
      { name: 'Converted', value: counts['Converted'], fill: 'var(--accent-emerald)' },
      { name: 'Not Interested', value: counts['Not Interested'], fill: 'var(--accent-rose)' },
    ];
  }, [leads]);

  // ─── Best Converting Sources ───
  const leadSourceData = useMemo(() => {
    const sources = {};
    leads.forEach(l => {
      if (!sources[l.source]) sources[l.source] = { total: 0, converted: 0 };
      sources[l.source].total++;
      if (l.status === 'Converted') sources[l.source].converted++;
    });

    const colors = ['var(--accent-indigo)', 'var(--accent-emerald)', 'var(--accent-cyan)', 'var(--accent-amber)', 'var(--accent-rose)', 'var(--text-muted)'];
    
    return Object.keys(sources).map((src, i) => {
      const rate = sources[src].total > 0 ? Math.round((sources[src].converted / sources[src].total) * 100) : 0;
      return {
        name: src,
        total: sources[src].total,
        value: sources[src].converted, // For pie chart
        rate: rate,
        fill: colors[i % colors.length]
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [leads]);

  // ─── Funnel Data ───
  const funnelData = useMemo(() => {
    const totalLeads = leads.length;
    const totalApps = applications.length;
    const approvedApps = applications.filter(a => a.status === 'Approved').length;
    const disbursedLoans = loans.length;
    return [
      { name: 'Leads', value: totalLeads, fill: 'var(--accent-indigo)' },
      { name: 'Applications', value: totalApps, fill: 'var(--accent-cyan)' },
      { name: 'Approved', value: approvedApps, fill: 'var(--accent-amber)' },
      { name: 'Disbursed', value: disbursedLoans, fill: 'var(--accent-emerald)' },
    ];
  }, [leads, applications, loans]);

  // ─── Portfolio Health ───
  const portfolioHealth = useMemo(() => {
    const active = loans.filter(l => l.status === 'Active').length;
    const closed = loans.filter(l => l.status === 'Closed').length;
    const defaulted = loans.filter(l => l.status === 'Defaulted').length;
    
    const loansWithOverdue = new Set();
    installments.filter(i => i.status === 'Overdue').forEach(i => loansWithOverdue.add(i.loanId));
    const atRisk = loansWithOverdue.size;
    
    const total = Math.max(active + closed + defaulted, 1);
    const data = [
      { name: 'Active', value: active, fill: 'var(--accent-emerald)' },
      { name: 'Closed', value: closed, fill: 'var(--text-muted)' },
      { name: 'Defaulted', value: defaulted, fill: 'var(--accent-rose)' }
    ];
    return { data, atRisk, total, active, closed, defaulted };
  }, [loans, installments]);

  // ─── Collection Forecast ───
  const forecast = useMemo(() => {
    const today = new Date();
    const next7 = new Date(today);
    next7.setDate(next7.getDate() + 7);
    const next30 = new Date(today);
    next30.setDate(next30.getDate() + 30);

    const pending = installments.filter(i => i.status === 'Pending' || i.status === 'Overdue');
    const due7 = pending.filter(i => new Date(i.dueDate) <= next7).reduce((s, i) => s + i.amountDue, 0);
    const due30 = pending.filter(i => new Date(i.dueDate) <= next30).reduce((s, i) => s + i.amountDue, 0);
    const overdue = pending.filter(i => i.status === 'Overdue').reduce((s, i) => s + (i.amountDue - i.amountPaid), 0);

    return [
      { name: 'Next 7 Days', value: due7, fill: 'var(--accent-cyan)' },
      { name: 'Next 30 Days', value: due30, fill: 'var(--accent-indigo)' },
      { name: 'Overdue', value: overdue, fill: 'var(--accent-rose)' },
    ];
  }, [installments]);

  // ─── Monthly Collection Trend ───
  const monthlyTrend = useMemo(() => {
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('en-IN', { month: 'short' });
      const collected = installments
        .filter(inst => inst.status === 'Paid' && inst.paymentDate && inst.paymentDate.startsWith(monthKey))
        .reduce((s, inst) => s + inst.amountPaid, 0);
      months.push({ name: monthLabel, Collected: collected });
    }
    return months;
  }, [installments]);

  // ─── Loan Portfolio by Type ───
  const loansByType = useMemo(() => {
    const typeMap = {};
    const appMap = {};
    applications.forEach(a => appMap[a.id] = a.loanType);

    loans.filter(l => l.status === 'Active').forEach(l => {
      const type = appMap[l.applicationId] || 'Other';
      typeMap[type] = (typeMap[type] || 0) + l.outstandingBalance;
    });

    const colors = {
      'Personal': 'var(--accent-indigo)',
      'Business': 'var(--accent-emerald)',
      'Vehicle': 'var(--accent-cyan)',
      'Education': 'var(--accent-amber)',
      'Other': 'var(--text-muted)'
    };

    return Object.keys(typeMap).map(type => ({
      name: type,
      value: typeMap[type],
      fill: colors[type] || 'var(--text-secondary)'
    })).sort((a, b) => b.value - a.value);
  }, [applications, loans]);

  // ─── Interaction Channels ───
  const interactionChannels = useMemo(() => {
    const channels = {};
    interactions.forEach(int => {
      channels[int.interactionType] = (channels[int.interactionType] || 0) + 1;
    });
    const colors = {
      'Call': 'var(--accent-indigo)',
      'WhatsApp': 'var(--accent-emerald)',
      'Email': 'var(--accent-cyan)',
      'Meeting': 'var(--accent-amber)',
      'Field Visit': 'var(--accent-rose)',
      'SMS': 'var(--text-muted)'
    };
    return Object.keys(channels).map(type => ({
      name: type,
      value: channels[type],
      fill: colors[type] || 'var(--text-secondary)'
    })).sort((a, b) => b.value - a.value);
  }, [interactions]);

  // Custom tooltips
  const CurrencyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--bg-card)', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{label}</p>
          <p style={{ margin: 0, color: payload[0].fill || 'var(--accent-indigo)', fontWeight: 700 }}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const CountTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--bg-card)', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{payload[0].name || label}</p>
          <p style={{ margin: 0, color: payload[0].fill || 'var(--accent-indigo)', fontWeight: 700 }}>
            {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div className="page-header">
        <div>
          <h2>Insights Engine</h2>
          <p>Deep dive analytics on your lending portfolio</p>
        </div>
      </div>

      <div className="insights-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Lead Stage Pipeline */}
        <div className="glass-card chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Users size={20} color="var(--accent-cyan)" /> Lead Conversion Pipeline
          </h4>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadPipelineData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" tick={{ fontSize: 13, fontWeight: 500 }} width={100} />
                <Tooltip content={<CountTooltip />} cursor={{ fill: 'var(--bg-glass-hover)' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                  {leadPipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Best Converting Sources */}
        <div className="glass-card chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <PieChartIcon size={20} color="var(--accent-indigo)" /> Best Converting Sources
          </h4>
          <div style={{ flex: 1, minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
             <div style={{ width: '55%', height: '100%', position: 'relative' }}>
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Tooltip content={<CountTooltip />} />
                   <Pie
                     data={leadSourceData}
                     innerRadius="55%"
                     outerRadius="85%"
                     paddingAngle={4}
                     dataKey="value"
                     stroke="none"
                   >
                     {leadSourceData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.fill} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div style={{ width: '45%', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {leadSourceData.map(source => (
                 <div key={source.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: source.fill }} />
                     <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{source.name}</span>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                     <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{source.rate}%</div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{source.value}/{source.total}</div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Loan Funnel */}
        <div className="glass-card chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Target size={20} color="var(--accent-indigo)" /> Loan Funnel Analytics
          </h4>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" tick={{ fontSize: 13, fontWeight: 500 }} width={100} />
                <Tooltip content={<CountTooltip />} cursor={{ fill: 'var(--bg-glass-hover)' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Portfolio Health */}
        <div className="glass-card chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <PieChartIcon size={20} color="var(--accent-emerald)" /> Portfolio Health
          </h4>
          <div style={{ flex: 1, minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ width: '60%', height: '100%', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CountTooltip />} />
                  <Pie
                    data={portfolioHealth.data}
                    innerRadius="65%"
                    outerRadius="90%"
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {portfolioHealth.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{portfolioHealth.total}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>Total Loans</span>
              </div>
            </div>
            
            <div style={{ width: '40%', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>Active</span>
                </div>
                <span style={{ fontWeight: 700 }}>{portfolioHealth.active}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>Closed</span>
                </div>
                <span style={{ fontWeight: 700 }}>{portfolioHealth.closed}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-rose)' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>Defaulted</span>
                </div>
                <span style={{ fontWeight: 700 }}>{portfolioHealth.defaulted}</span>
              </div>
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-amber)' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>At Risk</span>
                </div>
                <span style={{ fontWeight: 700 }}>{portfolioHealth.atRisk}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Collection Forecast */}
        <div className="glass-card chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <TrendingUp size={20} color="var(--accent-cyan)" /> Collection Forecast
          </h4>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecast} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                <Tooltip content={<CurrencyTooltip />} cursor={{ fill: 'var(--bg-glass-hover)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={48}>
                  {forecast.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="glass-card chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <BarChart3 size={20} color="var(--accent-indigo)" /> Monthly Collections
          </h4>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-indigo)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-indigo)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                <Tooltip content={<CurrencyTooltip />} />
                <Area type="monotone" dataKey="Collected" stroke="var(--accent-indigo)" strokeWidth={3} fillOpacity={1} fill="url(#colorCollected)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loan Portfolio By Type */}
        <div className="glass-card chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Briefcase size={20} color="var(--accent-amber)" /> Portfolio by Loan Type
          </h4>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={loansByType} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                <Tooltip content={<CurrencyTooltip />} cursor={{ fill: 'var(--bg-glass-hover)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={48}>
                  {loansByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interaction Channels */}
        <div className="glass-card chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <MessageSquare size={20} color="var(--accent-indigo)" /> Interaction Channels
          </h4>
          <div style={{ flex: 1, minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CountTooltip />} />
                <Pie
                  data={interactionChannels}
                  innerRadius="50%"
                  outerRadius="80%"
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {interactionChannels.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
