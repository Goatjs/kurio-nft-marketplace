import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva,type VariantProps} from 'class-variance-authority';
import {cn} from '../../lib/utils';

// shadcn/ui pattern (CVA + Slot), styled with real Tailwind utilities.
// Keep .btn and .secondary for the existing Kurio/Figma visual identity.
const buttonVariants=cva(
  'btn inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-extrabold transition-[filter,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--warm2)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-50',
  {variants:{variant:{default:'',secondary:'secondary'}},defaultVariants:{variant:'default'}}
);
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,VariantProps<typeof buttonVariants>{asChild?:boolean}
export const Button=React.forwardRef<HTMLButtonElement,ButtonProps>(({className,variant,asChild=false,...props},ref)=>{
  const Comp=asChild?Slot:'button';
  return <Comp ref={ref} className={cn(buttonVariants({variant,className}))} {...props}/>;
});
Button.displayName='Button';
