import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EventImageUpload from '../../components/EventImageUpload';

const mockUploadEventImage = jest.fn();
jest.mock('../../lib/api-client', () => ({
  uploadEventImage: (...args: any[]) => mockUploadEventImage(...args),
}));

describe('EventImageUpload', () => {
  const defaultProps = {
    eventId: 'e1',
    onUploadComplete: jest.fn(),
    onUploadError: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders upload button', () => {
    render(<EventImageUpload {...defaultProps} />);
    expect(screen.getByText(/upload|image|photo/i)).toBeInTheDocument();
  });

  it('rejects invalid file types', () => {
    render(<EventImageUpload {...defaultProps} />);
    const input = document.querySelector('input[type="file"]')!;
    const file = new File(['data'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(defaultProps.onUploadError).toHaveBeenCalledWith(
      expect.stringContaining('Invalid file type'),
    );
  });

  it('rejects files over 5MB', () => {
    render(<EventImageUpload {...defaultProps} />);
    const input = document.querySelector('input[type="file"]')!;
    const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    });
    fireEvent.change(input, { target: { files: [largeFile] } });
    expect(defaultProps.onUploadError).toHaveBeenCalledWith(expect.stringContaining('5MB'));
  });

  it('uploads valid file and calls onUploadComplete', async () => {
    mockUploadEventImage.mockResolvedValue('https://storage.example.com/image.png');
    render(<EventImageUpload {...defaultProps} />);
    const input = document.querySelector('input[type="file"]')!;
    const file = new File(['image data'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadEventImage).toHaveBeenCalledWith('e1', file, expect.any(Function));
      expect(defaultProps.onUploadComplete).toHaveBeenCalledWith(
        'https://storage.example.com/image.png',
      );
    });
  });
});
