import React from 'react';
import ResumeEngine from './ResumeEngine';
import { getScaleStyles } from '../../lib/resumeUtils';

// Shared photo/initials component used across visual templates
export function ProfilePhoto({ photo, name, size = 80, textColor = '#fff', bgColor = 'rgba(255,255,255,0.2)' }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover',
          border: '3px solid rgba(255,255,255,0.5)',
          display: 'block'
        }}
      />
    );
  }
  // Fallback: initials
  const initials = (name || 'JD').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bgColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, color: textColor,
      letterSpacing: '-0.02em', flexShrink: 0,
      border: '2px solid rgba(255,255,255,0.3)'
    }}>
      {initials}
    </div>
  );
}
