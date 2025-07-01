export interface AccountConfig {
  showDetails: boolean;
  includeUsage: boolean;
}

export interface AccountDetails {
  email: string;
  plan: string;
  status: 'active' | 'inactive' | 'suspended';
  memberSince: string;
}

export interface UsageStatistics {
  apiCallsThisMonth: number;
  apiCallsLimit: number;
  imagesProcessed: number;
  creditsRemaining: number;
}

export interface AccountApiResponse {
  success: boolean;
  data?: {
    account: AccountDetails;
    usage: UsageStatistics;
  };
  error?: {
    detail: string;
    status_code: number;
    type: string;
  };
}
