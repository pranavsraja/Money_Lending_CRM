import { useState, useMemo } from 'react';
import { Plus, Search, Phone, MessageSquare, Mail, MapPin, Video, MessageCircle, X, Calendar, User, AlertTriangle } from 'lucide-react';
import { useStore } from '../data/useStore';
import { KEYS, formatDate, getAll, getBorrowerName } from '../data/store';

const TYPES = ['Call', 'WhatsApp', 'Email', 'Meeting', 'Field Visit', 'SMS'];
const OUTCOMES = ['No Response', 'Interested', 'Follow Up Later', 'Documents Pending'];

const typeIcons = { Call: Phone, WhatsApp: MessageSquare, Email: Mail, Meeting: Video, 'Field Visit': MapPin, SMS: MessageCircle };

export default function Interactions() {
  const { items: interactions, addItem } = useStore(KEYS.INTERACTIONS);
  const { items: borrowers } = useStore(KEYS.BORROWERS);
  const { items: leads } = useStore(KEYS.LEADS);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [search, setSearch] = useState('');

  const entityOptions = useMemo(() => [
    ...borrowers.map(b => ({ id: b.id, name: b.fullName, type: 'Borrower' })),
    ...leads.map(l => ({ id: l.id, name: l.fullName, type: 'Lead' })),
  ], [borrowers, leads]);

  const getEntityName = (entityId, entityType) => {
    if (entityType === 'Borrower') return getBorrowerName(entityId);
    const lead = leads.find(l => l.id === entityId);
    return lead ? lead.fullName : 'Unknown';
  };

  const filtered = useMemo(() => {
    let result = [...interactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (filterType !== 'all') result = result.filter(i => i.interactionType === filterType);
    if (filterEntity !== 'all') result = result.filter(i => i.entityId === filterEntity);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.notes?.toLowerCase().includes(q) ||
        getEntityName(i.entityId, i.entityType).toLowerCase().includes(q)
      );
    }
    return result;
  }, [interactions, filterType, filterEntity, search, leads]);

  const isUrgent = (interaction) => {
    if (!interaction.nextFollowUpDate) return false;
    return new Date(interaction.nextFollowUpDate) <= new Date();
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const entityFull = fd.get('entity');
    const [entityType, entityId] = entityFull.split('::');
    addItem({
      entityId,
      entityType,
      officerName: fd.get('officerName'),
      interactionType: fd.get('interactionType'),
      date: fd.get('date'),
      outcome: fd.get('outcome'),
      notes: fd.get('notes'),
      nextFollowUpDate: fd.get('nextFollowUpDate') || null,
    });
    setShowModal(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Interactions & Follow-ups</h2>
          <p>Track all communications</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Log Interaction</button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search />
          <input className="search-input" placeholder="Search notes or names..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="filter-select" value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
          <option value="all">All Contacts</option>
          {entityOptions.map(e => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}
        </select>
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="empty-state"><MessageSquare size={48} /><p>No interactions found</p></div>
      ) : (
        <div className="interaction-feed">
          {filtered.map(interaction => {
            const Icon = typeIcons[interaction.interactionType] || MessageSquare;
            const urgent = isUrgent(interaction);
            return (
              <div key={interaction.id} className={`interaction-card ${urgent ? 'urgent' : ''}`}>
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span className="interaction-type-badge"><Icon size={12} /> {interaction.interactionType}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {getEntityName(interaction.entityId, interaction.entityType)}
                    </span>
                    <span className={`status-badge ${interaction.entityType === 'Lead' ? 'new' : 'active'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                      {interaction.entityType}
                    </span>
                  </div>
                  <span className={`status-badge ${interaction.outcome === 'Interested' ? 'interested' : interaction.outcome === 'No Response' ? 'not-interested' : 'contacted'}`}>
                    {interaction.outcome}
                  </span>
                </div>
                <div className="card-notes">{interaction.notes}</div>
                <div className="card-footer">
                  <span><Calendar size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />{formatDate(interaction.date)}</span>
                  <span><User size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />{interaction.officerName}</span>
                  {interaction.nextFollowUpDate && (
                    <span style={{ color: urgent ? 'var(--accent-rose)' : 'var(--accent-amber)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Follow-up: {formatDate(interaction.nextFollowUpDate)} {urgent && <AlertTriangle size={14} />}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Log Interaction</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Contact</label>
                    <select name="entity" required>
                      <option value="">Select...</option>
                      <optgroup label="Borrowers">
                        {borrowers.map(b => <option key={b.id} value={`Borrower::${b.id}`}>{b.fullName}</option>)}
                      </optgroup>
                      <optgroup label="Leads">
                        {leads.map(l => <option key={l.id} value={`Lead::${l.id}`}>{l.fullName}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select name="interactionType" required>
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date</label>
                    <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                  </div>
                  <div className="form-group">
                    <label>Officer Name</label>
                    <input name="officerName" required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea name="notes" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Outcome</label>
                    <select name="outcome" required>
                      {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Next Follow-Up</label>
                    <input name="nextFollowUpDate" type="date" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Interaction</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
