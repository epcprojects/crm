import type { ReactNode } from 'react';
import { DashboardShell } from '../../components/dashboard/dashboard-shell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell>
      <div className="mt-18 sm:mt-0 ">{children}</div>
    </DashboardShell>
  );
}
