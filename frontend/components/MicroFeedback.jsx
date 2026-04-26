'use client';
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '') + '/api';

export default function MicroFeedback({ feature, context = {}, size = 16 }) {
  const [voted, setVoted] = useState(null); // 'up' or 'down'
  const [showInput, setShowInput] = useState(false);
  const [comment, setComment] = useState('');

  const handleVote = async (vote) => {
    setVoted(vote);
    if (vote === 'down') {
      setShowInput(true);
    } else {
      await submitFeedback(vote, 'Loved it');
    }
  };

  const submitFeedback = async (vote, type, msg = '') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'anonymous';
      
      const payload = {
        user_id: userId,
        type: type,
        message: msg || (vote === 'up' ? 'Helpful suggestion' : 'Not helpful'),
        rating: vote === 'up' ? 5 : 1,
        context: { ...context, vote },
        page: window.location.pathname,
        feature: feature
      };

      await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Micro-feedback error:', err);
    }
  };

  const handleCommentSubmit = async () => {
    await submitFeedback('down', 'Confusing', comment);
    setShowInput(false);
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
      <button 
        onClick={() => handleVote('up')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: voted === 'up' ? '#22c55e' : 'var(--muted-foreground)',
          opacity: voted === 'down' ? 0.3 : 1,
          padding: '2px', display: 'flex', transition: 'all 0.2s'
        }}
      >
        <span className="mat-icon" style={{ fontSize: `${size}px` }}>thumb_up</span>
      </button>
      
      <button 
        onClick={() => handleVote('down')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: voted === 'down' ? '#ef4444' : 'var(--muted-foreground)',
          opacity: voted === 'up' ? 0.3 : 1,
          padding: '2px', display: 'flex', transition: 'all 0.2s'
        }}
      >
        <span className="mat-icon" style={{ fontSize: `${size}px` }}>thumb_down</span>
      </button>

      {showInput && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '8px',
          background: '#fff', border: '1px solid var(--border)', borderRadius: '12px',
          padding: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100,
          width: '200px'
        }}>
          <p style={{ fontSize: '11px', fontWeight: 600, margin: '0 0 8px' }}>What went wrong?</p>
          <textarea 
            autoFocus
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Too generic? Incorrect?..."
            style={{ 
              width: '100%', fontSize: '12px', padding: '8px', 
              borderRadius: '8px', border: '1px solid var(--border)',
              marginBottom: '8px', resize: 'none'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
            <button className="btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setShowInput(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={handleCommentSubmit}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
