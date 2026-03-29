'use client';

import React, { useState, useRef } from 'react';
import { uploadEventImage } from '@lib/api-client';

interface EventImageUploadProps {
  eventId: string;
  onUploadComplete?: (imageUrl: string) => void;
  onUploadError?: (error: string) => void;
}

export default function EventImageUpload({
  eventId,
  onUploadComplete,
  onUploadError,
}: EventImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      onUploadError?.('Invalid file type. Only PNG, JPEG, JPG, GIF, and WEBP are allowed.');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      onUploadError?.('File size exceeds 5MB limit.');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Use client-side Firebase Storage upload with real progress monitoring
      const imageUrl = await uploadEventImage(eventId, file, (progressValue) => {
        setProgress(progressValue);
      });

      onUploadComplete?.(imageUrl);
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-secondary">Upload Event Image</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
          onChange={handleFileSelect}
          disabled={uploading}
          className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900 file:text-blue-300 hover:file:bg-blue-800 disabled:opacity-50"
        />
        <p className="text-xs text-text-secondary">
          Supported formats: PNG, JPEG, JPG, GIF, WEBP. Max size: 5MB
        </p>
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-text-secondary">
            <span>Uploading...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-surface-high rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
