import React from 'react';
import ResumeEngine from './ResumeEngine';
import { ProfilePhoto } from './PhotoUtils';
import { getScaleStyles } from '../../lib/resumeUtils';

export default function VisualCard(props) {
  const { profile, scale, ff, lineHt, accentColor } = props;
  const styles = getScaleStyles(scale);
  const accent = accentColor || '#3b82f6';

  const renderHeader = ({ accent, Editable }) => (
    <div style={{ 
        marginBottom: '32px', 
        background: '#fff', 
        padding: '32px', 
        borderRadius: '16px', 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '32px'
    }}>
      <ProfilePhoto 
        photo={profile.profile_photo_url} 
        name={profile.name} 
        size={100} 
        bgColor={accent}
        textColor="#fff"
      />
      <div>
        <Editable 
          text={profile.name} 
          path="name"
          style={{ fontSize: styles.nameSize, fontWeight: 900, color: '#111827', letterSpacing: '-0.03em' }} 
        />
        <Editable 
          text={profile.title || (profile.experience?.[0]?.title)} 
          path="title"
          style={{ fontSize: '15px', color: '#6b7280', marginTop: '4px' }} 
        />
        <div style={{ marginTop: '16px', display: 'flex', gap: '20px', fontSize: '12px', color: accent, fontWeight: 600 }}>
          <Editable text={profile.email} path="email" tagName="span" />
          <Editable text={profile.phone} path="phone" tagName="span" />
        </div>
      </div>
    </div>
  );

  const renderSectionTitle = ({ title, accent }) => (
    <div style={{ 
        fontSize: '13px', 
        fontWeight: 800, 
        textTransform: 'uppercase', 
        letterSpacing: '0.1em', 
        marginBottom: '16px',
        color: '#374151',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: accent }} />
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
        background: '#f8fafc', // Very light gray-blue background
        padding: '40px',
      }}
    />
  );
}
