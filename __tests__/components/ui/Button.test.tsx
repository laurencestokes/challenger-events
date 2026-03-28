import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../../../components/ui/Button';
// Also import via index to cover the barrel export
import { Button as IndexButton } from '../../../components/ui';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });

  it('is disabled when loading is true', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByText('Loading').closest('button')).toBeDisabled();
  });

  it('shows spinner when loading', () => {
    render(<Button loading>Saving</Button>);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('does not show spinner when not loading', () => {
    render(<Button>Save</Button>);
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
  });

  describe('variants', () => {
    it('applies default variant classes', () => {
      render(<Button variant="default">Default</Button>);
      const btn = screen.getByText('Default');
      expect(btn.className).toContain('bg-primary-500');
    });

    it('applies destructive variant classes', () => {
      render(<Button variant="destructive">Delete</Button>);
      const btn = screen.getByText('Delete');
      expect(btn.className).toContain('bg-accent-500');
    });

    it('applies outline variant classes', () => {
      render(<Button variant="outline">Outline</Button>);
      const btn = screen.getByText('Outline');
      expect(btn.className).toContain('border');
    });

    it('applies secondary variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const btn = screen.getByText('Secondary');
      expect(btn.className).toContain('bg-gray-100');
    });

    it('applies ghost variant classes', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const btn = screen.getByText('Ghost');
      expect(btn.className).toContain('hover:bg-gray-100');
    });

    it('applies link variant classes', () => {
      render(<Button variant="link">Link</Button>);
      const btn = screen.getByText('Link');
      expect(btn.className).toContain('underline-offset-4');
    });
  });

  describe('sizes', () => {
    it('applies default size', () => {
      render(<Button size="default">Btn</Button>);
      expect(screen.getByText('Btn').className).toContain('h-10');
    });

    it('applies sm size', () => {
      render(<Button size="sm">Small</Button>);
      expect(screen.getByText('Small').className).toContain('h-9');
    });

    it('applies lg size', () => {
      render(<Button size="lg">Large</Button>);
      expect(screen.getByText('Large').className).toContain('h-11');
    });

    it('applies icon size', () => {
      render(<Button size="icon">X</Button>);
      expect(screen.getByText('X').className).toContain('w-10');
    });
  });

  it('merges custom className', () => {
    render(<Button className="my-custom-class">Custom</Button>);
    expect(screen.getByText('Custom').className).toContain('my-custom-class');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('is also exported via barrel index', () => {
    expect(IndexButton).toBe(Button);
  });
});
