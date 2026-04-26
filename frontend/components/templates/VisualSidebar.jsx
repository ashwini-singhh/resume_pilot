import React from 'react';
import ResumeEngine from './ResumeEngine';
import { ProfilePhoto } from './PhotoUtils';
import { getScaleStyles } from '../../lib/resumeUtils';

export default function VisualSidebar(props) {
  const { profile, scale, ff, lineHt, accentColor } = props;
  const styles = getScaleStyles(scale);
  const accent = accentColor || '#2563eb';

  // 1. Sidebar Header (Photo + Small Name + Contact)
  const renderSidebarHeader = ({ accent, Editable }) => (
    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <ProfilePhoto 
            photo={profile.profile_photo_url} 
            name={profile.name} 
            size={100}
            bgColor="rgba(255,255,255,0.1)"
        />
      </div>
      <Editable 
        text={profile.name?.toUpperCase()}
        path="name"
        style={{ fontSize: styles.bulletSize, fontWeight: 600, color: '#fff', marginBottom: '20px', letterSpacing: '0.05em' }} 
      />
      <div style={{ fontSize: `calc(${styles.bulletSize} * 0.9)`, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px', color: 'rgba(255,255,255,0.9)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="mat-icon" style={{ fontSize: '14px' }}>email</span>
          <Editable text={profile.email} path="email" tagName="span" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="mat-icon" style={{ fontSize: '14px' }}>phone</span>
          <Editable text={profile.phone} path="phone" tagName="span" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="mat-icon" style={{ fontSize: '14px' }}>location_on</span>
          <Editable text={profile.location} path="location" tagName="span" />
        </div>
      </div>
    </div>
  );

  // 2. Main Header (Large Name + Summary)
  const renderHeader = ({ accent, Editable }) => (
    <div style={{ marginBottom: '32px', borderBottom: `2px solid #f3f4f6`, paddingBottom: '20px' }}>
      <Editable 
        text={profile.name} 
        path="name"
        style={{ fontSize: styles.nameSize, fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', marginBottom: '8px' }} 
      />
      <Editable 
        text={profile.summary} 
        path="summary"
        style={{ fontSize: styles.standardTextSize, color: '#4b5563', lineHeight: 1.6 }} 
      />
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
      renderSidebarHeader={renderSidebarHeader}
      renderSectionTitle={({ title }) => (
        <div style={{ 
            fontSize: styles.bulletSize, 
            fontWeight: 800, 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em', 
            marginBottom: '12px',
            color: sidebarSections.some(s => title.includes(s)) ? '#fff' : accent
        }}>
          {title}
        </div>
      )}
      containerStyle={{
        fontFamily: ff,
        lineHeight: lineHt,
        background: '#fff',
        padding: 0,
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      }}
    />
  );
}
