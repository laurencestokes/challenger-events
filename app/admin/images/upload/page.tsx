'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

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
      <div className="max-w-xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-6">Admin Image Upload</h1>
        <div className="mb-4">
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
        </div>
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="px-6 py-2 bg-primary-600 text-white rounded-md font-medium disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload Image'}
        </button>
        {error && <div className="mt-4 text-red-600">{error}</div>}
        {imageUrl && (
          <div className="mt-6">
            <div className="mb-2">Upload successful! Use this markdown to embed your image:</div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 font-mono text-sm mb-2 select-all">
              {`![Alt text](${imageUrl})`}
            </div>
            <div className="max-w-xs border rounded shadow overflow-hidden">
              <Image
                src={imageUrl}
                alt="Uploaded"
                width={300}
                height={200}
                style={{ objectFit: 'contain', width: '100%', height: 'auto' }}
              />
            </div>
          </div>
        )}
        <hr className="my-8" />
        <h2 className="text-xl font-semibold mb-4">Image Gallery</h2>
        {galleryLoading ? (
          <div>Loading gallery...</div>
        ) : gallery.length === 0 ? (
          <div className="text-gray-500">No images uploaded yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {gallery.map((img) => (
              <div
                key={img}
                className="relative group border rounded p-2 bg-white dark:bg-gray-900"
              >
                <div className="w-full h-32 relative mb-2">
                  <Image src={img} alt="Uploaded" fill style={{ objectFit: 'contain' }} />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded p-1 font-mono text-xs mb-2 select-all break-all">
                  {`![Alt text](${img})`}
                </div>
                <button
                  onClick={() => handleDelete(img)}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded px-2 py-1 text-xs opacity-80 group-hover:opacity-100 transition"
                  title="Delete image"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
        {deleteError && <div className="mt-4 text-red-600">{deleteError}</div>}
      </div>
    </ProtectedRoute>
  );
}
