import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import { supabase } from '../../lib/supabaseClient';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '') + '/api';

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', feature: '', rating: '' });

  useEffect(() => {
    fetchFeedback();
  }, [filters]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.feature) params.append('feature', filters.feature);
      if (filters.rating) params.append('rating', filters.rating);

      const res = await fetch(`${API_BASE}/feedback?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setFeedback(data.data);
      }
    } catch (err) {
      console.error('Fetch feedback error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar />
      <div style={{ display: 'flex' }}>
        <Sidebar profiles={[]} />
        <main style={{ flex: 1, padding: '40px', background: '#f8f9fa', minHeight: '100vh' }}>
          <header style={{ marginBottom: '32px' }}>
            <h1 style={{ fontFamily: 'Calistoga', fontSize: '32px', margin: '0 0 8px' }}>User Feedback</h1>
            <p style={{ color: 'var(--muted-foreground)' }}>Insights and issues reported by sailors.</p>
          </header>

          {/* Filters */}
          <div style={{ 
            display: 'flex', gap: '16px', marginBottom: '24px', 
            padding: '20px', background: '#fff', borderRadius: '16px', border: '1px solid var(--border)' 
          }}>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Feedback Type</label>
              <select 
                value={filters.type} 
                onChange={e => setFilters({...filters, type: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13px' }}
              >
                <option value="">All Types</option>
                <option value="Bug">Bug</option>
                <option value="Confusing">Confusing</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Loved it">Loved it</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Feature</label>
              <select 
                value={filters.feature} 
                onChange={e => setFilters({...filters, feature: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13px' }}
              >
                <option value="">All Features</option>
                <option value="global">Global</option>
                <option value="jd_scoring">JD Scoring</option>
                <option value="jd_optimization">JD Optimization</option>
                <option value="resume_preview">Resume Preview</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Rating</label>
              <select 
                value={filters.rating} 
                onChange={e => setFilters({...filters, rating: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13px' }}
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px' }}>
              <span className="mat-icon spin-icon" style={{ fontSize: '48px', color: 'var(--accent)' }}>autorenew</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {feedback.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                  <p style={{ color: 'var(--muted-foreground)' }}>No feedback found with current filters.</p>
                </div>
              ) : (
                feedback.map(item => (
                  <div key={item.id} style={{ 
                    padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                          background: item.type === 'Bug' ? 'rgba(239,68,68,0.1)' : 'rgba(0,82,255,0.1)',
                          color: item.type === 'Bug' ? '#ef4444' : 'var(--accent)'
                        }}>{item.type}</span>
                        <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                          {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      {item.rating && (
                        <div style={{ color: '#f59e0b', display: 'flex', gap: '2px' }}>
                          {[...Array(item.rating)].map((_, i) => <span key={i} className="mat-icon" style={{ fontSize: '16px' }}>star</span>)}
                        </div>
                      )}
                    </div>

                    <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6 }}>{item.message}</p>

                    <div style={{ 
                      marginTop: '8px', padding: '12px', background: 'var(--muted)', borderRadius: '12px',
                      display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px'
                    }}>
                      <div><b>Feature:</b> {item.feature}</div>
                      <div><b>Page:</b> {item.page}</div>
                      <div><b>User:</b> {item.user_id.slice(0, 8)}...</div>
                      {item.context?.userAgent && <div style={{ flexBasis: '100%' }}><b>Browser:</b> {item.context.userAgent}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
