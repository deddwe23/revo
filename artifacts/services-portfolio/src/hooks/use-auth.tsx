import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface Customer {
  id: number;
  email: string;
  fullName: string;
}

interface AuthState {
  customer: Customer | null;
  loading: boolean;
  refetch: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({ customer: null, loading: true, refetch: () => {}, logout: () => {} });

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const res = await fetch(`${BASE}/api/customer/me`, { credentials: "include" });
      const data = await res.json() as { authenticated: boolean; customer?: Customer };
      setCustomer(data.authenticated ? (data.customer ?? null) : null);
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchMe(); }, []);

  const logout = async () => {
    await fetch(`${BASE}/api/customer/logout`, { method: "POST", credentials: "include" });
    setCustomer(null);
  };

  return (
    <AuthContext.Provider value={{ customer, loading, refetch: () => { void fetchMe(); }, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
