'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@components/ProtectedRoute';
import { useAuth } from '@contexts/AuthContext';
import { queryKeys } from '../../../../lib/queryKeys';
import Image from 'next/image';
import WelcomeSection from '@components/WelcomeSection';

export default function AdminImageUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const { data: galleryData, isLoading: galleryLoading } = useQuery({
    queryKey: queryKeys.admin.images(),
    queryFn: async () => {
      const res = await fetch('/api/admin/upload-image', {
        headers: { Authorization: `Bearer ${user?.uid || user?.id}` },
      });
      const data = await res.json();
      return res.ok && Array.isArray(data.images) ? data.images : [];
    },
    enabled: !!user,
  });

  const gallery: string[] = galleryData || [];

  const uploadMutation = useMutation({
    mutationFn: async (uploadFile: File) => {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user?.uid || user?.id}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data.url as string;
    },
    onSuccess: (url) => {
      setImageUrl(url);
      setFile(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.images() });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Upload failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (imgUrl: string) => {
      const filename = imgUrl.split('/').pop();
      if (!filename) throw new Error('Invalid image URL');
      const res = await fetch(`/api/admin/upload-image?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.uid || user?.id}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.images() });
    },
    onError: (err: unknown) => {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setImageUrl('');
    }
  };

  const handleUpload = () => {
    if (!file) {
      setError('Please select an image file.');
      return;
    }
    setError('');
    setImageUrl('');
    uploadMutation.mutate(file);
  };

  const handleDelete = (imgUrl: string) => {
    setDeleteError('');
    deleteMutation.mutate(imgUrl);
  };

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <WelcomeSection />

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <button
                onClick={() => window.history.back()}
                className="text-muted hover:text-text-secondary text-sm"
              >
                Back
              </button>
              <span className="text-muted">/</span>
              <span className="text-text-primary text-sm font-medium">Image Upload</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Admin Image Upload</h1>
            <p className="mt-2 text-muted">Upload and manage images for your events</p>
          </div>

          <div className="panel rounded-2xl  p-8">
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Select Image
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                onChange={handleFileChange}
                className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-surface-high file:text-white hover:file:bg-gray-600 bg-surface-high border border-border rounded-lg p-2"
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={uploadMutation.isPending || !file}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-orange-600 transition-colors"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Image'}
            </button>
            {error && (
              <div className="mt-4 bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            {imageUrl && (
              <div className="mt-6">
                <div className="mb-2 text-white">
                  Upload successful! Use this markdown to embed your image:
                </div>
                <div className="bg-surface-high border border-border rounded-lg p-3 font-mono text-sm mb-4 select-all text-text-secondary">
                  {`![Alt text](${imageUrl})`}
                </div>
                <div className="mb-2 text-white">Preview:</div>
                <div className="border border-surface-high rounded-lg p-4 bg-carbon/50">
                  <Image
                    src={imageUrl}
                    alt="Uploaded"
                    width={300}
                    height={200}
                    className="max-w-full h-auto rounded-lg"
                  />
                </div>
              </div>
            )}
            <hr className="my-8 border-surface-high/50" />
            <h2 className="text-xl font-semibold mb-4 text-white">Image Gallery</h2>
            {galleryLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4 border-primary"></div>
                <p className="text-muted">Loading gallery...</p>
              </div>
            ) : gallery.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-surface-high rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-muted">No images uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gallery.map((img) => (
                  <div
                    key={img}
                    className="relative group border border-surface-high/50 rounded-lg p-4 bg-carbon/50 hover:bg-surface-low/70 transition-colors"
                  >
                    <div className="w-full h-32 relative mb-3 rounded-lg overflow-hidden">
                      <Image src={img} alt="Uploaded" fill style={{ objectFit: 'contain' }} />
                    </div>
                    <div className="bg-surface-high border border-border rounded-lg p-2 font-mono text-xs select-all break-all text-text-secondary">
                      {`![Alt text](${img})`}
                    </div>
                    <button
                      onClick={() => handleDelete(img)}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-lg px-3 py-1 text-xs opacity-80 group-hover:opacity-100 transition-all hover:bg-red-700"
                      title="Delete image"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
            {deleteError && (
              <div className="mt-4 bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{deleteError}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
