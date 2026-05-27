import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { createUserProfile, getUserRole } from "../services/userService";

const AuthContext = createContext({
  user: null,
  role: "",
  loading: true
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser || null);

      if (!currentUser) {
        setRole("");
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        await createUserProfile(currentUser, "customer");
        const currentRole = await getUserRole(currentUser.uid);
        setRole(currentRole || "customer");
      } catch {
        setRole("customer");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({ user, role, loading }), [user, role, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

