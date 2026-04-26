'use client';
import React, { useState, useEffect } from 'react';
import FeedbackModal from './FeedbackModal';

export default function ContextualPrompt({ trigger, question, feature, metadata = {} }) {
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (trigger) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  if (!visible) return null;

  return (
    <>
      <div className="animate-in" style={{
        position: 'fixed', bottom: '80px', right: '24px',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '16px', width: '300px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.12)', zIndex: 900,
        display: 'flex', flexDirection: 'column', gap: '12px'
      }}>
        <button 
          onClick={() => setVisible(false)}
          style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
        >
          <span className="mat-icon" style={{ fontSize: '14px' }}>close</span>
        </button>

        <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, paddingRight: '20px' }}>{question}</p>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, padding: '6px', fontSize: '12px' }}
            onClick={() => {
              setModalOpen(true);
              setVisible(false);
            }}
          >
            Yes, tell us more
          </button>
          <button 
            className="btn" 
            style={{ flex: 1, padding: '6px', fontSize: '12px' }}
            onClick={() => setVisible(false)}
          >
            No thanks
          </button>
        </div>
      </div>

      <FeedbackModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        initialType="Loved it"
        context={{ ...metadata, feature, trigger: 'contextual' }}
      />
    </>
  );
}
