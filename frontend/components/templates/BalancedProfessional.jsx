import React from 'react';
import ResumeEngine from './ResumeEngine';
import { getScaleStyles } from '../../lib/resumeUtils';

export default function BalancedProfessional(props) {
  const { profile, scale, ff, lineHt } = props;
  const styles = getScaleStyles(scale);

  // Custom Main Header
  const renderHeader = ({ accent, Editable }) => (
    <div style={{ marginBottom: '32px' }}>
      <Editable 
        text={profile.name} 
        path="name"
        style={{ fontSize: styles.nameSize, fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', marginBottom: '4px' }} 
      />
      <Editable 
        text={profile.summary} 
        path="summary"
        style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }} 
      />
    </div>
  );

  // Custom Sidebar Header
  const renderSidebarHeader = ({ accent, Editable }) => (
    <div style={{ marginBottom: '24px' }}>
       <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: accent, letterSpacing: '0.1em', marginBottom: '12px' }}>Contact</div>
       <div style={{ fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#374151' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
           <span className="mat-icon" style={{ fontSize: '14px', color: accent }}>email</span>
           <Editable text={profile.email} path="email" tagName="span" />
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
           <span className="mat-icon" style={{ fontSize: '14px', color: accent }}>phone</span>
           <Editable text={profile.phone} path="phone" tagName="span" />
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
           <span className="mat-icon" style={{ fontSize: '14px', color: accent }}>location_on</span>
           <Editable text={profile.location} path="location" tagName="span" />
         </div>
       </div>
    </div>
  );

  const sidebarSections = ['Skills', 'Links', 'Languages'];

  return (
    <ResumeEngine 
      {...props}
      layoutType="two-column"
      sidebarSections={sidebarSections}
      styles={{
        ...styles,
        sectionGap: '20px',
        sidebarBorder: '1px solid #e5e7eb',
      }}
      renderHeader={renderHeader}
      renderSidebarHeader={renderSidebarHeader}
      containerStyle={{
        fontFamily: ff,
        lineHeight: lineHt,
        background: '#fff',
        color: '#111827',
      }}
    />
  );
}
