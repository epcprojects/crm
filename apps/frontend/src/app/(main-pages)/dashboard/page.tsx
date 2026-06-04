import React from 'react';
import StatusCard from '../../../components/dashboard/StatusCard';
import {
  AlertIcon,
  CheckMarkCircleIcon,
  ClockIcon,
  FolderIcon,
} from '../../../../public/icons';

const Page = () => {
  return (
    <div className="max-h-dvh min-h-[calc(100dvh-97px)]">
      <div className="grid grid-cols-4 gap-3 md:gap-5">
        <StatusCard
          icon={<FolderIcon fill="currentColor" />}
          title="Open"
          count={608}
        />
        <StatusCard
          icon={<ClockIcon fill="currentColor" />}
          title="In Progress"
          count={83}
        />
        <StatusCard
          icon={<CheckMarkCircleIcon fill="currentColor" />}
          title="Resolved"
          count={106}
        />
        <StatusCard
          icon={<AlertIcon fill="currentColor" />}
          title="Critical"
          count={28}
        />
      </div>
    </div>
  );
};

export default Page;
