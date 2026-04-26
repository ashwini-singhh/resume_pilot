import React from 'react';
import ResumeEngine from './ResumeEngine';
import { getScaleStyles } from '../../lib/resumeUtils';

export default function ModernTech(props) {
  const { profile, scale, ff, lineHt } = props;
  const styles = getScaleStyles(scale);

  // Custom Main Header
  const renderHeader = ({ accent, Editable }) => (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Editable 
          text={profile.name?.toUpperCase()}
          path="name"
          style={{ fontSize: '32px', fontWeight: 900, color: accent }} 
        />
      </div>
      <Editable 
        text={profile.summary} 
        path="summary"
        style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280', maxWidth: '500px', lineHeight: 1.6 }} 
      />
    </div>
  );

  const renderSectionTitle = ({ title }) => (
    <div style={{ 
      fontSize: '14px', 
      fontWeight: '800', 
      color: '#111827', 
      textTransform: 'uppercase', 
      letterSpacing: '0.05em',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <div style={{ width: '4px', height: '16px', background: 'var(--accent)', borderRadius: '2px' }} />
      {title}
    </div>
  );

  const renderEntryHeader = ({ title, subtitle, styles }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
       <span style={{ fontWeight: 700, fontSize: styles.entryHeaderSize, color: '#111827' }}>{title}</span>
       <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', background: 'rgba(5b, 130, 246, 0.08)', padding: '2px 8px', borderRadius: '12px' }}>{subtitle}</span>
    </div>
  );

  const sidebarSections = ['Skills', 'Education'];

  return (
    <ResumeEngine 
      {...props}
      layoutType="two-column"
      sidebarSections={sidebarSections}
      styles={{
        ...styles,
      }}
      renderHeader={renderHeader}
      renderSectionTitle={renderSectionTitle}
      renderEntryHeader={renderEntryHeader}
      containerStyle={{
        fontFamily: ff,
        lineHeight: lineHt,
        background: '#f9fafb', // Very subtle off-white
        padding: '50px',
      }}
    />
  );
}
