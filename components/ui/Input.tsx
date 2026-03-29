import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-body text-text-primary my-2 uppercase font-bold text-sm"
          >
            {label}
          </label>
        )}
        <div className="input-underline w-full">
          <input
            id={inputId}
            className={cn(
              'flex h-10 w-full font-body font-normal text-text-primary border border-surface-high bg-surface-low px-4 py-2 text-sm transition-colors duration-125 backdrop-blur-sm appearance-none focus:outline-none focus:bg-surface-high placeholder:text-text-secondary placeholder:italic disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-error focus:border-error',
              className,
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-sm text-error uppercase font-body">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-text-secondary uppercase font-body">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
