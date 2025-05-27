import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';

export default function PrivateRoute({ children }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_, s) =>
      setSession(!!s)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === null) return <div>Loading...</div>;
  return session ? children : <Navigate to="/login" replace />;
}
