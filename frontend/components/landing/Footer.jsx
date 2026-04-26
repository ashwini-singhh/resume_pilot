import React from 'react';

export default function Footer() {
  return (
    <footer style={{ 
      background: 'var(--background)', 
      padding: '80px 20px', 
      borderTop: '1px solid var(--border)',
      marginTop: '80px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '40px' }}>
          <div>
             <div className="logo-text calistoga" style={{ fontSize: '24px', color: 'var(--foreground)' }}>
              ResumeSailor
            </div>
            <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', marginTop: '12px', maxWidth: '300px' }}>
              The AI-powered resume platform for engineers who want more interviews and better offers.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '64px' }}>
            <div className="flex-column gap-3">
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>Product</div>
              <a href="#features" className="footer-link">Features</a>
              <a href="#how-it-works" className="footer-link">How it Works</a>
              <a href="#pricing" className="footer-link">Pricing</a>
            </div>
            
            <div className="flex-column gap-3">
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>Legal</div>
              <a href="/terms" className="footer-link">Terms of Service</a>
              <a href="/privacy" className="footer-link">Privacy Policy</a>
            </div>
            
            <div className="flex-column gap-3">
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>Support</div>
              <a href="mailto:support@resumesailor.com" className="footer-link">Email Us</a>
            </div>
          </div>
        </div>
        
        <div style={{ 
          marginTop: '64px', 
          paddingTop: '32px', 
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          color: 'var(--muted-foreground)'
        }}>
          <div>© 2026 ResumeSailor. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '20px' }}>
             <span>Built with ⚡ by Ashwini Singh</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .footer-link {
          color: var(--muted-foreground);
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
        }
        .footer-link:hover {
          color: var(--accent);
        }
      `}</style>
    </footer>
  );
}
