import React from 'react';
import ResumeEngine from './ResumeEngine';
import { getScaleStyles } from '../../lib/resumeUtils';

export default function ModernTemplate(props) {
  const { profile, scale, ff, lineHt } = props;
  const styles = getScaleStyles(scale);

  // Custom Header
  const renderHeader = ({ styles }) => (
    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
      <div style={{ fontSize: styles.nameSize, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--accent)' }}>
        {profile.name?.toUpperCase() || 'JOHN DOE'}
      </div>
      <div style={{ height: '4px', width: '40px', background: 'var(--accent)', margin: '8px auto' }} />
      <div style={{ fontSize: styles.contactSize, color: 'var(--muted-foreground)' }}>
        {profile.email} · {profile.phone} · {profile.location}
      </div>
    </div>
  );

  // Custom Section Title with Divider
  const renderSectionTitle = ({ title }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 12px 0' }}>
      <div style={{ fontSize: styles.sectionSize, fontWeight: 800, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </div>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
    </div>
  );

  // Custom skills layout (Grid)
  const skillsContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px'
  };

  return (
    <ResumeEngine 
      {...props}
      styles={{ ...styles, skillsContainerStyle }}
      renderHeader={renderHeader}
      renderSectionTitle={renderSectionTitle}
      containerStyle={{
        fontFamily: ff,
        lineHeight: lineHt,
      }}
    />
  );
}
