import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_APPLICATIONS } from '../data/mockData';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [applications, setApplications] = useState(INITIAL_APPLICATIONS);
  const [currentRole, setCurrentRole] = useState(null); // 'applicant' | 'bank_admin' | null
  const [currentUser, setCurrentUser] = useState(null);
  const [activeApplicationId, setActiveApplicationId] = useState('APP-2026-1102');
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize and listen to Supabase Auth State
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setAuthLoading(false);
      return;
    }

    setIsLiveConnected(true);

    // 1. Fetch current session on mount
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user) {
        syncUserProfile(initialSession.user);
      } else {
        setAuthLoading(false);
      }
    });

    // 2. Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await syncUserProfile(newSession.user);
      } else {
        setCurrentRole(null);
        setCurrentUser(null);
        setAuthLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Sync real profile and role from Supabase PostgreSQL tables
  const syncUserProfile = async (authUser) => {
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      // Fetch authentic role from user_roles table
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUser.id)
        .maybeSingle();

      const role = roleRow?.role || 'customer';
      const isStaff = ['underwriter', 'reviewer', 'super_admin'].includes(role);

      setCurrentRole(isStaff ? 'bank_admin' : 'applicant');
      setCurrentUser({
        id: authUser.id,
        name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        email: authUser.email,
        phone: profile?.phone || authUser.user_metadata?.phone,
        role: role,
        avatarInitials: (profile?.full_name || authUser.email).substring(0, 2).toUpperCase(),
        designation: isStaff ? 'Senior Credit Underwriter' : 'Mortgage Applicant'
      });
    } catch (err) {
      console.warn('Could not sync user profile from database:', err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    if (supabase && session) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      }
    }
    setSession(null);
    setCurrentRole(null);
    setCurrentUser(null);
  };

  const addApplication = (newApp) => {
    setApplications(prev => [newApp, ...prev]);
    setActiveApplicationId(newApp.id);
  };

  const updateApplication = (id, updates) => {
    setApplications(prev => prev.map(app => (app.id === id ? { ...app, ...updates } : app)));
  };

  const recordDecision = (appId, { outcome, remarks, sanctionedAmount, sanctionedRate, sanctionedTenureMonths }) => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + 
      ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    setApplications(prev => prev.map(app => {
      if (app.id !== appId) return app;

      const newStatus = outcome === 'APPROVE' ? 'approved' : outcome === 'REJECT' ? 'rejected' : 'under_review';
      const newTimelineItem = {
        date: formattedDate,
        title: outcome === 'APPROVE' ? 'Loan Sanctioned' : outcome === 'REJECT' ? 'Application Declined' : 'Underwriter Review Recorded',
        desc: remarks || `Decision recorded as ${outcome} by ${currentUser?.name || 'Underwriter'}.`
      };

      return {
        ...app,
        status: newStatus,
        finalDecision: {
          outcome,
          decisionType: 'Manual Underwriter Adjudication',
          sanctionedAmount: outcome === 'APPROVE' ? Number(sanctionedAmount) : 0,
          sanctionedRate: outcome === 'APPROVE' ? Number(sanctionedRate) : 0,
          sanctionedTenureMonths: outcome === 'APPROVE' ? Number(sanctionedTenureMonths) : 0,
          sanctionedEMI: outcome === 'APPROVE' ? Math.round(Number(sanctionedAmount) * 0.0086) : 0,
          decidedAt: now.toISOString(),
          reviewerName: currentUser?.name || 'Senior Underwriter',
          remarks
        },
        timeline: [newTimelineItem, ...app.timeline]
      };
    }));
  };

  const updateDocumentStatus = (appId, docId, newStatus, remarks) => {
    setApplications(prev => prev.map(app => {
      if (app.id !== appId) return app;
      const updatedDocs = app.documents.map(doc => {
        if (doc.id !== docId) return doc;
        return {
          ...doc,
          status: newStatus,
          remarks: remarks || doc.remarks
        };
      });
      return { ...app, documents: updatedDocs };
    }));
  };

  return (
    <AppContext.Provider
      value={{
        applications,
        currentRole,
        currentUser,
        activeApplicationId,
        isLiveConnected,
        session,
        authLoading,
        setActiveApplicationId,
        logout,
        addApplication,
        updateApplication,
        recordDecision,
        updateDocumentStatus
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
