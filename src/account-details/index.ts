import { showAccountDetails } from './action.js';

export async function accountDetails(): Promise<void> {
  await showAccountDetails();
}
