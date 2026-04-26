import React from 'react';
import ResumeEngine from './ResumeEngine';
import { getScaleStyles } from '../../lib/resumeUtils';

export default function ModernSingle(props) {
  const { profile, scale, ff, lineHt } = props;
  const styles = getScaleStyles(scale);

  const renderHeader = ({ accent, Editable }) => (
    <div style={{ textAlign: 'center', marginBottom: '32px', borderBottom: `2px solid ${accent}`, paddingBottom: '24px' }}>
      <Editable 
        text={profile.name} 
        path="name"
        style={{ fontSize: styles.nameSize, fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', marginBottom: '8px' }} 
      />
      <div style={{ fontSize: '13px', fontWeight: 600, color: accent, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        <Editable text={profile.title || "Professional"} path="title" tagName="span" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '12px', color: '#4b5563', marginBottom: '16px' }}>
        <Editable text={profile.email} path="email" tagName="span" />
        <Editable text={profile.phone} path="phone" tagName="span" />
        <Editable text={profile.location} path="location" tagName="span" />
      </div>
      <Editable 
        text={profile.summary} 
        path="summary"
        style={{ fontSize: '13.5px', color: '#374151', lineHeight: 1.6, maxWidth: '800px', margin: '0 auto' }} 
      />
    </div>
  );

  const renderSectionTitle = ({ title, accent }) => (
    <div style={{ 
      fontSize: '14px', 
      fontWeight: '900', 
      color: accent, 
      textTransform: 'uppercase', 
      letterSpacing: '0.1em',
      marginBottom: '12px',
      marginTop: '20px',
      borderLeft: `4px solid ${accent}`,
      paddingLeft: '12px',
      lineHeight: 1
    }}>
      {title}
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
      containerStyle={{
        fontFamily: ff,
        lineHeight: lineHt,
        background: '#fff',
        padding: '60px',
      }}
    />
  );
}
