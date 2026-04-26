'use client';
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '') + '/api';

export default function FeedbackModal({ isOpen, onClose, initialType = 'Loved it', context = {} }) {
  const [type, setType] = useState(initialType);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setIsSubmitting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'anonymous';
      
      const payload = {
        user_id: userId,
        type,
        message,
        rating: rating || null,
        context: {
          ...context,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          url: window.location.href
        },
        page: window.location.pathname,
        feature: context.feature || 'general'
      };

      const res = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onClose();
          setSubmitted(false);
          setMessage('');
          setRating(0);
        }, 2000);
      }
    } catch (err) {
      console.error('Feedback error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="animate-in" style={{
        background: '#fff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '450px',
        padding: '32px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
        position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '20px', right: '20px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted-foreground)'
        }}>
          <span className="mat-icon">close</span>
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '50%', 
              background: 'rgba(34,197,94,0.1)', color: '#22c55e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <span className="mat-icon" style={{ fontSize: '32px' }}>check_circle</span>
            </div>
            <h3 style={{ margin: '0 0 8px', fontFamily: 'Calistoga' }}>Thank You!</h3>
            <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Your feedback helps us sail smoother.</p>
          </div>
        ) : (
          <>
            <h2 style={{ margin: '0 0 24px', fontFamily: 'Calistoga', fontSize: '24px' }}>How can we help?</h2>
            
            <div className="flex-column gap-4">
              <div>
                <label className="form-label" style={{ marginBottom: '8px' }}>Feedback Type</label>
                <select 
                  value={type} 
                  onChange={e => setType(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '14px' }}
                >
                  <option value="Bug">🐛 Bug</option>
                  <option value="Confusing">🤔 Confusing</option>
                  <option value="Feature Request">🚀 Feature Request</option>
                  <option value="Loved it">❤️ Loved it</option>
                  <option value="Other">💬 Other</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: '8px' }}>Rating (Optional)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <button 
                      key={s}
                      onClick={() => setRating(s)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: s <= rating ? '#f59e0b' : 'var(--border)',
                        transition: 'transform 0.1s'
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span className="mat-icon" style={{ fontSize: '28px' }}>{s <= rating ? 'star' : 'star_outline'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: '8px' }}>Message</label>
                <textarea 
                  rows="4"
                  placeholder="Tell us more..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  style={{ 
                    width: '100%', padding: '12px', borderRadius: '12px', 
                    border: '1px solid var(--border)', fontSize: '14px',
                    resize: 'none'
                  }}
                />
              </div>

              <button 
                className="btn btn-primary" 
                onClick={handleSubmit}
                disabled={isSubmitting || !message.trim()}
                style={{ width: '100%', padding: '14px', marginTop: '8px' }}
              >
                {isSubmitting ? 'Sending...' : 'Submit Feedback'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
