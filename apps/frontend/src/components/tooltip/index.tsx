'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import React from 'react';

interface TooltipProps {
  content: string;
  heading: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  className?: string;
  hide?: boolean;
}

export default function Tooltip({
  content,
  heading,
  children,
  side = 'top',
  sideOffset = 8,
  className = '',
  hide = false,
}: TooltipProps) {
  return (
    <RadixTooltip.Provider>
      <RadixTooltip.Root delayDuration={0}>
        <RadixTooltip.Trigger asChild>
          <span>{children}</span>
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            hidden={hide}
            sideOffset={sideOffset}
            className={`px-3 py-2 text-xs font-semibold max-w-[320px] text-border-primary bg-black rounded-lg shadow-lg z-50 select-none ${className} relative z-500`}
          >
            <h2 className="text-white"> {heading}</h2>
            {content}
            <RadixTooltip.Arrow className="fill-black" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
