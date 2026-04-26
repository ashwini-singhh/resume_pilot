import React from 'react';
import ResumeEngine from './ResumeEngine';
import { getScaleStyles } from '../../lib/resumeUtils';

export default function ATSTemplate(props) {
  const { profile, scale } = props;
  const styles = getScaleStyles(scale);

  const renderHeader = () => (
    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
      <div style={{ fontSize: styles.nameSize, fontWeight: 'bold' }}>{profile.name?.toUpperCase() || 'JOHN DOE'}</div>
      <div style={{ fontSize: styles.contactSize, marginTop: '4px' }}>
        {profile.email} | {profile.phone} | {profile.location}
      </div>
    </div>
  );

  const renderSectionTitle = ({ title }) => (
    <div style={{ fontSize: styles.sectionSize, fontWeight: 'bold', borderBottom: '1px solid #000', marginBottom: '8px', marginTop: '15px', textTransform: 'uppercase' }}>
      {title}
    </div>
  );

  const renderBullet = ({ text, style }) => (
    <div style={{ fontSize: styles.bulletSize, marginLeft: '20px', display: 'list-item', listStyleType: 'disc', ...style }}>
      {text}
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
        fontFamily: 'Arial, sans-serif',
        lineHeight: 1.2,
        padding: '40px'
      }}
    />
  );
}
