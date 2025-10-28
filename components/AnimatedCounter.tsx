'use client';

import React, { useEffect, useRef, useState } from 'react';
import { animate, createScope, Scope } from 'animejs';

interface AnimatedCounterProps {
  value: number;
  label: string;
  unit?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  precision?: number;
}

export default function AnimatedCounter({
  value,
  label,
  unit,
  size = 'lg',
  className = '',
  precision = 0,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const counterRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<Scope | null>(null);
  const previousValue = useRef(value);

  // Size classes with Helvetica Neue font
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-5xl',
    xl: 'text-6xl',
  };

  useEffect(() => {
    if (counterRef.current && !scopeRef.current) {
      // Create anime.js scope for this counter
      scopeRef.current = createScope({ root: counterRef.current }).add((self) => {
        // Register method for animating value changes
        self?.add('animateValue', (newValue: number) => {
          if (isAnimating) return; // Prevent overlapping animations

          setIsAnimating(true);

          // Animate the value change
          animate('.counter-value', {
            scale: [1, 1.1, 1],
            duration: 300,
            ease: 'out(2)',
            onComplete: () => setIsAnimating(false),
          });

          // Animate the number change
          animate(
            {
              targets: { value: previousValue.current },
              value: newValue,
              duration: 600,
              ease: 'out(3)',
              update: (anim: { animatables: { target: { value: number } }[] }) => {
                setDisplayValue(anim.animatables[0].target.value);
              },
            },
            { value: newValue },
          );
        });
      });
    }

    return () => {
      if (scopeRef.current) {
        scopeRef.current.revert();
      }
    };
  }, [isAnimating]);

  useEffect(() => {
    if (value !== previousValue.current && scopeRef.current?.methods?.animateValue) {
      scopeRef.current.methods.animateValue(value);
      previousValue.current = value;
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  return (
    <div ref={counterRef} className={`text-center ${className}`}>
      <div className="relative">
        {/* Subtle background glow effect */}
        <div
          className="absolute inset-0 rounded-lg opacity-10 blur-sm"
          style={{
            background: `radial-gradient(circle at center, #FF8333 0%, transparent 70%)`,
          }}
        />

        {/* Counter value */}
        <div
          className={`counter-value font-bold mb-2 ${sizeClasses[size]} relative z-10`}
          style={{
            fontFamily: 'var(--font-ropa-sans)',
            color: '#FF8333',
            textShadow: `0 0 5px #FF8333`,
            letterSpacing: '0.02em',
          }}
        >
          {displayValue.toFixed(precision)}
        </div>
      </div>
      <div
        className="text-gray-300 text-lg font-medium uppercase tracking-wider"
        style={{ fontFamily: 'var(--font-ropa-sans)' }}
      >
        {label}
      </div>
      {unit && (
        <div
          className="text-gray-400 text-sm uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-ropa-sans)' }}
        >
          {unit}
        </div>
      )}
    </div>
  );
}
