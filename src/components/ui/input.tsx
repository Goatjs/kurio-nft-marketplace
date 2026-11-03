import * as React from 'react';
import {cn} from '../../lib/utils';

// Reusable shadcn/ui-style input. Existing .field input CSS maintains Kurio's
// geometry/colors; Tailwind covers structural and interactive states.
export const Input=React.forwardRef<HTMLInputElement,React.InputHTMLAttributes<HTMLInputElement>>(
  ({className,type,...props},ref)=><input
    ref={ref}
    type={type}
    className={cn('block w-full min-w-0 rounded-[3px] border border-[var(--border)] bg-transparent px-3 py-2 text-[#f4e6dd] placeholder:text-[#a68560] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--warm2)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50',className)}
    {...props}
  />
);
Input.displayName='Input';
