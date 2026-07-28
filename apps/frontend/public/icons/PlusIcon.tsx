import React from 'react';

const PlusIcon = ({ fill = "url(#paint0_linear_690_18029)", width = '16', height = '16' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.6252 3.33334C10.6252 2.98817 10.3453 2.70834 10.0002 2.70834C9.65499 2.70834 9.37516 2.98817 9.37516 3.33334V9.37501H3.3335C2.98832 9.37501 2.7085 9.65483 2.7085 10C2.7085 10.3452 2.98832 10.625 3.3335 10.625H9.37516V16.6667C9.37516 17.0119 9.65499 17.2917 10.0002 17.2917C10.3453 17.2917 10.6252 17.0119 10.6252 16.6667V10.625H16.6668C17.012 10.625 17.2918 10.3452 17.2918 10C17.2918 9.65483 17.012 9.37501 16.6668 9.37501H10.6252V3.33334Z"
        fill={fill}
      />
      <defs>
        <linearGradient
          id="paint0_linear_690_18029"
          x1="5.0545"
          y1="13.9432"
          x2="15.2481"
          y2="4.47542"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#304FFD" />
          <stop offset="1" stopColor="#40C3FF" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default PlusIcon;
