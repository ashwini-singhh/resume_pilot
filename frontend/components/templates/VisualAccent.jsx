import React from 'react';
import ResumeEngine from './ResumeEngine';
import { ProfilePhoto } from './PhotoUtils';
import { getScaleStyles } from '../../lib/resumeUtils';

export default function VisualAccent(props) {
  const { profile, scale, ff, lineHt, accentColor } = props;
  const styles = getScaleStyles(scale);
  const accent = accentColor || '#db2777';

  // 1. Minimal Header with Accent bar
  const renderHeader = ({ accent, Editable }) => (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ borderLeft: `8px solid ${accent}`, paddingLeft: '24px' }}>
        <Editable 
          text={profile.name} 
          path="name"
          style={{ fontSize: styles.nameSize, fontWeight: 900, color: '#111827', letterSpacing: '-0.02em' }} 
        />
        <Editable 
          text={profile.title} 
          path="title"
          style={{ fontSize: '16px', fontWeight: 600, color: accent, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }} 
        />
      </div>
      <div style={{ display: 'flex', gap: '24px', marginTop: '24px', fontSize: '12px', color: '#6b7280' }}>
         <Editable text={profile.email} path="email" tagName="span" />
         <Editable text={profile.phone} path="phone" tagName="span" />
         <Editable text={profile.location} path="location" tagName="span" />
      </div>
      <Editable 
        text={profile.summary} 
        path="summary"
        style={{ marginTop: '24px', fontSize: '14px', color: '#4b5563', lineHeight: 1.6, maxWidth: '600px' }} 
      />
    </div>
  );

  return (
    <ResumeEngine 
      {...props}
      layoutType="linear"
      styles={{
        ...styles,
      }}
      renderHeader={renderHeader}
      renderSectionTitle={({ title }) => (
        <div style={{ 
            fontSize: '14px', 
            fontWeight: 800, 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em', 
            marginBottom: '12px',
            marginTop: '24px',
            color: accentColor,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        }}>
          {title}
          <div style={{ flex: 1, height: '1px', background: '#f3f4f6' }} />
        </div>
      )}
      containerStyle={{
        fontFamily: ff,
        lineHeight: lineHt,
        background: '#fff',
        padding: '60px',
      }}
    />
  );
}
