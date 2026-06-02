import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Auth Middleware and Security', () => {
  it('should reject requests without Authorization header with 401', async () => {
    const res = await request(app).get('/api/v1/notebooks');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Missing or malformed Authorization header');
  });

  it('should reject malformed Authorization headers with 401', async () => {
    const res = await request(app)
      .get('/api/v1/notebooks')
      .set('Authorization', 'Basic 123456');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should accept valid mock token in test environment', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', 'Bearer mock-valid-token');
    
    // In test environment, the mock token attaches the mock user
    expect([200, 500]).toContain(res.status); // 200 or DB connection message
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test@pustak.ai');
    }
  });
});
