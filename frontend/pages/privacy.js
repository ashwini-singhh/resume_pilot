import React from 'react';
import Head from 'next/head';

export default function Privacy() {
  return (
    <div className="container" style={{ maxWidth: '800px', margin: '80px auto', padding: '0 20px' }}>
      <Head>
        <title>Privacy Policy | ResumeSailor</title>
      </Head>
      <h1 className="calistoga" style={{ fontSize: '48px', marginBottom: '32px' }}>Privacy Policy</h1>
      
      <section className="animate-in" style={{ lineHeight: 1.6, color: 'var(--muted-foreground)' }}>
        <p>Last Updated: April 25, 2026</p>
        
        <h2 style={{ color: 'var(--foreground)', marginTop: '32px' }}>1. Data Collection</h2>
        <p>We collect information you provide directly to us, such as when you upload a resume, create an account, or communicate with our support team. This includes your name, email, and professional history.</p>
        
        <h2 style={{ color: 'var(--foreground)', marginTop: '32px' }}>2. Use of AI</h2>
        <p>Your resume data is processed by large language models (e.g., via OpenAI, Google, or Anthropic) to provide optimizations. We ensure that your data is not used to train these base models without your explicit consent.</p>
        
        <h2 style={{ color: 'var(--foreground)', marginTop: '32px' }}>3. Third-Party Services</h2>
        <p>We use Stripe for payment processing and Supabase for authentication and database management. These services have their own privacy policies which you should review.</p>
        
        <h2 style={{ color: 'var(--foreground)', marginTop: '32px' }}>4. Your Rights</h2>
        <p>You have the right to access, correct, or delete your personal data at any time via your dashboard settings or by contacting us.</p>
        
        <h2 style={{ color: 'var(--foreground)', marginTop: '32px' }}>5. Cookies</h2>
        <p>We use essential cookies to maintain your login session and improve your experience.</p>
      </section>
      
      <div style={{ marginTop: '64px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
        <a href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>← Back to Home</a>
      </div>
    </div>
  );
}
