import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses by redirecting to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('email');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface AuthResponse {
  userId: string;
  token: string;
}

export interface ConversationParticipant {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
}

export const authApi = {
  register: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/register', { email, password }),
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }),
};

export const conversationsApi = {
  getAll: () => apiClient.get<Conversation[]>('/conversations'),
};

export default apiClient;
