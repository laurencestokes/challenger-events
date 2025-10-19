'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import WelcomeSection from '@/components/WelcomeSection';

export default function AdminImageUpload() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [gallery, setGallery] = useState<string[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setImageUrl('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an image file.');
      return;
    }
    setUploading(true);
    setError('');
    setImageUrl('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user?.uid || user?.id}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Upload failed');
      } else {
        setImageUrl(data.url);
      }
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const fetchGallery = async () => {
    setGalleryLoading(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/admin/upload-image', {
        headers: { Authorization: `Bearer ${user?.uid || user?.id}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.images)) {
        setGallery(data.images);
      } else {
        setGallery([]);
      }
    } catch {
      setGallery([]);
    } finally {
      setGalleryLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchGallery();
    // eslint-disable-next-line
  }, [user]);

  const handleDelete = async (imgUrl: string) => {
    setDeleteError('');
    const filename = imgUrl.split('/').pop();
    if (!filename) return;
    try {
      const res = await fetch(`/api/admin/upload-image?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user?.uid || user?.id}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'Delete failed');
      } else {
        setGallery((g) => g.filter((url) => url !== imgUrl));
      }
    } catch {
      setDeleteError('Delete failed');
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <div style={{ backgroundColor: '#0F0F0F' }} className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <WelcomeSection />

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <button
                onClick={() => window.history.back()}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
              >
                Back
              </button>
              <span className="text-gray-400 dark:text-gray-500">/</span>
              <span className="text-gray-900 dark:text-white text-sm font-medium">
                Image Upload
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white">Admin Image Upload</h1>
            <p className="mt-2 text-gray-400">Upload and manage images for your events</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Image</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600 bg-gray-700 border border-gray-600 rounded-lg p-2"
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading || !file}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-orange-600 transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload Image'}
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
                <div className="bg-gray-700 border border-gray-600 rounded-lg p-3 font-mono text-sm mb-4 select-all text-gray-300">
                  {`![Alt text](${imageUrl})`}
                </div>
                <div className="mb-2 text-white">Preview:</div>
                <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
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
            <hr className="my-8 border-gray-700/50" />
            <h2 className="text-xl font-semibold mb-4 text-white">Image Gallery</h2>
            {galleryLoading ? (
              <div className="text-center py-8">
                <div
                  className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
                  style={{ borderColor: '#4682B4' }}
                ></div>
                <p className="text-gray-400">Loading gallery...</p>
              </div>
            ) : gallery.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
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
                <p className="text-gray-400">No images uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gallery.map((img) => (
                  <div
                    key={img}
                    className="relative group border border-gray-700/50 rounded-lg p-4 bg-gray-900/50 hover:bg-gray-900/70 transition-colors"
                  >
                    <div className="w-full h-32 relative mb-3 rounded-lg overflow-hidden">
                      <Image src={img} alt="Uploaded" fill style={{ objectFit: 'contain' }} />
                    </div>
                    <div className="bg-gray-700 border border-gray-600 rounded-lg p-2 font-mono text-xs select-all break-all text-gray-300">
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
