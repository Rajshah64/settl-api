import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';

import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';

jest.setTimeout(20000);

const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;

describe('Auth E2E', () => {
  let app: INestApplication;
  let server: any;
  let userRepo: Repository<User>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    // Ensure validation rules match production config used by the app
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    await app.init();
    server = app.getHttpServer();

    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // keep tests isolated
    await userRepo.delete({});
  });

  // Helpers
  function uniqueEmail() {
    return `test+${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
  }

  async function registerUser(payload: any) {
    return request(server).post('/auth/register').send(payload);
  }

  async function loginUser(payload: any) {
    return request(server).post('/auth/login').send(payload);
  }

  async function authGetMe(token: string) {
    return request(server).get('/auth/me').set('Authorization', `Bearer ${token}`);
  }

  function extractJwtFromBody(body: any): string | undefined {
    if (!body) return undefined;
    const values = Object.values(body);
    for (const v of values) {
      if (typeof v === 'string' && jwtRegex.test(v)) return v;
      if (v && typeof v === 'object') {
        // shallow search
        for (const vv of Object.values(v)) {
          if (typeof vv === 'string' && jwtRegex.test(vv)) return vv;
        }
      }
    }
    return undefined;
  }

  /** REGISTER tests */
  describe('POST /auth/register', () => {
    it('successful registration returns JWT and creates user', async () => {
      const email = uniqueEmail();
      const payload = { firstName: 'Alice', lastName: 'Smith', email, password: 'Str0ngP@ssw0rd' };

      const res = await registerUser(payload);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);

      const token = extractJwtFromBody(res.body);
      expect(token).toBeDefined();
      expect(jwtRegex.test(token as string)).toBe(true);

      // DB record created
      const user = await userRepo.findOne({ where: { email } });
      expect(user).toBeDefined();
      // Ensure stored password is not plaintext
      expect((user as any).password).toBeDefined();
      expect((user as any).password).not.toBe(payload.password);

      // Ensure response does not leak password
      expect(res.body).not.toHaveProperty('password');
      if (res.body.user) expect(res.body.user).not.toHaveProperty('password');
    });

    it('duplicate email returns 409 and does not create second user', async () => {
      const email = uniqueEmail();
      const payload = { firstName: 'Bob', lastName: 'Jones', email, password: 'Password1!' };

      const first = await registerUser(payload);
      expect(first.status).toBeGreaterThanOrEqual(200);

      const second = await registerUser(payload);
      expect(second.status).toBe(409);
      expect(second.body).toBeDefined();
      expect(typeof second.body.message === 'string' || Array.isArray(second.body.message)).toBe(true);

      const count = await userRepo.count({ where: { email } });
      expect(count).toBe(1);
    });

    it('missing firstName -> 400', async () => {
      const res = await registerUser({ lastName: 'X', email: uniqueEmail(), password: 'P@ssw0rd' });
      expect(res.status).toBe(400);
      expect(res.body).toBeDefined();
    });

    it('missing lastName -> 400', async () => {
      const res = await registerUser({ firstName: 'X', email: uniqueEmail(), password: 'P@ssw0rd' });
      expect(res.status).toBe(400);
    });

    it('missing email -> 400', async () => {
      const res = await registerUser({ firstName: 'X', lastName: 'Y', password: 'P@ssw0rd' });
      expect(res.status).toBe(400);
    });

    it('missing password -> 400', async () => {
      const res = await registerUser({ firstName: 'X', lastName: 'Y', email: uniqueEmail() });
      expect(res.status).toBe(400);
    });

    it('invalid email format -> 400', async () => {
      const res = await registerUser({ firstName: 'X', lastName: 'Y', email: 'invalid-email', password: 'P@ssw0rd' });
      expect(res.status).toBe(400);
    });

    it('password shorter than minimum -> 400', async () => {
      const res = await registerUser({ firstName: 'X', lastName: 'Y', email: uniqueEmail(), password: '123' });
      expect(res.status).toBe(400);
    });

    it('extra property (role) -> 400 due to whitelist/forbidNonWhitelisted', async () => {
      const res = await registerUser({ firstName: 'X', lastName: 'Y', email: uniqueEmail(), password: 'P@ssw0rd', role: 'admin' });
      expect(res.status).toBe(400);
      // ensure no user created
      const count = await userRepo.count();
      expect(count).toBe(0);
    });

    it('empty strings -> 400', async () => {
      const res = await registerUser({ firstName: '', lastName: '', email: '', password: '' });
      expect(res.status).toBe(400);
    });

    it('invalid data types -> 400', async () => {
      const res = await registerUser({ firstName: 123, lastName: true, email: [], password: {} });
      expect(res.status).toBe(400);
    });
  });

  /** LOGIN tests */
  describe('POST /auth/login', () => {
    it('successful login returns JWT', async () => {
      const email = uniqueEmail();
      const password = 'S3cureP@ss';
      await registerUser({ firstName: 'L', lastName: 'M', email, password });

      const res = await loginUser({ email, password });
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      const token = extractJwtFromBody(res.body);
      expect(token).toBeDefined();
    });

    it('wrong password -> 401', async () => {
      const email = uniqueEmail();
      await registerUser({ firstName: 'L', lastName: 'M', email, password: 'RightPass1' });

      const res = await loginUser({ email, password: 'WrongPass' });
      expect(res.status).toBe(401);
    });

    it('non-existing email -> 401', async () => {
      const res = await loginUser({ email: uniqueEmail(), password: 'DoesntMatter1' });
      expect(res.status).toBe(401);
    });

    it('invalid email format -> 400', async () => {
      const res = await loginUser({ email: 'notanemail', password: 'abc' });
      expect(res.status).toBe(400);
    });

    it('missing email -> 400', async () => {
      const res = await loginUser({ password: 'abc' });
      expect(res.status).toBe(400);
    });

    it('missing password -> 400', async () => {
      const res = await loginUser({ email: uniqueEmail() });
      expect(res.status).toBe(400);
    });

    it('empty strings -> 400', async () => {
      const res = await loginUser({ email: '', password: '' });
      expect(res.status).toBe(400);
    });

    it('invalid data types -> 400', async () => {
      const res = await loginUser({ email: {}, password: [] });
      expect(res.status).toBe(400);
    });
  });

  /** PROTECTED route tests */
  describe('GET /auth/me', () => {
    it('valid JWT returns authenticated user', async () => {
      const email = uniqueEmail();
      const password = 'S3cureP@ss';
      const reg = await registerUser({ firstName: 'Me', lastName: 'User', email, password });
      const token = extractJwtFromBody(reg.body) as string;
      expect(token).toBeDefined();

      const res = await authGetMe(token);
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      // returned user should match
      const returnedEmail = res.body.email ?? res.body.user?.email;
      expect(returnedEmail).toBe(email);
      // ensure password/hash not returned
      expect(res.body).not.toHaveProperty('password');
      if (res.body.user) expect(res.body.user).not.toHaveProperty('password');
    });

    it('missing Authorization header -> 401', async () => {
      const res = await request(server).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('invalid JWT -> 401', async () => {
      const email = uniqueEmail();
      const password = 'S3cureP@ss';
      const reg = await registerUser({ firstName: 'A', lastName: 'B', email, password });
      const token = extractJwtFromBody(reg.body) as string;
      const bad = token + 'corrupt';
      const res = await authGetMe(bad);
      expect(res.status).toBe(401);
    });

    it('malformed JWT -> 401', async () => {
      const res = await request(server).get('/auth/me').set('Authorization', 'Bearer not.a.jwt');
      expect(res.status).toBe(401);
    });

    it('expired JWT -> 401', async () => {
      const email = uniqueEmail();
      const password = 'S3cureP@ss';
      const reg = await registerUser({ firstName: 'E', lastName: 'X', email, password });
      const user = await userRepo.findOne({ where: { email } });
      expect(user).toBeDefined();

      const secret = process.env.JWT_SECRET || 'test-jwt-secret';
      const payload = { sub: (user as any).id, email };
      // produce a token with exp in the past
      const expired = jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) - 60 }, secret);

      const res = await authGetMe(expired);
      expect(res.status).toBe(401);
    });

    it('JWT signed with different secret -> 401', async () => {
      const email = uniqueEmail();
      const password = 'S3cureP@ss';
      const reg = await registerUser({ firstName: 'S', lastName: 'E', email, password });
      const user = await userRepo.findOne({ where: { email } });
      expect(user).toBeDefined();

      const secret = (process.env.JWT_SECRET || 'test-jwt-secret') + '-different';
      const token = jwt.sign({ sub: (user as any).id, email, exp: Math.floor(Date.now() / 1000) + 3600 }, secret);

      const res = await authGetMe(token);
      expect(res.status).toBe(401);
    });
  });

  /** Additional safety checks */
  describe('Safety and conventions', () => {
    it('invalid client input never returns 500 or stack traces', async () => {
      const res = await registerUser({ email: 'invalid', password: '' });
      // expect a validation error (400) not a server error
      expect(res.status).not.toBe(500);
      expect(res.body).toBeDefined();
      expect(res.body).not.toHaveProperty('stack');
    });

    it('register does not create record for invalid request', async () => {
      const email = uniqueEmail();
      const res = await registerUser({ email, password: '' });
      expect(res.status).toBe(400);

      const found = await userRepo.findOne({ where: { email } });
      expect(found).toBeNull();
    });
  });
});
