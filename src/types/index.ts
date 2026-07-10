export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  platform: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Script {
  id: string;
  project_id: string;
  name: string;
  content: string;
  obfuscated_content?: string;
  obfuscation_level?: string;
  requires_key: boolean;
  file_name?: string;
  version: number;
  ffa: boolean;
  silent: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserKey {
  id: string;
  project_id: string;
  user_key: string;
  identifier: string | null;
  discord_id: string | null;
  auth_expire: number;
  key_days: number | null;
  note: string;
  banned: boolean;
  ban_reason: string;
  total_executions: number;
  last_execution: string | null;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  api_key: string;
  name: string;
  ip_whitelist: string[];
  enabled: boolean;
  last_used: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalProjects: number;
  totalScripts: number;
  totalKeys: number;
  activeKeys: number;
}

export type PlanType = 'free' | 'pro' | 'premium';
export type PaymentMethod = 'paypal' | 'crypto';
export type PurchaseStatus = 'pending' | 'approved' | 'rejected';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanType;
  status: SubscriptionStatus;
  starts_at: string;
  expires_at: string | null;
  trial_used: boolean;
  trial_fingerprint: string | null;
  created_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  plan: PlanType;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  crypto_address: string | null;
  crypto_amount: string | null;
  proof_url: string | null;
  transaction_id: string | null;
  status: PurchaseStatus;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface IpLog {
  id: string;
  user_id: string | null;
  ip_address: string;
  user_agent: string | null;
  action: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  active: boolean;
  created_at: string;
}

export const PLAN_FEATURES: Record<PlanType, {
  projects: number | 'unlimited';
  scripts: number | 'unlimited';
  keys: number | 'unlimited';
  vmObfuscation: string;
  hwidLocking: boolean;
  apiAccess: boolean;
  scriptVersions: number | 'unlimited';
  discordBot: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
  analytics: string;
  webhooks: boolean;
  teamAccess: boolean;
}> = {
  free: {
    projects: 1,
    scripts: 2,
    keys: 25,
    vmObfuscation: 'Basic only',
    hwidLocking: false,
    apiAccess: false,
    scriptVersions: 1,
    discordBot: false,
    customBranding: false,
    prioritySupport: false,
    analytics: 'Basic',
    webhooks: false,
    teamAccess: false,
  },
  pro: {
    projects: 5,
    scripts: 15,
    keys: 1000,
    vmObfuscation: 'Full (register VM)',
    hwidLocking: true,
    apiAccess: true,
    scriptVersions: 5,
    discordBot: true,
    customBranding: false,
    prioritySupport: true,
    analytics: 'Advanced',
    webhooks: false,
    teamAccess: false,
  },
  premium: {
    projects: 'unlimited',
    scripts: 'unlimited',
    keys: 10000,
    vmObfuscation: 'Full + anti-tamper',
    hwidLocking: true,
    apiAccess: true,
    scriptVersions: 'unlimited',
    discordBot: true,
    customBranding: true,
    prioritySupport: true,
    analytics: 'Advanced + export',
    webhooks: true,
    teamAccess: true,
  },
};

export const PLAN_PRICES: Record<Exclude<PlanType, 'free'>, { usd: number; ltc: string }> = {
  pro: { usd: 15, ltc: '0.12' },
  premium: { usd: 30, ltc: '0.24' },
};
