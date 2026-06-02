import React from 'react';

const ToggleIcon = ({ width = '16', height = '16' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.8">
        <rect
          x="2.00004"
          y="3.33333"
          width="12"
          height="9.33333"
          rx="2"
          stroke="#6B7280"
          strokeWidth="1.33333"
        />
        <path
          d="M6.66663 4V12"
          stroke="#6B7280"
          strokeWidth="1.33333"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export default ToggleIcon;
