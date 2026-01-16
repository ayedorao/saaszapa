import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Profile, UserRole } from '../types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  roles: UserRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (roleName: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await loadUserData(user.uid);
      } else {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function loadUserData(userId: string) {
    try {
      const profileRef = doc(db, 'profiles', userId);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        setProfile({ id: profileSnap.id, ...profileSnap.data() } as Profile);
      }

      const userRolesQuery = query(
        collection(db, 'user_roles'),
        where('user_id', '==', userId)
      );
      const userRolesSnap = await getDocs(userRolesQuery);

      const rolesData: UserRole[] = [];
      for (const docSnap of userRolesSnap.docs) {
        const roleData = docSnap.data();
        const roleRef = doc(db, 'roles', roleData.role_id);
        const roleSnap = await getDoc(roleRef);

        if (roleSnap.exists()) {
          rolesData.push({
            id: docSnap.id,
            user_id: roleData.user_id,
            role_id: roleData.role_id,
            role: { id: roleSnap.id, ...roleSnap.data() } as any,
            assigned_at: roleData.assigned_at,
            assigned_by: roleData.assigned_by
          });
        }
      }

      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    try {
      await addDoc(collection(db, 'login_logs'), {
        user_id: userCredential.user.uid,
        user_email: userCredential.user.email,
        timestamp: new Date().toISOString(),
        ip_address: '',
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Error logging login:', error);
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, 'profiles', user.uid), {
      email,
      full_name: fullName,
      phone: null,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const rolesQuery = query(
      collection(db, 'roles'),
      where('name', '==', 'Cashier')
    );
    const rolesSnap = await getDocs(rolesQuery);

    if (!rolesSnap.empty) {
      const cashierRole = rolesSnap.docs[0];
      await setDoc(doc(collection(db, 'user_roles')), {
        user_id: user.uid,
        role_id: cashierRole.id,
        assigned_at: new Date().toISOString(),
        assigned_by: null
      });
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  function hasRole(roleName: string): boolean {
    return roles.some(ur => ur.role?.name === roleName);
  }

  function hasPermission(permission: string): boolean {
    return roles.some(ur =>
      ur.role?.permissions?.includes('all') ||
      ur.role?.permissions?.includes(permission)
    );
  }

  const value = {
    user,
    profile,
    roles,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
