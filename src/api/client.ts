import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const GATEWAY_BASE_URL = import.meta.env.VITE_GATEWAY_URL || '/gateway';

// Add auth token to every request
const authRequestInterceptor = (config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

/**
 * A session is dead (401 on REST, 1008 on WS): clear local auth state and
 * bounce to login. Shared by the REST 401 interceptor and the WS 1008 close
 * handler so both paths stay in sync.
 */
export const handleSessionExpired = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('email');
  window.location.href = '/login';
};

// Handle 401 responses by redirecting to login
const redirectOn401 = (error: AxiosError) => {
  if (error.response?.status === 401) {
    // Auth endpoints return 401 for wrong credentials — exempt them so the
    // caller's catch block can surface the error instead of a hard reload
    // that wipes the form and the message.
    const url = error.config?.url ?? '';
    if (!url.includes('/auth/')) {
      handleSessionExpired();
    }
  }
  return Promise.reject(error);
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});
apiClient.interceptors.request.use(authRequestInterceptor);
apiClient.interceptors.response.use((response) => response, redirectOn401);

// Chat-gateway client — the REST history endpoint (GET /messages/:id) is
// JWT-guarded on the gateway too, so this needs the same auth interceptors.
const gatewayClient = axios.create({
  baseURL: GATEWAY_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});
gatewayClient.interceptors.request.use(authRequestInterceptor);
gatewayClient.interceptors.response.use((response) => response, redirectOn401);

/**
 * Normalize an axios error into a displayable string.
 * Server errors come back as { statusCode, message } where message may be a
 * string OR an array of class-validator errors — render either safely.
 */
export const getErrorMessage = (err: unknown, fallback = 'Something went wrong. Please try again.') => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    const message = data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string' && message.trim()) return message;
    if (err.message) return err.message;
    return fallback;
  }
  if (err instanceof Error && err.message) return err.message;
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
  search: (query: string) => apiClient.get<User[]>(`/users/search?q=${encodeURIComponent(query)}`),
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
  fetchMessages: (conversationId: string, limit = 20) =>
    gatewayClient.get<{ conversationId: string; messages: ChatMessage[] }>(
      `/messages/${conversationId}?limit=${limit}`
    ),
};

export default apiClient;
