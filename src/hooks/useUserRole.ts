import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export type UserRole = 'admin' | 'manager' | 'cashier' | 'inventory';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  storeId?: string;
  photoURL?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useUserRole() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      setIsManager(false);
      setLoading(false);
      return;
    }

    loadUserProfile();
  }, [user]);

  async function loadUserProfile() {
    if (!user) return;

    try {
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));

      if (profileDoc.exists()) {
        const data = profileDoc.data() as UserProfile;
        setProfile({ id: profileDoc.id, ...data });
        setIsAdmin(data.role === 'admin');
        setIsManager(data.role === 'manager' || data.role === 'admin');
      } else {
        const masterEmail = 'crisdoraodxb@gmail.com';
        const isFirstUser = user.email === masterEmail;

        const newProfile: UserProfile = {
          id: user.uid,
          email: user.email || '',
          displayName: user.email?.split('@')[0] || 'Usuario',
          role: isFirstUser ? 'admin' : 'cashier',
          active: isFirstUser,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setProfile(newProfile);
        setIsAdmin(isFirstUser);
        setIsManager(isFirstUser);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  }

  function hasPermission(requiredRole: UserRole): boolean {
    if (!profile) return false;

    const roleHierarchy: Record<UserRole, number> = {
      admin: 4,
      manager: 3,
      inventory: 2,
      cashier: 1,
    };

    return roleHierarchy[profile.role] >= roleHierarchy[requiredRole];
  }

  return {
    profile,
    loading,
    isAdmin,
    isManager,
    hasPermission,
    reload: loadUserProfile,
  };
}
