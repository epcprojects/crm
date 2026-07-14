import type { ReactNode } from 'react';
import { DashboardShell } from '../../components/dashboard/dashboard-shell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell>
     <div className="h-full min-h-0 overflow-hidden">{children}</div>
    </DashboardShell>
  );
}
