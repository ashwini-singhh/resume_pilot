import React from 'react';
import ResumeEngine from './ResumeEngine';
import { getScaleStyles } from '../../lib/resumeUtils';

export default function ATSStrict(props) {
  const { profile, scale } = props;
  const styles = getScaleStyles(scale);

  // Strict Header
  const renderHeader = ({ accent, Editable }) => (
    <div style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: `2px solid ${accent}` }}>
      <Editable 
        text={profile.name?.toUpperCase()} 
        path="name"
        style={{ fontSize: styles.nameSize, fontWeight: 900, color: '#111827', letterSpacing: '-0.03em' }} 
      />
      <div style={{ marginTop: '8px', fontSize: styles.contactSize, color: '#4b5563', display: 'flex', gap: '16px' }}>
        <Editable text={profile.email} path="email" tagName="span" />
        <span style={{ color: '#d1d5db' }}>|</span>
        <Editable text={profile.phone} path="phone" tagName="span" />
        <span style={{ color: '#d1d5db' }}>|</span>
        <Editable text={profile.location} path="location" tagName="span" />
      </div>
    </div>
  );

  const renderSectionTitle = ({ title, accent }) => (
    <div style={{ 
      fontSize: styles.sectionSize, 
      fontWeight: '800', 
      color: accent, 
      textTransform: 'uppercase', 
      letterSpacing: '0.05em',
      borderBottom: '1px solid #000',
      paddingBottom: '2px',
      marginBottom: `calc(${styles.blockGap || '12px'} * 0.8)`,
      marginTop: '20px'
    }}>
      {title}
    </div>
  );

  const renderBullet = ({ text, style }) => (
    <div style={{ fontSize: styles.bulletSize, marginLeft: '25px', display: 'list-item', listStyleType: 'disc', color: '#000', ...style }}>
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
        fontFamily: 'Arial, sans-serif',
        lineHeight: 1.2,
        padding: '50px',
        color: '#000',
        background: '#fff',
      }}
    />
  );
}
