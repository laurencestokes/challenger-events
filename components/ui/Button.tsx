'use client';

import React from 'react';
import { Button as DSButton } from '@challengerco/challenger-fitness-design-system/client';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
  children: React.ReactNode;
}

const sizeClasses = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3 text-xs',
  lg: 'h-11 px-8',
  icon: 'h-10 w-10 px-0 justify-center',
};

const variantOverrides: Record<string, string> = {
  destructive: 'border-error bg-error text-text-primary hover:bg-error/80',
  ghost: 'border-transparent bg-transparent hover:bg-surface-high hover:border-transparent',
  link: 'border-transparent bg-transparent underline-offset-4 hover:underline hover:border-transparent px-0 py-0 h-auto',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      loading = false,
      children,
      disabled,
      type,
      onClick,
      'aria-label': ariaLabel,
      ..._props
    },
    _ref,
  ) => {
    const dsVariant = variant === 'default' || variant === 'destructive' ? 'primary' : 'secondary';
    const overrideClass = variantOverrides[variant] || '';

    return (
      <DSButton
        as="button"
        variant={dsVariant}
        className={cn(
          sizeClasses[size],
          overrideClass,
          loading && 'opacity-75 cursor-not-allowed',
          className,
        )}
        isDisabled={disabled || loading}
        type={type === 'submit' ? 'submit' : type === 'reset' ? 'reset' : 'button'}
        onPress={onClick ? () => onClick({} as React.MouseEvent<HTMLButtonElement>) : undefined}
        aria-label={ariaLabel}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </DSButton>
    );
  },
);

Button.displayName = 'Button';

export default Button;
