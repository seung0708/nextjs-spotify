import { User } from "@supabase/auth-helpers-nextjs";
import { useSessionContext, useUser as useSupaUser } from "@supabase/auth-helpers-react";

import { UserDetails, Subscription } from "@/types";
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

export const MyUserContextProvider = (props: Props) => {
  const { session, isLoading: isLoadingUser, supabaseClient: supabase } = useSessionContext();
  const user = useSupaUser();
  const accessToken = session?.access_token ?? null;
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const getUserDetails = async () => {
    const {data, error } = await supabase.from("users").select("*").single();
    if(error) {
      console.log('Error fetching user details ', error);
    }

    return data;

  }
  const getSubscription = async () => {
    const {data, error} = await supabase.from("subscriptions").select("*, prices(*, products(*))").in("status", ["trialing", "active"]).single();
    if (error) {
      console.log('Error fetching subsription details', error); 
    }

    return data;
  }
    

  useEffect(() => {
    if (user && !isLoadingData && !userDetails && !subscription) {
      setIsLoadingData(true);

      Promise.allSettled([getUserDetails(), getSubscription()]).then((result) => {
        const userDetailsPromise = result[0];
        const subscriptionPromise = result[1];

        if (userDetailsPromise.status === "fulfilled") {
          const userDetailsData = userDetailsPromise.value as UserDetails | null
          console.log(userDetailsData)
          setUserDetails(userDetailsData);
        }
        if (subscriptionPromise.status === "fulfilled") {
          const subscriptionData = subscriptionPromise.value as Subscription | null;
          console.log(subscriptionData)
          setSubscription(subscriptionData);
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