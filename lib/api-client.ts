import { getCurrentUser } from './firebase-auth';
import { User as FirebaseUser } from 'firebase/auth';
import { storage } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// Helper function to wait for auth to be ready
async function waitForAuth(maxWait = 3000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const user = getCurrentUser();
    if (user) {
      return true;
    }
    // Wait a bit before checking again
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}

export async function apiRequest(url: string, options: RequestInit = {}) {
  // Wait for auth to be ready before making the request
  const isAuthenticated = await waitForAuth();

  if (!isAuthenticated) {
    throw new Error('User not authenticated');
  }

  const user = getCurrentUser();
  const userId = user!.uid;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userId}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const responseText = await response.text();
    console.error('Error response text:', responseText);

    let error;
    try {
      error = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse error response as JSON:', parseError);
      error = { error: responseText || 'Network error' };
    }

    console.error('API Error Response:', error);
    throw new Error(error.error || error.details || 'Request failed');
  }

  const responseText = await response.text();
  console.log('Success response text:', responseText);

  try {
    return JSON.parse(responseText);
  } catch (parseError) {
    console.error('Failed to parse success response as JSON:', parseError);
    throw new Error('Invalid JSON response from server');
  }
}

// Alternative API client that uses auth context (for components that have access to it)
export function createApiClient(authContext: {
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  initialized: boolean;
}) {
  const apiClient = {
    async request(url: string, options: RequestInit = {}) {
      // Wait for auth to be initialized
      if (!authContext.initialized) {
        throw new Error('Authentication not initialized');
      }

      if (!authContext.firebaseUser) {
        throw new Error('User not authenticated');
      }

      const userId = authContext.firebaseUser.uid;

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userId}`,
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || 'Request failed');
      }

      return response.json();
    },

    get: function (url: string) {
      return this.request(url);
    },
    post: function (url: string, data: unknown) {
      return this.request(url, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    put: function (url: string, data: unknown) {
      return this.request(url, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    patch: function (url: string, data: unknown) {
      return this.request(url, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: function (url: string) {
      return this.request(url, {
        method: 'DELETE',
      });
    },
  };

  return apiClient;
}

export const api = {
  get: (url: string) => apiRequest(url),
  post: (url: string, data: unknown) =>
    apiRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  put: (url: string, data: unknown) =>
    apiRequest(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  patch: (url: string, data: unknown) =>
    apiRequest(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (url: string) =>
    apiRequest(url, {
      method: 'DELETE',
    }),
};

// Convenience functions for common API calls
export const getUserScores = () => api.get('/api/user/all-scores');

// Team logo upload function - simple client-side Firebase Storage
export async function uploadTeamLogo(
  teamId: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  try {
    // Check authentication BEFORE starting upload
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated to upload team logos');
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `team-${teamId}-${Date.now()}.${ext}`;

    // Create storage reference
    const storageRef = ref(storage, `team-logos/${filename}`);

    // Upload file with progress monitoring (following Firebase docs)
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Monitor upload progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          // Handle unsuccessful uploads
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          // Handle successful uploads
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Update team with the logo URL via our API
            const user = getCurrentUser();
            if (!user) {
              throw new Error('User not authenticated');
            }

            const response = await fetch(`/api/teams/${teamId}/upload-logo`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user.uid}`,
              },
              body: JSON.stringify({ logoUrl: downloadURL }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Failed to update team logo: ${errorText}`);
            }

            await response.json();
            resolve(downloadURL);
          } catch (error) {
            console.error('Error updating team logo:', error);
            reject(error);
          }
        },
      );
    });
  } catch (error) {
    console.error('Error uploading team logo:', error);
    throw error;
  }
}

// Remove the old complex server-side functions - no longer needed
// The simple client-side approach above handles everything

// Alternative upload function using direct Firebase Storage (if you prefer this approach)
export async function uploadTeamLogoDirect(
  teamId: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  try {
    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `team-${teamId}-${Date.now()}.${ext}`;

    // Create storage reference
    const storageRef = ref(storage, `team-logos/${filename}`);

    // Upload file with progress monitoring
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Monitor upload progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          // Handle unsuccessful uploads
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          // Handle successful uploads
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Update team with the logo URL
            await api.put(`/api/teams/${teamId}/upload-logo`, {
              logoUrl: downloadURL,
            });

            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject(error);
          }
        },
      );
    });
  } catch (error) {
    console.error('Error uploading team logo:', error);
    throw error;
  }
}
