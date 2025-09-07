import axios from 'axios';
import useAuthStore from '../stores/authStore';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
});

// List of endpoints that don't require authentication
const publicEndpoints = ['/auth/register', '/auth/login'];

// The interceptor automatically adds the token to requests that need it
apiClient.interceptors.request.use(
  (config) => {
    // Check if this is a public endpoint
    const isPublicEndpoint = publicEndpoints.some(endpoint =>
      config.url?.includes(endpoint)
    );

    console.log('🔍 Request Interceptor Debug:');
    console.log('- URL:', config.url);
    console.log('- Is public endpoint:', isPublicEndpoint);

    // Only add token for non-public endpoints
    if (!isPublicEndpoint) {
      const token = useAuthStore.getState().token;
      console.log('- Token exists:', !!token);
      console.log('- Token preview:', token ? `${token.substring(0, 20)}...` : 'No token');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('- Authorization header added',token);
      } else {
        console.log('- ⚠️  No token found in store');
        
        // Debug: Check what's actually in the store
        const storeState = useAuthStore.getState();
        console.log('- Full store state:', storeState);
      }
    } else {
      console.log('- Public endpoint, no token needed');
    }

    console.log('- Final headers:', config.headers);
    console.log('---');

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Response success:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      console.log('🔄 401 Unauthorized - clearing token');
      useAuthStore.getState().logout();
      // Don't auto-redirect here, let the component handle it
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;