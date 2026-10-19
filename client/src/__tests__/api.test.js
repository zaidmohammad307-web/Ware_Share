import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({
  get: vi.fn(() => Promise.resolve({ data: {} })),
  post: vi.fn(() => Promise.resolve({ data: {} })),
  put: vi.fn(() => Promise.resolve({ data: {} })),
  patch: vi.fn(() => Promise.resolve({ data: {} })),
  delete: vi.fn(() => Promise.resolve({ data: {} })),
}));
vi.mock('@/utils/axios', () => ({ default: http }));

import { authApi, bookingsApi, chatApi, placesApi, usersApi } from '@/api';

describe('api module', () => {
  beforeEach(() => vi.clearAllMocks());

  it('logs out with POST, not GET', async () => {
    await authApi.logout();
    expect(http.post).toHaveBeenCalledWith('/users/logout');
    expect(http.get).not.toHaveBeenCalled();
  });

  it('builds booking status URLs', async () => {
    await bookingsApi.updateStatus('b1', { status: 'approved' });
    expect(http.put).toHaveBeenCalledWith('/bookings/b1/status', { status: 'approved' });
  });

  it('passes renterId as a query param only when given', async () => {
    await chatApi.placeThread('p1', 'r1');
    expect(http.get).toHaveBeenLastCalledWith('/chat/place/p1', { params: { renterId: 'r1' } });
    await chatApi.placeThread('p1', null);
    expect(http.get).toHaveBeenLastCalledWith('/chat/place/p1', { params: undefined });
  });

  it('sends uploads as multipart', async () => {
    const fd = {};
    await usersApi.uploadPicture(fd);
    expect(http.post.mock.calls[0][2].headers['Content-Type']).toBe('multipart/form-data');
    await placesApi.remove('p9');
    expect(http.delete).toHaveBeenCalledWith('/places/p9');
  });
});
