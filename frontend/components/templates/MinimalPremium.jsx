import React from 'react';
import ResumeEngine from './ResumeEngine';
import { getScaleStyles } from '../../lib/resumeUtils';

export default function MinimalPremium(props) {
  const { profile, scale, ff, lineHt } = props;
  const styles = getScaleStyles(scale);

  // Minimal Header
  const renderHeader = ({ accent, Editable }) => (
    <div style={{ marginBottom: '60px' }}>
      <Editable 
        text={profile.name?.toUpperCase()} 
        path="name"
        style={{ fontSize: styles.nameSize, fontWeight: 300, letterSpacing: '0.15em', color: '#111827' }} 
      />
      <div style={{ marginTop: '16px', fontSize: styles.contactSize, color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        <Editable text={profile.email} path="email" tagName="span" /> · <Editable text={profile.phone} path="phone" tagName="span" /> · <Editable text={profile.location} path="location" tagName="span" />
      </div>
    </div>
  );

  const renderSectionTitle = ({ title, accent }) => (
    <div style={{ 
      fontSize: styles.sectionSize, 
      fontWeight: '600', 
      color: accent, 
      textTransform: 'uppercase', 
      letterSpacing: '0.2em',
      marginBottom: '24px',
      marginTop: '40px',
      textAlign: 'left'
    }}>
      {title}
    </div>
  );

  const renderBullet = ({ text, style }) => (
    <div style={{ fontSize: styles.bulletSize, marginBottom: '6px', color: '#4b5563', lineHeight: 1.6, ...style }}>
      {text}
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
      renderSectionTitle={renderSectionTitle}
      renderBullet={renderBullet}
      containerStyle={{
        fontFamily: ff,
        lineHeight: lineHt,
        background: '#fff',
        padding: '80px',
      }}
    />
  );
}
