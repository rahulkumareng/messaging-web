import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';
const GATEWAY_BASE_URL = 'http://localhost:8080';

// Add auth token to every request
const authRequestInterceptor = (config: any) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

// Handle 401 responses by redirecting to login
const redirectOn401 = (error: any) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    window.location.href = '/login';
  }
  return Promise.reject(error);
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
apiClient.interceptors.request.use(authRequestInterceptor);
apiClient.interceptors.response.use((r) => r, redirectOn401);

// Chat-gateway client — the REST history endpoint (GET /messages/:id) is
// JWT-guarded on the gateway too, so this needs the same auth interceptors.
const gatewayClient = axios.create({
  baseURL: GATEWAY_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
gatewayClient.interceptors.request.use(authRequestInterceptor);
gatewayClient.interceptors.response.use((r) => r, redirectOn401);

/**
 * Normalize an axios error into a displayable string.
 * Server errors come back as { statusCode, message } where message may be a
 * string OR an array of class-validator errors — render either safely.
 */
export const getErrorMessage = (err: any, fallback = 'Something went wrong. Please try again.') => {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
};

export interface AuthResponse {
  userId: string;
  token: string;
}

export interface ConversationParticipant {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
  /** Read-receipt watermark: highest message id this participant has read (null = never read). */
  lastReadMessageId?: string | null;
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

export interface User {
  id: string;
  email: string;
}

export const usersApi = {
  search: (query: string) => apiClient.get<User[]>(`/users/search?q=${query}`),
};

export const conversationsApi = {
  getAll: () => apiClient.get<Conversation[]>('/conversations'),
  createGroup: (title: string, participantIds: string[]) =>
    apiClient.post<Conversation>('/conversations/group', { title, participantIds }),
  updateTitle: (id: string, title: string) =>
    apiClient.patch<Conversation>(`/conversations/${id}/title`, { title }),
  addParticipants: (id: string, participantIds: string[]) =>
    apiClient.post<Conversation>(`/conversations/${id}/participants`, { participantIds }),
  createDirect: (targetUserId: string) =>
    apiClient.post<Conversation>('/conversations/direct', { targetUserId }),
};

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export const messagesApi = {
  getMessages: (conversationId: string, limit = 20) =>
    gatewayClient.get<{ conversationId: string; messages: ChatMessage[] }>(
      `/messages/${conversationId}?limit=${limit}`
    ),
};

export default apiClient;
