/**
 * Utility to consistently handle image paths across local and production environments.
 * It prefixes relative /uploads paths with the appropriate backend URL.
 */
export const getAssetURL = (path) => {
    if (!path) return '';
    
    // If it's already a full URL (Unsplash, etc.), return as is
    if (path.startsWith('http')) return path;
    
    // Clean the path to ensure it starts with /uploads/
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    // Get backend URL from environment or default to local
    // If VITE_API_URL is just /api, we should use localhost:5000 in dev to avoid relative path confusion
    let backendURL = '';
    const envApiUrl = import.meta.env.VITE_API_URL;
    
    if (!envApiUrl || envApiUrl === '/api') {
        backendURL = 'http://localhost:5000';
    } else {
        backendURL = envApiUrl.replace(/\/api\/?$/, '');
    }
    
    return `${backendURL}${cleanPath}`;
};
