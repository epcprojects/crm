'use client';

import type { ReactNode } from 'react';
import AppModal from './AppModal';
import { useIsMobile } from '../hooks/useIsMobile';

type TicketDescriptionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  descriptionHtml: string;
  repliesPanel?: ReactNode;
  headerAction?: ReactNode;
  headerUser?: ReactNode;
  Username?: string;
};

export default function TicketDescriptionModal({
  isOpen,
  onClose,
  title,
  descriptionHtml,
  repliesPanel,
   headerAction,
    headerUser,
    Username
}: TicketDescriptionModalProps) {
    const isMobile = useIsMobile();
  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={Username}
       icon={headerUser}
      size="extraLarge"
      showFooter={false}
      scrollNeeded={false}
      headerAction={isMobile?"":headerAction}
      fullScreen ={isMobile?false:true}
      bodyPaddingClasses="min-h-0 flex flex-1 overflow-hidden p-0! "
    >
      <div className="grid flex-1 min-h-0 grid-cols-1 bg-white xl:grid-cols-2">
        {repliesPanel ? (
          <div className="hidden min-h-0 overflow-hidden xl:block">
            {repliesPanel}
          </div>
        ) : null}
        <div className="min-h-0 overflow-y-auto  p-4 scrollbar-thin  xl:p-5">
          <h2 className="text-xl font-semibold text-gray-900">
            {title}
          </h2>

          <div
            className="rich-text-content mt-2 text-sm text-gray-700"
            dangerouslySetInnerHTML={{
              __html: descriptionHtml,
            }}
          />
        </div>
        
      </div>
    </AppModal>
  );
}