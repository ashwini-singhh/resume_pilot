import React from 'react';
import ResumeEngine from './ResumeEngine';
import { getScaleStyles } from '../../lib/resumeUtils';

export default function MinimalTemplate(props) {
  const { profile, scale, ff, lineHt } = props;
  const styles = getScaleStyles(scale);

  const renderHeader = ({ styles }) => (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ fontSize: styles.nameSize, fontWeight: 300, letterSpacing: '0.1em' }}>{profile.name?.toUpperCase() || 'JOHN DOE'}</div>
      <div style={{ fontSize: styles.contactSize, opacity: 0.6, marginTop: '8px' }}>
        {profile.email} <span> / </span> {profile.phone} <span> / </span> {profile.location}
      </div>
    </div>
  );

  const renderSectionTitle = ({ title }) => (
    <div style={{ fontSize: styles.sectionSize, fontWeight: 700, opacity: 0.4, marginBottom: '16px', letterSpacing: '0.1em', marginTop: '24px' }}>
      {title.toUpperCase()}
    </div>
  );

  const renderBullet = ({ text, style }) => (
    <div style={{ fontSize: styles.bulletSize, marginBottom: '2px', display: 'flex', gap: '8px', ...style }}>
      <span style={{ opacity: 0.3 }}>•</span>
      <span>{text}</span>
    </div>
  );

  return (
    <ResumeEngine 
      {...props}
      styles={styles}
      renderHeader={renderHeader}
      renderSectionTitle={renderSectionTitle}
      renderBullet={renderBullet}
      containerStyle={{
        fontFamily: ff,
        lineHeight: lineHt,
        padding: '20px 40px'
      }}
    />
  );
}
