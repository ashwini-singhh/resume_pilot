import { diffWords } from 'diff';
import React from 'react';

export default function DiffText({ original, suggested }) {
  if (!original || !suggested) return <span>{original || suggested}</span>;
  
  const differences = diffWords(original, suggested);

  return (
    <div className="diff-container animate-in">
      {differences.map((part, index) => {
        if (part.added) {
          return (
            <span key={index} className="diff-add">
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span key={index} className="diff-remove">
              {part.value}
            </span>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </div>
  );
}
