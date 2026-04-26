import React from 'react';
import ResumeEngine from './ResumeEngine';
import { ProfilePhoto } from './PhotoUtils';
import { getScaleStyles } from '../../lib/resumeUtils';

export default function VisualBanner(props) {
  const { profile, scale, ff, lineHt, accentColor } = props;
  const styles = getScaleStyles(scale);
  const accent = accentColor || '#7c3aed';

  // 1. Full Width Banner Header
  const renderHeader = ({ accent, Editable }) => (
    <div style={{ background: accent, padding: '40px', borderRadius: '16px', color: '#fff', marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <ProfilePhoto 
            photo={profile.profile_photo_url} 
            name={profile.name} 
            size={80}
            bgColor="rgba(255,255,255,0.2)"
        />
        <div style={{ flex: 1 }}>
          <Editable 
            text={profile.name} 
            path="name"
            style={{ fontSize: styles.nameSize, fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }} 
          />
          <Editable 
            text={profile.title} 
            path="title"
            style={{ fontSize: styles.entrySubSize, fontWeight: 500, opacity: 0.9, marginTop: '4px', color: '#fff' }} 
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '20px', marginTop: '24px', fontSize: styles.smallTextSize, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="mat-icon" style={{ fontSize: styles.smallTextSize }}>email</span>
          <Editable text={profile.email} path="email" tagName="span" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="mat-icon" style={{ fontSize: '14px' }}>phone</span>
          <Editable text={profile.phone} path="phone" tagName="span" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="mat-icon" style={{ fontSize: '14px' }}>location_on</span>
          <Editable text={profile.location} path="location" tagName="span" />
        </div>
      </div>
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
            fontSize: '13px', 
            fontWeight: 800, 
            textTransform: 'uppercase', 
            letterSpacing: '0.12em', 
            marginBottom: '16px',
            marginTop: '12px',
            color: accentColor,
            borderBottom: `2px solid #e2e8f0`,
            paddingBottom: '8px'
        }}>
          {title}
        </div>
      )}
      containerStyle={{
        fontFamily: ff,
        lineHeight: lineHt,
        background: '#fff',
      }}
    />
  );
}
