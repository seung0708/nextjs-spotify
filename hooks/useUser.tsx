import { User } from "@supabase/auth-helpers-nextjs";
import { useSessionContext, useUser as useSupaUser } from "@supabase/auth-helpers-react";

import { Subscription, UserDetails } from "@/types";
import { createContext, useContext, useEffect, useState } from "react";

type UserContextType = {
  accessToken: string | null;
  user: User | null;
  userDetails: UserDetails | null;
  isLoading: boolean;
  subscription: Subscription | null;
};

export const UserContext = createContext<UserContextType | undefined>(undefined);

export interface Props {
  [propName: string]: any;
}

function isSubscription(data: any): data is Subscription {
  return (
      data &&
      typeof data === 'object' &&
      'id' in data &&
      typeof data.id === 'string' &&
      'user_id' in data &&
      typeof data.user_id === 'string' &&
      'created' in data &&
      typeof data.created === 'string' &&
      'current_period_start' in data &&
      typeof data.current_period_start === 'string' &&
      'current_period_end' in data &&
      typeof data.current_period_end === 'string'
  );
}


export const MyUserContextProvider = (props: Props) => {
  const { session, isLoading: isLoadingUser, supabaseClient: supabase } = useSessionContext();
  const user = useSupaUser();
  const accessToken = session?.access_token ?? null;
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const getUserDetails = () => supabase.from("users").select("*").single();
  const getSubscription = () =>
    supabase.from("subscriptions").select("*, prices(*, products(*))").in("status", ["trialing", "active"]).single();

  useEffect(() => {
    if (user && !isLoadingData && !userDetails && !subscription) {
      setIsLoadingData(true);

      Promise.allSettled([getUserDetails(), getSubscription()]).then((result) => {
        const userDetailsPromise = result[0];
        const subscriptionPromise = result[1];


        if (userDetailsPromise.status === "fulfilled" && userDetailsPromise.value && 'data' in userDetailsPromise.value) {
          const data = userDetailsPromise.value.data;
          
          // Type assertion with additional checks
          if (data && typeof data === 'object' && 'id' in data && 'first_name' in data && 'last_name' in data) {
            setUserDetails(data as UserDetails);
          } else {
            console.error("UserDetails format is incorrect:", data);
            setUserDetails(null); // Handle as per your logic
          }
        } else {
          console.error("Failed to fetch user details:", userDetailsPromise);
        }

        if (subscriptionPromise.status === "fulfilled" && subscriptionPromise.value && 'data' in subscriptionPromise.value) {
          const data = subscriptionPromise.value.data;
          
          // Type check with the custom isSubscription guard
          if (isSubscription(data)) {
            setSubscription(data);
          } else {
            console.error("Subscription format is incorrect:", data);
            setSubscription(null); // Handle as per your logic
          }
        } else {
          console.error("Failed to fetch subscription details:", subscriptionPromise);
        }
        
        setIsLoadingData(false);
      });
      
    } else if (!user && !isLoadingUser && !isLoadingData) {
      setUserDetails(null);
      setSubscription(null);
    }
  }, [user, isLoadingUser]);

  const value = {
    accessToken,
    user,
    userDetails,
    isLoading: isLoadingUser || isLoadingData,
    subscription,
  };

  return <UserContext.Provider value={value} {...props} />;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a MyUserContextProvider");
  }
  return context;
};

