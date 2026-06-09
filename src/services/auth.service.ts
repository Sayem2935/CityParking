import type { LoginCredentials, RegisterData, AuthResponse, User, ApiError } from "@/types";
import { storage } from "@/utils";

// Simulate network delay
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const simulateLatency = (): Promise<void> => delay(300 + Math.random() * 500);

// Mock user database stored in localStorage
const USERS_DB_KEY = "parking_mock_users_db";

const getMockUsersDb = (): Record<string, { user: User; passwordHash: string }> => {
  try {
    const data = localStorage.getItem(USERS_DB_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

const saveMockUsersDb = (db: Record<string, { user: User; passwordHash: string }>): void => {
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(db));
};

// Simple hash for mock purposes (not for production)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `mock_hash_${Math.abs(hash)}`;
};

const generateToken = (userId: string): string => {
  return `mock_token_${userId}_${Date.now()}`;
};

const generateId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Seed a default test user if none exist
const seedDefaultUser = (): void => {
  const db = getMockUsersDb();
  const testEmail = "test@example.com";
  
  if (!db[testEmail]) {
    const now = new Date().toISOString();
    const testUser: User = {
      id: "user_test_default",
      email: testEmail,
      firstName: "John",
      lastName: "Doe",
      phone: "+1234567890",
      createdAt: now,
      updatedAt: now,
    };
    db[testEmail] = { user: testUser, passwordHash: simpleHash("Password1") };
    saveMockUsersDb(db);
  }
};

// Initialize with seed data
seedDefaultUser();

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await simulateLatency();

    const db = getMockUsersDb();
    const entry = db[credentials.email];

    if (!entry) {
      const error: ApiError = {
        message: "Invalid email or password.",
        code: "INVALID_CREDENTIALS",
        status: 401,
      };
      throw error;
    }

    if (entry.passwordHash !== simpleHash(credentials.password)) {
      const error: ApiError = {
        message: "Invalid email or password.",
        code: "INVALID_CREDENTIALS",
        status: 401,
      };
      throw error;
    }

    const token = generateToken(entry.user.id);
    const response: AuthResponse = {
      user: entry.user,
      token,
    };

    // Persist session
    storage.setToken(token);
    storage.setUser(entry.user);

    return response;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    await simulateLatency();

    const db = getMockUsersDb();

    // Check if email already exists
    if (db[data.email]) {
      const error: ApiError = {
        message: "An account with this email already exists.",
        code: "EMAIL_EXISTS",
        status: 409,
      };
      throw error;
    }

    // Check password confirmation
    if (data.password !== data.confirmPassword) {
      const error: ApiError = {
        message: "Passwords do not match.",
        code: "PASSWORD_MISMATCH",
        status: 400,
      };
      throw error;
    }

    const now = new Date().toISOString();
    const newUser: User = {
      id: generateId(),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      createdAt: now,
      updatedAt: now,
    };

    // Save to mock DB
    db[data.email] = { user: newUser, passwordHash: simpleHash(data.password) };
    saveMockUsersDb(db);

    const token = generateToken(newUser.id);

    // Persist session
    storage.setToken(token);
    storage.setUser(newUser);

    return {
      user: newUser,
      token,
    };
  },

  async logout(): Promise<void> {
    await delay(200);
    storage.clearAll();
  },

  async getCurrentUser(): Promise<User | null> {
    await delay(100);

    const token = storage.getToken();
    if (!token) return null;

    const user = storage.getUser<User>();
    return user;
  },
};