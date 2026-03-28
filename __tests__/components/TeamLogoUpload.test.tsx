import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TeamLogoUpload from '../../components/TeamLogoUpload';

const mockUploadTeamLogo = jest.fn();
jest.mock('../../lib/api-client', () => ({
  uploadTeamLogo: (...args: any[]) => mockUploadTeamLogo(...args),
}));

describe('TeamLogoUpload', () => {
  const defaultProps = {
    teamId: 't1',
    onUploadComplete: jest.fn(),
    onUploadError: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders upload area', () => {
    render(<TeamLogoUpload {...defaultProps} />);
    expect(screen.getByText(/upload|logo/i)).toBeInTheDocument();
  });

  it('rejects invalid file types', () => {
    render(<TeamLogoUpload {...defaultProps} />);
    const input = document.querySelector('input[type="file"]')!;
    const file = new File(['data'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(defaultProps.onUploadError).toHaveBeenCalledWith(
      expect.stringContaining('Invalid file type'),
    );
  });

  it('rejects files over 5MB', () => {
    render(<TeamLogoUpload {...defaultProps} />);
    const input = document.querySelector('input[type="file"]')!;
    const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    });
    fireEvent.change(input, { target: { files: [largeFile] } });
    expect(defaultProps.onUploadError).toHaveBeenCalledWith(expect.stringContaining('5MB'));
  });

  it('uploads valid file and calls onUploadComplete', async () => {
    mockUploadTeamLogo.mockResolvedValue('https://storage.example.com/logo.png');
    render(<TeamLogoUpload {...defaultProps} />);
    const input = document.querySelector('input[type="file"]')!;
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadTeamLogo).toHaveBeenCalledWith('t1', file, expect.any(Function));
      expect(defaultProps.onUploadComplete).toHaveBeenCalledWith(
        'https://storage.example.com/logo.png',
      );
    });
  });
});
