import React from 'react';

export const IDSurveyLogo = ({ height = 38, className = '', style = {} }) => {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        flexShrink: 0,
        height,
        ...style,
      }}
    >
      {/* IDSurvey Shield & Check Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        height={height}
        width={height}
        style={{ flexShrink: 0 }}
      >
        {/* Shield background in dark blue */}
        <path
          d="M 50,5 L 88,20 C 88,60 70,88 50,98 C 30,88 12,60 12,20 Z"
          fill="#004b87"
        />
        {/* Light blue ribbon / check mark */}
        <path
          d="M 30,48 L 44,64 L 75,30 L 65,22 L 44,48 L 38,40 Z"
          fill="#00a3e0"
        />
        {/* Inner shadow/stroke details */}
        <path
          d="M 50,11 L 82,24 C 82,58 66,82 50,90 C 34,82 18,58 18,24 Z"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
          opacity="0.3"
        />
      </svg>

      {/* IDSurvey Text Block */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'left', lineHeight: 1.15 }}>
        <div style={{ fontSize: `${height * 0.44}px`, fontFamily: "Arial, 'Helvetica Neue', sans-serif", fontWeight: 800, letterSpacing: '-0.02em', color: '#004b87' }}>
          ID<span style={{ color: '#00a3e0', fontWeight: 700 }}>Survey</span>
        </div>
        <div style={{ fontSize: `${height * 0.16}px`, fontFamily: "Arial, 'Helvetica Neue', sans-serif", fontWeight: 600, color: '#475569', letterSpacing: '0.01em', marginTop: '1px' }}>
          Testing • Inspection • Certification
        </div>
      </div>
    </div>
  );
};
