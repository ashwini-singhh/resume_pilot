import React from 'react';
import ResumeEngine from './ResumeEngine';
import { getScaleStyles } from '../../lib/resumeUtils';

export default function Classic(props) {
  const { profile, scale, ff, lineHt } = props;
  const styles = getScaleStyles(scale);

  // Traditional Centered Header
  const renderHeader = ({ accent, Editable }) => (
    <div style={{ textAlign: 'center', borderBottom: `1px solid ${accent}`, paddingBottom: '12px', marginBottom: '20px' }}>
      <Editable 
        text={profile.name?.toUpperCase() || 'JOHN DOE'} 
        path="name"
        style={{ fontSize: styles.nameSize, fontWeight: 'bold', fontFamily: 'serif' }} 
      />
      <div style={{ fontSize: '13px', marginTop: '6px' }}>
        <Editable text={profile.email} path="email" tagName="span" /> | <Editable text={profile.phone} path="phone" tagName="span" /> | <Editable text={profile.location} path="location" tagName="span" />
      </div>
    </div>
  );

  const renderSectionTitle = ({ title, accent }) => (
    <div style={{ 
      fontSize: '14px', 
      fontWeight: 'bold', 
      borderBottom: '1px solid #aaa', 
      marginBottom: '10px', 
      marginTop: '16px',
      textTransform: 'uppercase',
      color: accent
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
        fontFamily: "'Times New Roman', Georgia, serif",
        lineHeight: lineHt,
        background: '#fff',
        padding: '50px',
      }}
    />
  );
}
