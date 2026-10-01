import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import { db } from '../db';

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface BusinessProfile {
  id: string;
  name: string;
  ownerId: string;
  businessType?: string;
  phone?: string;
  email?: string;
  role: 'owner' | 'admin' | 'member';
}

export async function signUpWithPassword(email: string, password: string, businessName: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Cloud mode is currently not configured. Using local mode.');
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Sign up failed: no user returned.');

  // Create initial business record for this user if signup succeeded
  const businessId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Insert business
  const { error: bizError } = await client.from('businesses').insert({
    id: businessId,
    owner_id: data.user.id,
    name: businessName.trim() || 'My Business',
    currency: 'INR',
    tax_settings: '18',
    created_at: now,
    updated_at: now,
  });

  if (bizError) {
    console.error('Failed to create cloud business record:', bizError);
  } else {
    // Insert business_members
    await client.from('business_members').insert({
      business_id: businessId,
      user_id: data.user.id,
      role: 'owner',
      created_at: now,
    });

    // Create free subscription record
    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 10); // 10 years free tier

    await client.from('subscriptions').insert({
      user_id: data.user.id,
      business_id: businessId,
      plan_id: 'free',
      status: 'active',
      billing_cycle: 'monthly',
      current_period_start: now,
      current_period_end: periodEnd.toISOString(),
    });
  }

  return { user: data.user, session: data.session, businessId };
}

export async function signInWithPassword(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Cloud mode is currently not configured. Using local mode.');
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const client = getSupabaseClient();
  if (client) {
    await client.auth.signOut();
  }
}

export async function sendPasswordResetEmail(email: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Cloud mode is currently not configured.');
  }

  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/account` : undefined,
  });

  if (error) throw error;
}

export async function updateAccountPassword(newPassword: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Cloud mode is currently not configured.');
  }

  const { data, error } = await client.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
  return data;
}

export async function fetchUserBusiness(userId: string): Promise<BusinessProfile | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data: memberData, error: memberError } = await client
      .from('business_members')
      .select('business_id, role, businesses(*)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (memberError || !memberData) {
      // Fallback: check businesses where owner_id = userId
      const { data: bizData } = await client
        .from('businesses')
        .select('*')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle();

      if (bizData) {
        return {
          id: bizData.id,
          name: bizData.name,
          ownerId: bizData.owner_id || userId,
          businessType: bizData.business_type || undefined,
          phone: bizData.phone || undefined,
          email: bizData.email || undefined,
          role: 'owner',
        };
      }
      return null;
    }

    const biz = (memberData as any).businesses;
    return {
      id: memberData.business_id,
      name: biz?.name || 'My Business',
      ownerId: biz?.owner_id || userId,
      businessType: biz?.business_type || undefined,
      phone: biz?.phone || undefined,
      email: biz?.email || undefined,
      role: memberData.role as 'owner' | 'admin' | 'member',
    };
  } catch (err) {
    console.error('Failed to fetch user business profile:', err);
    return null;
  }
}
