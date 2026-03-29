import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from '../../components/ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Delete Item',
    message: 'Are you sure you want to delete this?',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Delete Item')).not.toBeInTheDocument();
  });

  it('renders title and message when open', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this?')).toBeInTheDocument();
  });

  it('shows default button text', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows custom button text', () => {
    render(<ConfirmModal {...defaultProps} confirmText="Yes, delete" cancelText="No, keep" />);
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
    expect(screen.getByText('No, keep')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Confirm'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('applies destructive styling when isDestructive is true', () => {
    render(<ConfirmModal {...defaultProps} isDestructive={true} />);
    const confirmBtn = screen.getByText('Confirm');
    expect(confirmBtn.className).toContain('bg-red-600');
  });

  it('applies primary styling when isDestructive is false', () => {
    render(<ConfirmModal {...defaultProps} isDestructive={false} />);
    const confirmBtn = screen.getByText('Confirm');
    expect(confirmBtn.className).toContain('bg-primary');
  });

  it('defaults isDestructive to false', () => {
    render(<ConfirmModal {...defaultProps} />);
    const confirmBtn = screen.getByText('Confirm');
    expect(confirmBtn.className).toContain('bg-primary');
    expect(confirmBtn.className).not.toContain('bg-red-600');
  });
});
