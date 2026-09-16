const NotesTabIcon = ({
  width = '20',
  height = '20',
  fill = 'currentColor',
}: {
  width?: string;
  height?: string;
  fill?: string;
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.83337 2.5H10.3418C11.3059 2.5 11.788 2.5 12.2289 2.68062C12.6698 2.86124 13.0107 3.20212 13.6924 3.88388L15.9495 6.14098C16.6312 6.82274 16.9722 7.16362 17.1528 7.60451C17.3334 8.04541 17.3334 8.52747 17.3334 9.49159V12.5C17.3334 14.8577 17.3334 16.0366 16.6016 16.7684C15.8698 17.5 14.6909 17.5 12.3334 17.5H7.66671C5.30922 17.5 4.13043 17.5 3.39857 16.7684C2.66671 16.0366 2.66671 14.8577 2.66671 12.5V7.5C2.66671 5.14231 2.66671 3.96347 3.39857 3.23161C4.13043 2.5 5.30922 2.5 7.66671 2.5"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6667 2.91666V5.83332C10.6667 6.61972 10.6667 7.01297 10.9111 7.2574C11.1554 7.50182 11.5487 7.50182 12.3351 7.50182H15.2517"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.66671 10H13.3334M6.66671 13.3333H10.8334"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default NotesTabIcon;
