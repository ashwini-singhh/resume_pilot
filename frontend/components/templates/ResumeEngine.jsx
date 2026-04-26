import React from 'react';
import { cleanBullet } from '../../lib/resumeUtils';
import ImpactScoreBadge from '../ImpactScoreBadge';

/**
 * ResumeEngine - Centralized logic for all resume templates.
 * Handles: Loop logic, visibility toggles, section ordering, and nested data parsing.
 */
export default function ResumeEngine({
  profile,
  sectionOrder,
  isLivePreview,
  onToggleVisibility,
  styles: templateStyles,
  accentColor: customAccent,
  spacing,
  onDirectEdit,
  renderHeader,
  renderSidebarHeader,
  renderSectionTitle,
  renderEntryHeader,
  renderEntrySub,
  renderBullet,
  renderNestedProjectHeader,
  containerStyle = {},
  layoutType = 'linear', // 'linear' | 'two-column'
  sidebarSections = [],   // Sections to show on left
}) {

  const accent = customAccent || 'var(--accent)';
  const styles = {
    ...templateStyles,
    sectionGap: spacing?.sectionGap || templateStyles.sectionGap,
    blockGap: spacing?.blockGap || templateStyles.blockGap,
  };

  const Editable = ({ text, path, style, className, tagName: Tag = 'div', onSave, ...props }) => {
    if (isLivePreview || !onDirectEdit) {
      return (
        <Tag 
          className={className} 
          style={style} 
          {...props} 
          dangerouslySetInnerHTML={{ __html: text || "" }} 
        />
      );
    }
    return (
      <Tag
        className={`${className} r-editable`}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const val = e.target.innerHTML;
          if (onSave) {
            onSave(val);
          } else {
            onDirectEdit(path, val);
          }
        }}
        style={{ ...style, cursor: 'text', outline: 'none' }}
        {...props}
        dangerouslySetInnerHTML={{ __html: text || "" }}
      />
    );
  };

  const DefaultBullet = ({ text, style, path }) => (
    <Editable
      text={cleanBullet(text)}
      path={path}
      tagName="div"
      className="r-bullet"
      style={{ fontSize: styles.bulletSize, ...style }}
    />
  );

  const DiagnosticInfo = ({ item }) => {
    if (!item) return null;
    const hasScore = item.impact_score !== undefined && item.impact_score !== null;
    const hasKeywords = (item.matched_keywords?.length > 0) || (item.missing_keywords?.length > 0);

    if (!hasScore && !hasKeywords) return null;

    return (
      <div className="r-diagnostics no-print" style={{ marginTop: '4px', marginBottom: '8px' }}>
        {hasScore && (
          <ImpactScoreBadge
            score={item.impact_score}
            loading={false}
            reasons={item.impact_reasons}
            compact={true}
            className="r-impact-badge"
          />
        )}
        {hasKeywords && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
            {item.matched_keywords?.map(kw => (
              <span key={kw} style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(34,197,94,0.1)', color: '#15803d', fontWeight: 600 }}>
                {kw}
              </span>
            ))}
            {item.missing_keywords?.map(kw => (
              <span key={kw} style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontWeight: 600, border: '1px solid rgba(239,68,68,0.1)' }}>
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const DefaultSectionTitle = ({ title }) => (
    <div className="r-section" style={{ 
      fontSize: styles.sectionSize, 
      fontWeight: 800, 
      marginBottom: `calc(${styles.blockGap || '12px'} * 0.8)`, 
      color: accent 
    }}>
      {title.toUpperCase()}
    </div>
  );

  const SectionTitle = renderSectionTitle || DefaultSectionTitle;

  // Helper to render sections
  const renderSections = (sectionsToRender, isSidebar = false) => {
    return sectionsToRender.map(secName => {
      // --- EXPERIENCE ---
      if (secName.includes('Experience') && (profile.experience || []).length > 0) {
        return (
          <div key="exp" style={{ marginBottom: styles.sectionGap || '32px' }}>
            <SectionTitle title="Experience" />
            {profile.experience.map((e, idx) => {
              const eid = `exp_${idx}`;
              const isHidden = (profile.hidden_entries || []).includes(eid) || e.hidden;
              if (isLivePreview && isHidden) return null;

              return (
                <div key={idx} style={{ marginBottom: styles.blockGap || '16px', position: 'relative', opacity: isHidden ? 0.3 : 1 }}>
                  {!isLivePreview && onToggleVisibility && (
                    <button
                      className="hide-entry-btn"
                      onClick={() => onToggleVisibility(eid)}
                      style={{ position: 'absolute', left: '-30px', top: '0', background: 'none', border: 'none', cursor: 'pointer', color: accent }}
                    >
                      <span className="mat-icon" style={{ fontSize: '18px' }}>{isHidden ? 'visibility' : 'visibility_off'}</span>
                    </button>
                  )}

                  {renderEntryHeader ? renderEntryHeader({ title: e.company, subtitle: e.period, styles, accent }) : (
                    <div className="r-entry-header" style={{ fontSize: styles.entryHeaderSize, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <Editable text={e.company} path={`experience.${idx}.company`} tagName="span" />
                      <Editable text={e.period} path={`experience.${idx}.period`} tagName="span" />
                    </div>
                  )}

                  {renderEntrySub ? renderEntrySub({ text: e.title, styles, accent }) : (
                    <Editable
                      text={e.title}
                      path={`experience.${idx}.title`}
                      tagName="div"
                      className="r-entry-sub"
                      style={{ fontSize: styles.entrySubSize, fontWeight: 600, color: 'var(--muted-foreground)' }}
                    />
                  )}

                  {!isHidden && e.bullets?.map((b, bIdx) => (
                    <DefaultBullet key={bIdx} text={b} path={`experience.${idx}.bullets.${bIdx}`} style={{ marginTop: '4px' }} />
                  ))}

                  {!isHidden && (e.projects || []).map((proj, pIdx) => {
                    const pid = `${eid}_proj_${pIdx}`;
                    const isHiddenProj = (profile.hidden_entries || []).includes(pid) || proj.hidden;
                    if (isLivePreview && isHiddenProj) return null;

                    return (
                      <div key={pIdx} style={{ marginTop: '8px', opacity: isHiddenProj ? 0.3 : 1, position: 'relative' }}>
                        {!isLivePreview && onToggleVisibility && (
                          <button
                            className="hide-entry-btn"
                            onClick={() => onToggleVisibility(pid)}
                            style={{ position: 'absolute', left: '-25px', top: '0', background: 'none', border: 'none', cursor: 'pointer', color: accent, opacity: 0.6 }}
                          >
                            <span className="mat-icon" style={{ fontSize: '14px' }}>{isHiddenProj ? 'visibility' : 'visibility_off'}</span>
                          </button>
                        )}
                        <Editable
                          text={proj.name}
                          path={`experience.${idx}.projects.${pIdx}.name`}
                          tagName="div"
                          style={{ fontSize: styles.entrySubSize, fontWeight: 600, fontStyle: 'italic' }}
                        />
                        {!isHiddenProj && proj.bullets?.map((pb, pbIdx) => (
                          <DefaultBullet key={pbIdx} text={pb} path={`experience.${idx}.projects.${pIdx}.bullets.${pbIdx}`} style={{ marginLeft: '12px', opacity: 0.8 }} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      }

      // --- EDUCATION ---
      if (secName.includes('Education') && (profile.education || []).length > 0) {
        return (
          <div key="edu" style={{ marginBottom: styles.sectionGap || '32px' }}>
            <SectionTitle title="Education" />
            {profile.education.map((e, idx) => {
              const eid = `edu_${idx}`;
              const isHidden = (profile.hidden_entries || []).includes(eid) || e.hidden;
              if (isLivePreview && isHidden) return null;

              return (
                <div key={idx} style={{ marginBottom: styles.blockGap || '12px', position: 'relative', opacity: isHidden ? 0.3 : 1 }}>
                  {!isLivePreview && onToggleVisibility && (
                    <button
                      className="hide-entry-btn"
                      onClick={() => onToggleVisibility(eid)}
                      style={{ position: 'absolute', left: '-30px', top: '0', background: 'none', border: 'none', cursor: 'pointer', color: accent }}
                    >
                      <span className="mat-icon" style={{ fontSize: '18px' }}>{isHidden ? 'visibility' : 'visibility_off'}</span>
                    </button>
                  )}
                  <Editable text={e.school} path={`education.${idx}.school`} tagName="div" style={{ fontWeight: 700, fontSize: styles.entryHeaderSize }} />
                  <div style={{ fontSize: styles.entrySubSize, color: 'var(--muted-foreground)' }}>
                    <Editable text={e.degree} path={`education.${idx}.degree`} tagName="span" /> | <Editable text={e.period} path={`education.${idx}.period`} tagName="span" />
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      // --- PROJECTS ---
      if (secName.includes('Projects') && (profile.projects || []).length > 0) {
        return (
          <div key="proj" style={{ marginBottom: styles.sectionGap || '32px' }}>
            <SectionTitle title="Projects" />
            {profile.projects.map((p, idx) => {
              const eid = `proj_${idx}`;
              const isHidden = (profile.hidden_entries || []).includes(eid) || p.hidden;
              if (isLivePreview && isHidden) return null;

              return (
                <div key={idx} style={{ marginBottom: styles.blockGap || '12px', position: 'relative', opacity: isHidden ? 0.3 : 1 }}>
                  {!isLivePreview && onToggleVisibility && (
                    <button
                      className="hide-entry-btn"
                      onClick={() => onToggleVisibility(eid)}
                      style={{ position: 'absolute', left: '-30px', top: '0', background: 'none', border: 'none', cursor: 'pointer', color: accent }}
                    >
                      <span className="mat-icon" style={{ fontSize: '18px' }}>{isHidden ? 'visibility' : 'visibility_off'}</span>
                    </button>
                  )}
                  <Editable text={p.name} path={`projects.${idx}.name`} tagName="div" style={{ fontWeight: 700, fontSize: styles.entryHeaderSize }} />
                  {p.bullets?.map((b, bIdx) => <DefaultBullet key={bIdx} text={b} path={`projects.${idx}.bullets.${bIdx}`} />)}
                </div>
              );
            })}
          </div>
        );
      }

      // --- SKILLS ---
      if (secName.includes('Skills') && Object.keys(profile.skills || {}).length > 0) {
        return (
          <div key="sk" style={{ marginBottom: styles.sectionGap || '32px' }}>
            <SectionTitle title="Skills" />
            <div style={styles.skillsContainerStyle || {}}>
              {Object.entries(profile.skills).map(([cat, tags], idx) => (
                <div key={idx} style={{ fontSize: styles.bulletSize, marginBottom: '8px' }}>
                  <strong style={{ fontSize: styles.bulletSize, display: 'block', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat}</strong>
                  <Editable text={tags.join(", ")} path={`skills.${cat}`} tagName="div" style={{ marginTop: '2px' }} onSave={(val) => onDirectEdit(`skills.${cat}`, val.split(',').map(s => s.trim()))} />
                </div>
              ))}
            </div>
          </div>
        );
      }

      // --- ACHIEVEMENTS ---
      if (secName.includes('Achievements') && (profile.achievements || []).length > 0) {
        return (
          <div key="achive" style={{ marginBottom: styles.sectionGap || '32px' }}>
            <SectionTitle title="Achievements" />
            {profile.achievements.map((a, idx) => {
              const eid = `achieve_${idx}`;
              const isHidden = (profile.hidden_entries || []).includes(eid) || a.hidden;
              if (isLivePreview && isHidden) return null;

              return (
                <div key={idx} style={{ position: 'relative', opacity: isHidden ? 0.3 : 1, marginBottom: '6px' }}>
                  {!isLivePreview && onToggleVisibility && (
                    <button
                      className="hide-entry-btn"
                      onClick={() => onToggleVisibility(eid)}
                      style={{ position: 'absolute', left: '-30px', top: '0', background: 'none', border: 'none', cursor: 'pointer', color: accent }}
                    >
                      <span className="mat-icon" style={{ fontSize: '16px' }}>{isHidden ? 'visibility' : 'visibility_off'}</span>
                    </button>
                  )}
                  <DefaultBullet text={a} path={`achievements.${idx}`} />
                </div>
              );
            })}
          </div>
        );
      }
      return null;
    });
  };

  const mainSections = sectionOrder.filter(s => !sidebarSections.includes(s));

  return (
    <div className="resume-doc animate-in" style={{
      ...containerStyle,
      display: 'flex',
      flexDirection: 'column',
      padding: spacing?.padding || '32px 40px'
    }}>

      {layoutType === 'linear' ? (
        <>
          {renderHeader && renderHeader({ profile, styles, accent, Editable })}
          {renderSections(sectionOrder)}
        </>
      ) : (
        <div style={{ display: 'flex', width: '100%', gap: '40px', flex: 1 }}>
          {/* Left Column (30%) */}
          <div style={{ width: '30%', borderRight: styles.sidebarBorder || 'none', paddingRight: '20px' }}>
            {renderSidebarHeader && renderSidebarHeader({ profile, styles, accent, Editable })}
            {renderSections(sidebarSections, true)}
          </div>

          {/* Right Column (70%) */}
          <div style={{ width: '70%', flex: 1 }}>
            {renderHeader && renderHeader({ profile, styles, accent, Editable })}
            {renderSections(mainSections)}
          </div>
        </div>
      )}
    </div>
  );
}
