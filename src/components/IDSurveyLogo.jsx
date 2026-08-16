import React from 'react';

export const IDSurveyLogo = ({ height = 40, size, className = '', style = {} }) => {
  const actualHeight = size || height;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 350 76"
      height={actualHeight}
      className={className}
      style={{
        display: 'inline-block',
        flexShrink: 0,
        height: `${actualHeight}px`,
        width: 'auto',
        verticalAlign: 'middle',
        ...style,
      }}
      aria-label="IDSurvey - Testing • Inspection • Certification"
    >
      {/* Emblem */}
      <g id="ids-emblem">
        {/* Navy Blue Circle Background */}
        <circle cx="38" cy="38" r="33" fill="#143d75" />
        
        {/* Vivid Teal Checkmark */}
        <path
          d="M 12,38 L 32,58 L 66,20"
          fill="none"
          stroke="#00b4a7"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Wordmark Text */}
      {/* "ID" in Teal */}
      <text
        x="82"
        y="47"
        style={{
          fontFamily: "'Plus Jakarta Sans', 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
          fontSize: '42px',
          fontWeight: 800,
          fill: '#00b4a7',
          letterSpacing: '-1px',
        }}
      >
        ID
      </text>

      {/* "Survey" in Navy */}
      <text
        x="132"
        y="47"
        style={{
          fontFamily: "'Plus Jakarta Sans', 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
          fontSize: '42px',
          fontWeight: 800,
          fill: '#143d75',
          letterSpacing: '-1px',
        }}
      >
        Survey
      </text>

      {/* Subtitle Tagline */}
      <text
        x="83"
        y="66"
        style={{
          fontFamily: "'Plus Jakarta Sans', 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
          fontSize: '11px',
          fontWeight: 600,
          fill: '#00b4a7',
          letterSpacing: '0.6px',
        }}
      >
        Testing · Inspection · Certification
      </text>
    </svg>
  );
};
