
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, type User, getIdToken } from 'firebase/auth'; // Import getIdToken
import { doc, getDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  department: string;
  jobTitle : string;
  phone: string;
}

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isBirthdayToday: boolean; 
  getAuthToken: () => Promise<string | null>; // Add getAuthToken to the type
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBirthdayToday, setIsBirthdayToday] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserProfile({ uid: user.uid, name: data.name, email: data.email, role: data.role, avatarUrl: data.avatarUrl, department: data.department, jobTitle: data.jobTitle, phone: data.phone });
        } else {
            setUserProfile(null);
        }

        try {
            const usersCollection = collection(db, "users");
            const querySnapshot = await getDocs(usersCollection);
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentDay = today.getDate();
            
            let birthdayFound = false;
            for (const userDoc of querySnapshot.docs) {
                const userData = userDoc.data();
                if (userData.birthdate && userData.birthdate instanceof Timestamp) {
                    const birthdate = userData.birthdate.toDate();
                    if (birthdate.getMonth() === currentMonth && birthdate.getDate() === currentDay) {
                        birthdayFound = true;
                        break; 
                    }
                }
            }
            setIsBirthdayToday(birthdayFound);
        } catch (error) {
            console.error("Error checking for birthdays:", error);
            setIsBirthdayToday(false);
        }

        setLoading(false);
      } else {
        setUser(null);
        setUserProfile(null);
        setIsBirthdayToday(false); 
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Define the function to get the user's ID token
  const getAuthToken = async (): Promise<string | null> => {
    if (auth.currentUser) {
      try {
        const token = await getIdToken(auth.currentUser);
        return token;
      } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
      }
    }
    return null;
  };

  const value = { user, userProfile, loading, isBirthdayToday, getAuthToken }; // Add getAuthToken to the provider value

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
