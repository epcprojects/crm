'use client';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-[#F0E8FF] p-4">{children}</div>;
}
