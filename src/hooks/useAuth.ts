import { useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth } from "../firebase/config";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 2. Track real-time active user sessions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        localStorage.setItem("mockLogged", "true");
      } else {
        localStorage.removeItem("mockLogged");
      }
      // Keep the global App.tsx router up-to-date
      window.dispatchEvent(new Event("mock_auth_update"));
    });

    return () => unsubscribe();
  }, []);

  // 3. Login handle linking to your "Access System" form submit
  const loginWithEmail = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem("mockLogged", "true");
      window.dispatchEvent(new Event("mock_auth_update"));
      return userCredential.user;
    } catch (error: any) {
      throw new Error(error.message || "Failed to access system.");
    }
  };

  // 4. Registration handle for creating operational profiles
  const registerWithEmail = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      localStorage.setItem("mockLogged", "true");
      window.dispatchEvent(new Event("mock_auth_update"));
      return userCredential.user;
    } catch (error: any) {
      throw new Error(error.message || "Failed to register profile.");
    }
  };

  // 5. Password Reset Handler
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message || "Failed to send reset link.");
    }
  };

  // 6. Logout Handler for clearing system credentials
  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("mockLogged");
      window.dispatchEvent(new Event("mock_auth_update"));
    } catch (error: any) {
      throw new Error(error.message || "Failed to terminate session.");
    }
  };

  return {
    user,
    loading,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    logout
  };
}