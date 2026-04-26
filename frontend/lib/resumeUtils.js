import React from 'react';

/**
 * Strips leading bullet characters copied verbatim from PDF.
 */
export const cleanBullet = (item) => {
  if (typeof item === 'string') {
    return item.replace(/^[\s•\-\*›·◦▪▸→]+/, '').trim();
  }
  return item; // Support React nodes like <WordDiff />
};

/**
 * Shared styling configuration for scale and fonts.
 */
export const getScaleStyles = (scale) => ({
  nameSize: `${32 * scale}px`,
  contactSize: `${12 * scale}px`,
  sectionSize: `${14 * scale}px`,
  entryHeaderSize: `${14 * scale}px`,
  entrySubSize: `${13 * scale}px`,
  bulletSize: `${12 * scale}px`,
  standardTextSize: `${13 * scale}px`,
});
