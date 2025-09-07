import axios from 'axios';
import useAuthStore from '../stores/authStore';

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000', // Your FastAPI backend URL
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
    
    // Only add token for non-public endpoints
    if (!isPublicEndpoint) {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;