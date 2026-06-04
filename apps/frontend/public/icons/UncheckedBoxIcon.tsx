import React from 'react';

const UncheckedBoxIcon = ({ fill = '#E5E7EB' }) => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0.45"
        y="0.45"
        width="17.1"
        height="17.1"
        rx="3.55"
        fill="white"
      />
      <rect
        x="0.45"
        y="0.45"
        width="17.1"
        height="17.1"
        rx="3.55"
        stroke={fill}
        strokeWidth="0.9"
      />
    </svg>
  );
};

export default UncheckedBoxIcon;
