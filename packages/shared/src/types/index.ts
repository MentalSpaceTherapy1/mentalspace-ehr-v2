// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User Types
export enum UserRole {
  ADMINISTRATOR = 'ADMINISTRATOR',
  SUPERVISOR = 'SUPERVISOR',
  CLINICIAN = 'CLINICIAN',
  BILLING_STAFF = 'BILLING_STAFF',
  FRONT_DESK = 'FRONT_DESK',
  ASSOCIATE = 'ASSOCIATE',
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title?: string;
  role: UserRole;
  isActive: boolean;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}
