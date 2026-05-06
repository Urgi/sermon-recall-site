import type { User } from '@supabase/supabase-js';

export type UserRole = 'member' | 'pastor' | 'admin';

export type UserProfile = {
  id: string;
  church_id: string | null;
  full_name: string | null;
  role: UserRole;
};

export type ChurchSummary = {
  id: string;
  name: string;
  church_code: string;
};

export type AuthContext = {
  user: Pick<User, 'id' | 'email'>;
  profile: UserProfile;
};

export function canManageSermons(role: UserRole): boolean {
  return role === 'pastor' || role === 'admin';
}
