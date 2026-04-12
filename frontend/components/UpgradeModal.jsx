import React, { useState } from 'react';
import { createCheckoutSession } from '../lib/api';

export default function UpgradeModal({ user, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // 1. Create Checkout Session on backend
      // We are offering a 50% discount: 400 -> 200
      const session = await createCheckoutSession(user.id, 200);

      // 2. Redirect to Stripe Checkout page
      if (session && session.url) {
        window.location.href = session.url;
      } else {
        throw new Error("Failed to create checkout session URL");
      }
    } catch (err) {
      console.error("Stripe Checkout Error:", err);
      alert('Failed to initialize Stripe checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') onClose(); }}>
      <div className="modal-content animate-in" style={{ maxWidth: '420px', textAlign: 'center', padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            width: '64px', height: '64px', background: 'rgba(99, 102, 241, 0.1)', 
            borderRadius: '50%', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', margin: '0 auto' 
          }}>
            <span className="mat-icon" style={{ fontSize: '32px', color: 'var(--accent)' }}>workspace_premium</span>
          </div>
        </div>
        
        <h2 style={{ marginBottom: '12px' }}>Upgrade to Premium</h2>
        <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', marginBottom: '28px', lineHeight: 1.6 }}>
          You've reached your free limit. Unlock unlimited AI optimizations, JD matching, and professional refinements.
        </p>
        
        <div style={{ 
          background: 'var(--muted)', border: '1px solid var(--border)', 
          borderRadius: '16px', padding: '24px', marginBottom: '28px', textAlign: 'left',
          position: 'relative', overflow: 'hidden'
        }}>
           <div style={{ 
             position: 'absolute', top: '12px', right: '-35px', background: '#22c55e', 
             color: 'white', fontSize: '10px', fontWeight: 800, padding: '4px 40px', 
             transform: 'rotate(45deg)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
           }}>
             50% OFF
           </div>

           <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '4px' }}>
             One-time Purchase
           </div>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
             <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--foreground)' }}>₹200</span>
             <span style={{ fontSize: '18px', color: 'var(--muted-foreground)', textDecoration: 'line-through', opacity: 0.6 }}>₹400</span>
           </div>
           
           <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--foreground)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li style={{ listStyleType: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mat-icon" style={{ fontSize: '16px', color: '#22c55e' }}>check_circle</span>
                Unlimited AI Optimizations
              </li>
              <li style={{ listStyleType: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mat-icon" style={{ fontSize: '16px', color: '#22c55e' }}>check_circle</span>
                Unlimited JD ATS Matching
              </li>
              <li style={{ listStyleType: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mat-icon" style={{ fontSize: '16px', color: '#22c55e' }}>check_circle</span>
                Unlimited Content Generation
              </li>
           </ul>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handlePayment} 
          disabled={loading}
          style={{ 
            width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600,
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}
        >
          {loading ? 'Initializing...' : (
             <>
               <span className="mat-icon" style={{fontSize: '20px'}}>bolt</span> 
               Pay ₹200 to Unlock
             </>
          )}
        </button>
        
        <button className="btn" onClick={onClose} style={{ 
          width: '100%', marginTop: '16px', border: 'none', 
          background: 'transparent', color: 'var(--muted-foreground)',
          fontSize: '13px'
        }}>
          Maybe Later
        </button>
        
        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', opacity: 0.5 }}>
           <span className="mat-icon" style={{ fontSize: '14px' }}>lock</span>
           <span style={{ fontSize: '11px', fontWeight: 600 }}>Secure payment via Stripe</span>
        </div>
      </div>
    </div>
  );
}
