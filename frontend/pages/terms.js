import React from 'react';
import Head from 'next/head';

export default function Terms() {
  return (
    <div className="container" style={{ maxWidth: '800px', margin: '80px auto', padding: '0 20px' }}>
      <Head>
        <title>Terms of Service | ResumeSailor</title>
      </Head>
      <h1 className="calistoga" style={{ fontSize: '48px', marginBottom: '32px' }}>Terms of Service</h1>
      
      <section className="animate-in" style={{ lineHeight: 1.6, color: 'var(--muted-foreground)' }}>
        <p>Last Updated: April 25, 2026</p>
        
        <h2 style={{ color: 'var(--foreground)', marginTop: '32px' }}>1. Acceptance of Terms</h2>
        <p>By accessing and using ResumeSailor ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
        
        <h2 style={{ color: 'var(--foreground)', marginTop: '32px' }}>2. Description of Service</h2>
        <p>ResumeSailor provides AI-powered resume analysis, optimization, and generation tools. We use large language models (LLMs) to provide suggestions. These suggestions are for informational purposes only and do not guarantee employment.</p>
        
        <h2 style={{ color: 'var(--foreground)', marginTop: '32px' }}>3. User Data</h2>
        <p>You retain ownership of all resumes and personal information you upload to the Service. By uploading content, you grant us a license to process this data solely for the purpose of providing the Service to you.</p>
        
        <h2 style={{ color: 'var(--foreground)', marginTop: '32px' }}>4. Payment and Credits</h2>
        <p>ResumeSailor offers free and premium plans. Premium features require purchase of credits or subscriptions via Stripe. All sales are final unless otherwise required by law.</p>
        
        <h2 style={{ color: 'var(--foreground)', marginTop: '32px' }}>5. Limitation of Liability</h2>
        <p>ResumeSailor is provided "as is". We are not responsible for any career decisions, application outcomes, or data loss resulting from the use of our service.</p>
      </section>
      
      <div style={{ marginTop: '64px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
        <a href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>← Back to Home</a>
      </div>
    </div>
  );
}
