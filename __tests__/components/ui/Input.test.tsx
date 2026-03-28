import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from '../../../components/ui/Input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    render(<Input placeholder="No label" />);
    expect(document.querySelector('label')).not.toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<Input error="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('renders helper text when no error', () => {
    render(<Input helperText="Enter your email" />);
    expect(screen.getByText('Enter your email')).toBeInTheDocument();
  });

  it('hides helper text when error is present', () => {
    render(<Input error="Bad input" helperText="This should be hidden" />);
    expect(screen.getByText('Bad input')).toBeInTheDocument();
    expect(screen.queryByText('This should be hidden')).not.toBeInTheDocument();
  });

  it('applies error styling to input', () => {
    render(<Input error="Invalid" />);
    const input = document.querySelector('input');
    expect(input?.className).toContain('border-accent-500');
  });

  it('handles onChange events', () => {
    const onChange = jest.fn();
    render(<Input onChange={onChange} />);
    fireEvent.change(document.querySelector('input')!, { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('associates label with input via htmlFor', () => {
    render(<Input label="Username" id="username-input" />);
    const label = screen.getByText('Username');
    expect(label).toHaveAttribute('for', 'username-input');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('merges custom className', () => {
    render(<Input className="extra-class" />);
    const input = document.querySelector('input');
    expect(input?.className).toContain('extra-class');
  });

  it('supports disabled state', () => {
    render(<Input disabled />);
    expect(document.querySelector('input')).toBeDisabled();
  });
});
