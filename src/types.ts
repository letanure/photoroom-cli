export type ActionType = 'remove-bg' | 'account' | 'image-editing' | 'api-keys';

export interface BaseApiError {
  detail?: string;
  message?: string;
  status_code?: number;
  type?: string;
  error?: {
    message?: string;
    detail?: string;
  };
}

export interface ForbiddenError extends BaseApiError {
  status_code: 403;
  type: 'forbidden' | 'invalid_api_key' | 'insufficient_permissions' | 'plan_limit_exceeded';
}
