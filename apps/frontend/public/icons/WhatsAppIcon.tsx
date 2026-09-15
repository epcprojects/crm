import React from 'react';

const WhatsAppIcon = ({ width = '18', height = '18' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      <rect x="6" y="6.5" width="12" height="9" rx="4" fill="white" />
      <polygon points="8,15 8,18 11,15" fill="white" />
    </svg>
  );
};

export default WhatsAppIcon;
