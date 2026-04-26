// [RESUME_SAILOR_SYNC] 2026-04-26 11:32
import React from 'react';
import { cleanBullet } from '../../lib/resumeUtils';

export default function Standard({ 
  profile, 
  sectionOrder, 
  scale, 
  lineHt, 
  ff, 
  accentColor, 
  spacing, 
  onToggleVisibility, 
  onDirectEdit 
}) {
  const { 
    name, email, phone, location, linkedin, github, portfolio,
    experience = [], 
    projects = [], 
    education = [], 
    skills = {}, 
    achievements = [] 
  } = profile;

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '24px',
  };

  const nameStyle = {
    fontSize: `${28 * scale}px`,
    fontWeight: 800,
    margin: 0,
    color: '#000',
    fontFamily: ff
  };

  const contactStyle = {
    fontSize: `${11 * scale}px`,
    color: '#333',
    marginTop: '8px',
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  };

  const sectionHeaderStyle = {
    fontSize: `${13 * scale}px`,
    fontWeight: 700,
    textTransform: 'uppercase',
    borderBottom: '1px solid #000',
    paddingBottom: '2px',
    marginTop: spacing.sectionGap,
    marginBottom: '10px',
    color: '#000',
    fontFamily: ff
  };

  const entryHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    fontSize: `${12 * scale}px`,
    fontWeight: 700,
    color: '#000',
    fontFamily: ff
  };

  const subHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    fontSize: `${11 * scale}px`,
    fontStyle: 'italic',
    color: '#333',
    marginTop: '2px'
  };

  const projectTitleStyle = {
    fontSize: `${11 * scale}px`,
    fontWeight: 700,
    fontStyle: 'italic',
    color: '#000',
    marginTop: '4px',
    marginBottom: '4px'
  };

  const bulletStyle = {
    fontSize: `${11 * scale}px`,
    lineHeight: lineHt,
    color: '#333',
    margin: '4px 0',
    paddingLeft: '16px',
    position: 'relative'
  };

  const renderSection = (title) => {
    switch (title) {
      case 'Work Experience':
        if (experience.length === 0) return null;
        return (
          <div key={title}>
            <div style={sectionHeaderStyle}>Experience</div>
            {experience.map((exp, idx) => (
              <div key={idx} style={{ marginBottom: spacing.blockGap }}>
                <div style={entryHeaderStyle}>
                  <span>{exp.title}</span>
                  <span>{exp.period}</span>
                </div>
                <div style={subHeaderStyle}>
                  <span>{exp.company}</span>
                  <span>{exp.location || ''}</span>
                </div>
                {exp.projects?.map((proj, pIdx) => (
                  <div key={pIdx} style={{ marginTop: '6px' }}>
                    <div style={projectTitleStyle}>{proj.name}</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {proj.bullets?.map((b, bIdx) => (
                        <li key={bIdx} style={bulletStyle}>
                          <span style={{ position: 'absolute', left: 0 }}>•</span>
                          {cleanBullet(b)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {!exp.projects?.length && exp.bullets?.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0 0' }}>
                    {exp.bullets.map((b, bIdx) => (
                      <li key={bIdx} style={bulletStyle}>
                        <span style={{ position: 'absolute', left: 0 }}>•</span>
                        {cleanBullet(b)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        );

      case 'Projects':
        if (projects.length === 0) return null;
        return (
          <div key={title}>
            <div style={sectionHeaderStyle}>Projects</div>
            {projects.map((proj, idx) => (
              <div key={idx} style={{ marginBottom: spacing.blockGap }}>
                <div style={entryHeaderStyle}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                    <span>{proj.name}</span>
                    {proj.live_link && (
                      <a href={proj.live_link} target="_blank" rel="noreferrer" style={{ fontSize: `${9 * scale}px`, fontWeight: 400, color: accentColor, textDecoration: 'none' }}>
                         [Link]
                      </a>
                    )}
                  </div>
                  <span>{proj.period || ''}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 0' }}>
                  {proj.bullets?.map((b, bIdx) => (
                    <li key={bIdx} style={bulletStyle}>
                      <span style={{ position: 'absolute', left: 0 }}>•</span>
                      {cleanBullet(b)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );

      case 'Education':
        if (education.length === 0) return null;
        return (
          <div key={title}>
            <div style={sectionHeaderStyle}>Education</div>
            {education.map((edu, idx) => (
              <div key={idx} style={{ marginBottom: spacing.blockGap }}>
                <div style={entryHeaderStyle}>
                  <span>{edu.school}</span>
                  <span>{edu.period}</span>
                </div>
                <div style={subHeaderStyle}>
                  <span>{edu.degree}</span>
                  <span>{edu.location || ''}</span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'Skills':
        if (!skills || Object.keys(skills).length === 0) return null;
        return (
          <div key={title}>
            <div style={sectionHeaderStyle}>Skills</div>
            <div style={{ fontSize: `${11 * scale}px`, lineHeight: 1.4 }}>
              {Object.entries(skills).map(([cat, tags], idx) => (
                <div key={cat} style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#000' }}>{cat}:</strong> {tags.join(', ')}
                </div>
              ))}
            </div>
          </div>
        );

      case 'Achievements':
        if (achievements.length === 0) return null;
        return (
          <div key={title}>
            <div style={sectionHeaderStyle}>Achievements</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {achievements.map((ach, idx) => (
                <li key={idx} style={bulletStyle}>
                  <span style={{ position: 'absolute', left: 0 }}>•</span>
                  {cleanBullet(ach)}
                </li>
              ))}
            </ul>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ 
      background: '#fff', 
      padding: spacing.padding, 
      minHeight: '100%', 
      boxSizing: 'border-box',
      fontFamily: ff
    }}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={nameStyle}>{name || 'Your Name'}</h1>
        <div style={contactStyle}>
          {email && <a href={`mailto:${email}`} style={{ color: 'inherit', textDecoration: 'underline' }}>{email}</a>}
          {phone && <span>| {phone}</span>}
          {linkedin && (
            <>
              <span>|</span>
              <a href={linkedin} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>LinkedIn</a>
            </>
          )}
          {github && (
            <>
              <span>|</span>
              <a href={github} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>GitHub</a>
            </>
          )}
          {portfolio && (
            <>
              <span>|</span>
              <a href={portfolio} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Portfolio</a>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Sections */}
      {sectionOrder.map(sec => renderSection(sec))}
    </div>
  );
}
