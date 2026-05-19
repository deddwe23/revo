/**
 * API Endpoints for Database Operations
 * 
 * This file provides type-safe references to database API endpoints.
 * The actual database layer implementation is in artifacts/api-server/src/lib/database-functions.ts
 * 
 * Frontend React components should use these endpoint builders to call the backend API.
 * Direct database access only happens on the server side.
 */

export interface DbResult<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

export interface AuthResult {
  success: boolean;
  customerId?: number;
  adminId?: number;
  token?: string;
  message: string;
}

export interface RatingResult {
  success: boolean;
  ratingId?: number;
  message: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: number;
  message: string;
}

export interface DashboardStats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  totalRatings: number;
  approvedRatings: number;
  avgRating: number;
  totalRevenue: number;
}

/**
 * API Endpoint builders - use these from React components
 */
export const API_ENDPOINTS = {
  // Authentication
  customerLogin: (base: string) => `${base}/api/customer/login`,
  customerRegister: (base: string) => `${base}/api/customer/register`,
  customerLogout: (base: string) => `${base}/api/customer/logout`,
  adminSendOtp: (base: string) => `${base}/api/auth/send-otp`,
  adminVerifyOtp: (base: string) => `${base}/api/auth/verify-otp`,
  adminLogout: (base: string) => `${base}/api/auth/logout`,
  
  // Customer info
  currentCustomer: (base: string) => `${base}/api/customer/me`,
  customerProfile: (base: string) => `${base}/api/customer/profile`,
  
  // Ratings
  allRatings: (base: string) => `${base}/api/ratings`,
  submitRating: (base: string) => `${base}/api/ratings`,
  adminRatings: (base: string) => `${base}/api/admin/ratings`,
  
  // Orders
  submitOrder: (base: string) => `${base}/api/orders`,
  customerOrders: (base: string) => `${base}/api/customer/orders`,
  
  // Admin
  adminStats: (base: string) => `${base}/api/admin/stats`,
  adminAnalytics: (base: string) => `${base}/api/admin/analytics`,
  adminOrders: (base: string) => `${base}/api/admin/orders`,
  adminCustomers: (base: string) => `${base}/api/admin/customers`,
  
  // Store
  products: (base: string) => `${base}/api/store/products`,
  storeSettings: (base: string) => `${base}/api/store/settings`,
};

/**
 * Make authenticated API calls from React components
 */
export async function fetchApi<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<DbResult<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Send cookies with request
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        message: error.message || `HTTP ${response.status}`,
        error: error.error,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
      message: "Success",
    };
  } catch (error) {
    console.error("API call failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Example usage in a React component:
 * 
 * const base = import.meta.env.BASE_URL.replace(/\/$/, "");
 * const result = await fetchApi(API_ENDPOINTS.allRatings(base));
 * if (result.success) {
 *   const ratings = result.data;
 * }
 */
