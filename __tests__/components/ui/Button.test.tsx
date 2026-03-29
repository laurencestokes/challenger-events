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
    const btn = screen.getByText('Disabled').closest('button');
    expect(btn).toHaveAttribute('disabled');
  });

  it('is disabled when loading is true', () => {
    render(<Button loading>Loading</Button>);
    const btn = screen.getByText('Loading').closest('button');
    expect(btn).toHaveAttribute('disabled');
  });

  it('shows spinner when loading', () => {
    render(<Button loading>Saving</Button>);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('does not show spinner when not loading', () => {
    render(<Button>Save</Button>);
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
  });

  it('does not call onClick when disabled', () => {
    const onClick = jest.fn();
    render(
      <Button onClick={onClick} disabled>
        Nope
      </Button>,
    );
    fireEvent.click(screen.getByText('Nope').closest('button')!);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', () => {
    const onClick = jest.fn();
    render(
      <Button onClick={onClick} loading>
        Wait
      </Button>,
    );
    fireEvent.click(screen.getByText('Wait').closest('button')!);
    expect(onClick).not.toHaveBeenCalled();
  });

  describe('form integration', () => {
    it('renders with type="submit"', () => {
      render(<Button type="submit">Submit</Button>);
      const btn = screen.getByText('Submit').closest('button');
      expect(btn).toHaveAttribute('type', 'submit');
    });

    it('renders with type="reset"', () => {
      render(<Button type="reset">Reset</Button>);
      const btn = screen.getByText('Reset').closest('button');
      expect(btn).toHaveAttribute('type', 'reset');
    });

    it('defaults to type="button"', () => {
      render(<Button>Default</Button>);
      const btn = screen.getByText('Default').closest('button');
      expect(btn).toHaveAttribute('type', 'button');
    });
  });

  describe('aria', () => {
    it('passes aria-label to the button', () => {
      render(<Button aria-label="Close dialog">X</Button>);
      const btn = screen.getByText('X').closest('button');
      expect(btn).toHaveAttribute('aria-label', 'Close dialog');
    });
  });

  describe('variants', () => {
    it('applies default variant (primary) classes', () => {
      render(<Button variant="default">Default</Button>);
      const btn = screen.getByText('Default').closest('button');
      expect(btn?.className).toContain('bg-primary');
    });

    it('applies destructive variant classes', () => {
      render(<Button variant="destructive">Delete</Button>);
      const btn = screen.getByText('Delete').closest('button');
      expect(btn?.className).toContain('border-error');
    });

    it('applies outline variant classes', () => {
      render(<Button variant="outline">Outline</Button>);
      const btn = screen.getByText('Outline').closest('button');
      expect(btn?.className).toContain('border');
    });

    it('applies secondary variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const btn = screen.getByText('Secondary').closest('button');
      expect(btn?.className).toContain('bg-transparent');
    });

    it('applies ghost variant classes', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const btn = screen.getByText('Ghost').closest('button');
      expect(btn?.className).toContain('bg-transparent');
    });

    it('applies link variant classes', () => {
      render(<Button variant="link">Link</Button>);
      const btn = screen.getByText('Link').closest('button');
      expect(btn?.className).toContain('underline-offset-4');
    });
  });

  describe('sizes', () => {
    it('applies default size', () => {
      render(<Button size="default">Btn</Button>);
      const btn = screen.getByText('Btn').closest('button');
      expect(btn?.className).toContain('h-10');
    });

    it('applies sm size', () => {
      render(<Button size="sm">Small</Button>);
      const btn = screen.getByText('Small').closest('button');
      expect(btn?.className).toContain('h-9');
    });

    it('applies lg size', () => {
      render(<Button size="lg">Large</Button>);
      const btn = screen.getByText('Large').closest('button');
      expect(btn?.className).toContain('h-11');
    });

    it('applies icon size', () => {
      render(<Button size="icon">X</Button>);
      const btn = screen.getByText('X').closest('button');
      expect(btn?.className).toContain('w-10');
    });
  });

  it('merges custom className', () => {
    render(<Button className="my-custom-class">Custom</Button>);
    const btn = screen.getByText('Custom').closest('button');
    expect(btn?.className).toContain('my-custom-class');
  });

  it('is also exported via barrel index', () => {
    expect(IndexButton).toBe(Button);
  });
});
