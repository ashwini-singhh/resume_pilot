import React, { useState, useEffect, useRef } from 'react';
import * as api from '../lib/api';

/**
 * InterviewPanel — AI Technical Interviewer
 * 
 * Phases:
 * 0. Setup: Select section (Experience / Projects)
 * 1. Interview: Q&A loop with InterviewAgent
 * 2. Completion: Preview generated bullets & Merge
 */
export default function InterviewPanel({ userId, contextId, profile, onClose, onMergeSuccess }) {
  const [phase, setPhase] = useState(0); // 0: Setup, 1: Interview, 2: Result
  const [sectionType, setSectionType] = useState('experience');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'typing'
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { bullets: [], confidence: 0.9 }
  
  const chatEndRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const handleStartInterview = async (type) => {
    setSectionType(type);
    setPhase(1);
    setStatus('loading');
    setError('');
    
    try {
      // Fetch FIRST question immediately
      const res = await api.interviewTurn({
        userId,
        contextId,
        sectionType: type,
        chatHistory: []
      });

      if (res.type === 'question') {
        setStatus('typing');
        // Simulate typing delay for AI persona
        setTimeout(() => {
          setMessages([{ role: 'assistant', content: res.question }]);
          setStatus('idle');
        }, 1200);
      } else {
        // Edge case: AI was already confident (unlikely)
        setResult(res);
        setPhase(2);
        setStatus('idle');
      }
    } catch (e) {
      setError("Failed to start interview: " + e.message);
      setStatus('idle');
    }
  };

  const handleSend = async () => {
    if (!chatInput.trim() || status !== 'idle') return;
    
    const userMsg = { role: 'user', content: chatInput.trim() };
    const newHistory = [...messages, userMsg];
    
    setMessages(newHistory);
    setChatInput('');
    setStatus('loading');
    setError('');

    try {
      const res = await api.interviewTurn({
        userId,
        contextId,
        sectionType,
        chatHistory: newHistory
      });

      if (res.type === 'question') {
        setStatus('typing');
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: res.question }]);
          setStatus('idle');
        }, 1500);
      } else if (res.type === 'result') {
        setResult(res);
        setPhase(2);
        setStatus('idle');
      }
    } catch (e) {
      setError("Interview interrupted: " + e.message);
      setStatus('idle');
    }
  };

  const handleMerge = async () => {
    if (!result || !result.bullets) return;
    setStatus('loading');
    try {
      const p = JSON.parse(JSON.stringify(profile));
      const sectionKey = sectionType === 'experience' ? 'experience' : 'projects';
      
      // Create a skeleton entry for the user to fill in the rest
      const newEntry = {
        id: `int_${Date.now()}`,
        name: sectionType === 'experience' ? "New Experience" : "New Project",
        company: sectionType === 'experience' ? "New Company" : undefined,
        title: sectionType === 'experience' ? "New Role" : undefined,
        period: "Dates TBA",
        bullets: result.bullets,
        is_new_from_interview: true 
      };

      if (!p[sectionKey]) p[sectionKey] = [];
      p[sectionKey].unshift(newEntry);

      await api.saveProfile(p, userId, contextId);
      if (onMergeSuccess) onMergeSuccess(p);
      onClose();
    } catch (e) {
      setError("Failed to merge profile: " + e.message);
      setStatus('idle');
    }
  };

  return (
    <div className="modal-overlay" style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 2000,
      backdropFilter: 'blur(8px)',
      backgroundColor: 'rgba(0,0,0,0.4)',
      padding: '20px'
    }}>
      <div className="animate-in" style={{ 
        width: '100%', 
        maxWidth: '720px', 
        height: '85vh', 
        maxHeight: '800px', 
        display: 'flex', 
        flexDirection: 'column', 
        position: 'relative',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 32px 128px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}>
        
        {/* HEADER */}
        <div style={{ 
          padding: '28px 32px', 
          borderBottom: '1px solid var(--border)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(to right, rgba(99, 102, 241, 0.05), transparent)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--foreground)' }}>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' 
              }}>
                <span className="mat-icon" style={{ fontSize: '24px' }}>psychology</span>
              </div>
              Interview Agent
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{ 
                padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, 
                background: 'var(--accent)', color: '#fff', textTransform: 'uppercase' 
              }}>
                Phase {phase + 1}
              </span>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted-foreground)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {phase === 0 ? 'Context Identification' : phase === 1 ? 'Technical Signal Extraction' : 'Drafting Resume Excellence'}
              </p>
            </div>
          </div>
          <button 
            className="icon-btn-delete" 
            onClick={onClose} 
            style={{ 
              background: 'var(--muted)', width: '36px', height: '36px', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none'
            }}
          >
            <span className="mat-icon" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column' }}>
          
          {error && (
            <div style={{ 
              padding: '16px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', 
              borderRadius: '12px', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' 
            }}>
              <span className="mat-icon" style={{ fontSize: '20px' }}>error</span> 
              <div>
                <strong>Technical Interruption:</strong> {error}
              </div>
            </div>
          )}

          {/* PHASE 0: SETUP */}
          {phase === 0 && (
            <div className="flex-column gap-5" style={{ textAlign: 'center', marginTop: '20px' }}>
              <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <h4 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--foreground)', marginBottom: '12px' }}>What are we highlighting?</h4>
                <p style={{ fontSize: '16px', color: 'var(--muted-foreground)', lineHeight: 1.6, marginBottom: '40px' }}>
                  Our Staff AI conducts a role-specific interview to extract the scale, impact, and technical depth that general AI often misses.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div 
                  className="card-hover-effect"
                  style={{ 
                    padding: '32px', borderRadius: '20px', border: '1px solid var(--border)', background: '#fff',
                    textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
                  }}
                  onClick={() => handleStartInterview('experience')}
                >
                  <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="mat-icon" style={{ fontSize: '32px' }}>work</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--foreground)' }}>Work Experience</div>
                    <div style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '4px' }}>Corporate roles, internships, or freelance.</div>
                  </div>
                </div>
                <div 
                  className="card-hover-effect"
                  style={{ 
                    padding: '32px', borderRadius: '20px', border: '1px solid var(--border)', background: '#fff',
                    textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
                  }}
                  onClick={() => handleStartInterview('project')}
                >
                  <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(99, 102, 105, 0.1)', color: '#636669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="mat-icon" style={{ fontSize: '32px' }}>account_tree</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--foreground)' }}>Technical Project</div>
                    <div style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '4px' }}>SaaS, Open source, or Personal builds.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PHASE 1: CHAT */}
          {phase === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {messages.length === 0 && status === 'loading' && (
                  <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <span className="mat-icon spin" style={{ fontSize: '32px', color: 'var(--accent)' }}>sync</span>
                    <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', marginTop: '12px' }}>Initializing Interview Agent...</p>
                  </div>
                )}
                
                {messages.map((m, i) => (
                  <div key={i} style={{ 
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
                  }}>
                    <div style={{ 
                       fontSize: '10px', fontWeight: 800, color: 'var(--muted-foreground)', 
                       marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' 
                    }}>
                       {m.role === 'user' ? 'You' : 'Interviewer'}
                    </div>
                    <div style={{ 
                      padding: '14px 20px',
                      borderRadius: '18px',
                      background: m.role === 'user' ? 'var(--accent)' : '#fff',
                      color: m.role === 'user' ? '#fff' : 'var(--foreground)',
                      fontSize: '15px',
                      lineHeight: 1.6,
                      border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                      boxShadow: m.role === 'user' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : '0 2px 8px rgba(0,0,0,0.02)',
                      borderBottomRightRadius: m.role === 'user' ? '4px' : '18px',
                      borderBottomLeftRadius: m.role === 'assistant' ? '4px' : '18px',
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                
                {status === 'typing' && (
                  <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--muted-foreground)', marginBottom: '4px', textTransform: 'uppercase' }}>Interviewer</div>
                    <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '14px 20px', borderRadius: '18px', borderBottomLeftRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1s infinite 0.1s' }} />
                      <div className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1s infinite 0.2s' }} />
                      <div className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1s infinite 0.3s' }} />
                    </div>
                  </div>
                )}
                
                {status === 'loading' && messages.length > 0 && (
                  <div style={{ textAlign: 'center', padding: '10px' }}>
                     <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted-foreground)', background: 'var(--muted)', padding: '4px 12px', borderRadius: '20px' }}>
                       Analyzing technical signal...
                     </span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* CHAT INPUT */}
              <div style={{ 
                marginTop: '32px', display: 'flex', gap: '12px', flexShrink: 0, 
                background: '#fff', padding: '12px', borderRadius: '16px', border: '1px solid var(--border)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}>
                <input 
                  style={{ 
                    flex: 1, border: 'none', background: 'transparent', outline: 'none', 
                    fontSize: '15px', color: 'var(--foreground)', paddingLeft: '8px' 
                  }}
                  placeholder="Elaborate on your systems, stack, or impact..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  disabled={status !== 'idle'}
                />
                <button 
                  className="btn btn-primary"
                  onClick={handleSend}
                  disabled={status !== 'idle' || !chatInput.trim()}
                  style={{ 
                    borderRadius: '12px', height: '44px', padding: '0 20px', 
                    display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 
                  }}
                >
                  Send <span className="mat-icon" style={{ fontSize: '18px' }}>send</span>
                </button>
              </div>
            </div>
          )}

          {/* PHASE 2: RESULT */}
          {phase === 2 && result && (
            <div className="animate-in" style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '80px', height: '80px', borderRadius: '24px', background: '#ecfdf5', color: '#059669', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                border: '1px solid #d1fae5'
              }}>
                <span className="mat-icon" style={{ fontSize: '40px' }}>check_circle</span>
              </div>
              <h4 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '12px', color: 'var(--foreground)' }}>Bullets Synthesized</h4>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '16px', maxWidth: '500px', margin: '0 auto 32px', lineHeight: 1.6 }}>
                Based on your technical drill-down, we've drafted elite-tier resume context with <strong>{(result.confidence * 100).toFixed(0)}% confidence</strong>.
              </p>

              <div style={{ 
                background: '#fff', border: '1px solid var(--border)', padding: '32px', 
                borderRadius: '20px', textAlign: 'left', marginBottom: '40px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.02)'
              }}>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {result.bullets.map((b, i) => (
                    <li key={i} style={{ marginBottom: '16px', fontSize: '14px', lineHeight: 1.7, color: 'var(--foreground)', display: 'flex', gap: '16px' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 900, fontSize: '18px' }}>•</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '16px', maxWidth: '400px', margin: '0 auto' }}>
                <button 
                   className="btn" 
                   style={{ flex: 1, height: '52px', fontSize: '15px', fontWeight: 700 }} 
                   onClick={onClose}
                >
                  Discard
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1.2, height: '52px', fontSize: '15px', fontWeight: 700 }} 
                  onClick={handleMerge}
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Saving...' : 'Add to Resume'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
