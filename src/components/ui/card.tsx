import * as React from 'react';
import {cn} from '../../lib/utils';

// shadcn/ui-style container used for the order receipt.
// The existing .order-panel CSS remains the visual source of truth.
export const Card=React.forwardRef<HTMLDivElement,React.HTMLAttributes<HTMLDivElement>>(
  ({className,...props},ref)=><div ref={ref} className={cn('min-w-0',className)} {...props}/>
);
Card.displayName='Card';
