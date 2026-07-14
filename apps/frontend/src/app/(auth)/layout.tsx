'use client';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return  <div className="h-dvh overflow-hidden bg-gray-200 p-4">{children}</div>;
}
