import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { normalizeAuthErrorMessage } from './authErrors';

export async function signUp(email: string, password: string, options?: { freeSignup?: boolean; demoPassword?: string }) {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      freeSignup: options?.freeSignup === true,
      demoPassword: options?.demoPassword || undefined,
    }),
  });

  const payload = await response.json().catch(() => null);
  const normalizedMessage = normalizeAuthErrorMessage(
    payload && typeof payload === 'object' && 'error' in payload ? payload.error : null,
    payload?.error || 'Failed to create account.',
  );

  if (!response.ok || !payload?.ok) {
    return {
      data: { user: null, session: null },
      error: {
        message: normalizedMessage,
      },
    };
  }

  return {
    data: { user: null, session: null },
    error: null,
  };
}

export async function verifyDemoAccess(password: string) {
  const response = await fetch('/api/auth/demo-access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    return {
      ok: false,
      error: payload?.error || 'Invalid password.',
    };
  }

  return {
    ok: true,
    error: null,
  };
}

export async function signIn(email: string, password: string) {
  try {
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (result.error) {
      return {
        ...result,
        error: {
          ...result.error,
          message: normalizeAuthErrorMessage(result.error, result.error.message || 'Failed to sign in.'),
        },
      };
    }

    return result;
  } catch (error) {
    return {
      data: { user: null, session: null },
      error: {
        message: normalizeAuthErrorMessage(error, 'Failed to sign in.'),
      },
    };
  }
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function updateUserMetadata(metadata: Record<string, unknown>) {
  return supabase.auth.updateUser({
    data: metadata,
  });
}

export async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    return data.session;
  } catch (error) {
    throw new Error(normalizeAuthErrorMessage(error, 'Failed to get auth session.'));
  }
}

export async function getUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    return data.user;
  } catch (error) {
    throw new Error(normalizeAuthErrorMessage(error, 'Failed to get user.'));
  }
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => data.subscription.unsubscribe();
}
