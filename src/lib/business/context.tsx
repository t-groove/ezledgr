"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getCookie, setCookie } from "cookies-next/client";
import { getUserBusinesses } from "./actions";
import type { Business, BusinessMember } from "./actions";

interface BusinessContextType {
  currentBusiness: Business | null;
  currentRole: string | null;
  businesses: BusinessMember[];
  /** Switch to a different business. Updates the cookie, context state, and refreshes server components. */
  switchBusiness: (businessId: string, businessName: string) => Promise<void>;
  isLoading: boolean;
}

export const BusinessContext = createContext<BusinessContextType>({
  currentBusiness: null,
  currentRole: null,
  businesses: [],
  switchBusiness: async () => {},
  isLoading: true,
});

export function useBusinessContext() {
  return useContext(BusinessContext);
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessMember[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getUserBusinesses().then((members) => {
      setBusinesses(members);

      if (members.length === 0) {
        setIsLoading(false);
        return;
      }

      // Restore from the active_business_id cookie if available
      const savedId = getCookie("active_business_id") as string | undefined;
      const found = savedId ? members.find((m) => m.business_id === savedId) : null;
      const active = found ?? members[0];

      setCurrentBusiness(active.business);
      setCurrentRole(active.role);
      setIsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchBusiness = useCallback(
    async (businessId: string, businessName: string) => {
      // 1. Write the new active business to the cookie (30-day TTL)
      setCookie("active_business_id", businessId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
      });

      // 2. Update context state immediately so the sidebar re-renders without delay
      const match = businesses.find((m) => m.business_id === businessId);
      if (match) {
        setCurrentBusiness(match.business);
        setCurrentRole(match.role);
      } else {
        // Fallback: construct a minimal Business object from the name we already have
        setCurrentBusiness((prev) =>
          prev ? { ...prev, id: businessId, name: businessName } : null
        );
      }

      // 3. Refresh server components so they pick up the new cookie value
      router.refresh();
    },
    [businesses, router]
  );

  return (
    <BusinessContext.Provider
      value={{ currentBusiness, currentRole, businesses, switchBusiness, isLoading }}
    >
      {children}
    </BusinessContext.Provider>
  );
}
