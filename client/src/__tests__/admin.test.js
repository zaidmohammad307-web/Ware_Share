import { describe, expect, it } from 'vitest';
import { isAdminUser } from '@/utils/admin';

describe('isAdminUser', () => {
  it('trusts the isAdmin flag from the API', () => {
    expect(isAdminUser({ email: 'x@y.com', isAdmin: true })).toBe(true);
    expect(isAdminUser({ email: 'x@y.com', isAdmin: false })).toBe(false);
  });

  it('has no hardcoded admin email fallback', () => {
    expect(isAdminUser({ email: 'admin@123456' })).toBe(false);
  });

  it('returns false when logged out', () => {
    expect(isAdminUser(null)).toBe(false);
  });
});
