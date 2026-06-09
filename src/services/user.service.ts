import type { User, UpdateProfileData, ApiError } from "@/types";
import { storage } from "@/utils";

// Simulate network delay
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const simulateLatency = (): Promise<void> => delay(300 + Math.random() * 500);

// Mock user database (same keys as auth service)
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

export const userService = {
  async getProfile(): Promise<User> {
    await simulateLatency();

    const currentUser = storage.getUser<User>();

    if (!currentUser) {
      const error: ApiError = {
        message: "User not found. Please log in again.",
        code: "USER_NOT_FOUND",
        status: 404,
      };
      throw error;
    }

    // Get the latest data from mock DB
    const db = getMockUsersDb();
    const entry = db[currentUser.email];

    if (!entry) {
      const error: ApiError = {
        message: "User not found in database.",
        code: "USER_NOT_FOUND",
        status: 404,
      };
      throw error;
    }

    return entry.user;
  },

  async updateProfile(data: UpdateProfileData): Promise<User> {
    await simulateLatency();

    const currentUser = storage.getUser<User>();

    if (!currentUser) {
      const error: ApiError = {
        message: "User not found. Please log in again.",
        code: "USER_NOT_FOUND",
        status: 404,
      };
      throw error;
    }

    const db = getMockUsersDb();
    const entry = db[currentUser.email];

    if (!entry) {
      const error: ApiError = {
        message: "User not found in database.",
        code: "USER_NOT_FOUND",
        status: 404,
      };
      throw error;
    }

    // Update user data
    const updatedUser: User = {
      ...entry.user,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || entry.user.phone,
      updatedAt: new Date().toISOString(),
    };

    // Save to mock DB
    db[currentUser.email] = { ...entry, user: updatedUser };
    saveMockUsersDb(db);

    // Update local storage
    storage.setUser(updatedUser);

    return updatedUser;
  },
};