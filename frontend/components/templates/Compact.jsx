import React from 'react';
import ResumeEngine from './ResumeEngine';
import { getScaleStyles } from '../../lib/resumeUtils';

export default function CompactTemplate(props) {
  const { profile, scale, ff, lineHt } = props;
  const styles = getScaleStyles(scale * 0.95);

  const renderHeader = ({ styles }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #333', paddingBottom: '8px', marginBottom: '16px' }}>
      <div>
        <div style={{ fontSize: styles.nameSize, fontWeight: 900, lineHeight: 1 }}>{profile.name?.toUpperCase() || 'JOHN DOE'}</div>
      </div>
      <div style={{ textAlign: 'right', fontSize: styles.contactSize }}>
        <div>{profile.email}</div>
        <div>{profile.phone} | {profile.location}</div>
      </div>
    </div>
  );

  const renderSectionTitle = ({ title }) => (
    <div style={{ fontSize: styles.sectionSize, fontWeight: 900, background: '#eee', padding: '2px 8px', marginBottom: '8px', marginTop: '12px' }}>
      {title.toUpperCase()}
    </div>
  );

  const renderBullet = ({ text, style }) => (
    <div style={{ fontSize: styles.bulletSize, marginLeft: '12px', display: 'flex', gap: '4px', ...style }}>
      <span>•</span>
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
        lineHeight: lineHt * 0.9,
        padding: '20px 30px'
      }}
    />
  );
}
