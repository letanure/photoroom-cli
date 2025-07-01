export type ActionType = 'remove-bg' | 'account' | 'image-editing';

export interface BaseApiError {
  detail: string;
  status_code: number;
  type: string;
}

export interface ForbiddenError extends BaseApiError {
  status_code: 403;
  type: 'forbidden' | 'invalid_api_key' | 'insufficient_permissions' | 'plan_limit_exceeded';
}
