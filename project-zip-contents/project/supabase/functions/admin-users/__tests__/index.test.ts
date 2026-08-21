import { describe, it, expect } from 'vitest';
import { mapAuthError, json, handleRequest } from '../index';

describe('mapAuthError', () => {
  it('maps weak password messages', () => {
    expect(mapAuthError('weak password')).toContain('كلمة المرور ضعيفة');
    expect(mapAuthError('Password too weak')).toContain('كلمة المرور ضعيفة');
  });
  it('maps already registered messages', () => {
    expect(mapAuthError('already registered')).toContain('هذا البريد مسجّل بالفعل');
  });
  it('maps user not found', () => {
    expect(mapAuthError('User not found')).toContain('المستخدم غير موجود');
  });
});

describe('json helper', () => {
  it('returns a Response with JSON content and CORS headers', () => {
    const res: any = json({ ok: true }, 201) as any;
    expect(res.status).toBe(201);
    expect(res.headers.get('content-type')).toMatch(/application\/json/i);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});

describe('handleRequest (bootstrap)', () => {
  it('creates a new admin when none exist', async () => {
    const mockFetch = async (url: string, opts?: any) => {
      return {
        ok: true,
        json: async () => ({ users: [] }),
      } as any;
    };

    const createClientMock = (_url: any, _key: any, _opts: any) => {
      return {
        auth: {
          admin: {
            createUser: async ({ email, password }: any) => ({ data: { user: { id: 'new-user-id' } }, error: null }),
            updateUserById: async () => ({ error: null }),
            deleteUser: async () => ({ error: null }),
          },
        },
        from: (_table: string) => ({
          upsert: async (_row: any) => ({ data: null }),
          select: async () => ({ data: null }),
        }),
      } as any;
    };

    const req = {
      method: 'POST',
      url: 'https://example.test/?action=bootstrap',
      headers: { get: (_: string) => null },
      json: async () => ({ email: 'admin@example.test', password: 'Str0ngP@ss' }),
    } as any;

    const res: any = await handleRequest(req, { SUPABASE_URL: 'https://supabase.test', SUPABASE_SERVICE_ROLE_KEY: 'sk' }, mockFetch, createClientMock);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body).toHaveProperty('id', 'new-user-id');
    expect(body).toHaveProperty('role', 'admin');
  });
});
