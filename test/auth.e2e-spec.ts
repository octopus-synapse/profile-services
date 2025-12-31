import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'Password123!',
    name: 'Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same pipes as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    app.setGlobalPrefix('api');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/auth/signup (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user).toHaveProperty('email', testUser.email);
          expect(res.body.user).toHaveProperty('hasCompletedOnboarding', false);
          authToken = res.body.token;
        });
    });

    it('should fail with duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(testUser)
        .expect(409);
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          name: 'Test',
        })
        .expect(400);
    });

    it('should fail with short password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: 'test2@example.com',
          password: '123',
          name: 'Test',
        })
        .expect(400);
    });
  });

  describe('/api/auth/login (POST)', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('email', testUser.email);
        });
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(401);
    });

    it('should fail with invalid password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });
  });

  describe('/api/auth/refresh (POST)', () => {
    it('should refresh token with valid JWT', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('token');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('should fail without authorization header', () => {
      return request(app.getHttpServer()).post('/api/auth/refresh').expect(401);
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/api/users/profile (GET)', () => {
    it('should get user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('email', testUser.email);
        });
    });

    it('should fail without authorization', () => {
      return request(app.getHttpServer()).get('/api/users/profile').expect(401);
    });
  });

  describe('Email Verification Flow', () => {
    let verificationToken: string;
    const verificationUser = {
      email: `verify-test-${Date.now()}@example.com`,
      password: 'Password123!',
      name: 'Verification Test User',
    };

    beforeAll(async () => {
      // Create a user for verification tests
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(verificationUser)
        .expect(201);
    });

    describe('/api/auth/request-verification (POST)', () => {
      it('should send verification email for existing user', () => {
        return request(app.getHttpServer())
          .post('/api/auth/request-verification')
          .send({ email: verificationUser.email })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('message');
            // In non-production, token is included in response
            if (res.body.token) {
              verificationToken = res.body.token;
            }
          });
      });

      it('should return success even for non-existent email (prevent enumeration)', () => {
        return request(app.getHttpServer())
          .post('/api/auth/request-verification')
          .send({ email: 'nonexistent@example.com' })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('success', true);
          });
      });

      it('should fail with invalid email format', () => {
        return request(app.getHttpServer())
          .post('/api/auth/request-verification')
          .send({ email: 'invalid-email' })
          .expect(400);
      });
    });

    describe('/api/auth/verify-email (POST)', () => {
      it('should verify email with valid token', async () => {
        // If we don't have token from previous test, request verification again
        if (!verificationToken) {
          const res = await request(app.getHttpServer())
            .post('/api/auth/request-verification')
            .send({ email: verificationUser.email });
          verificationToken = res.body.token;
        }

        return request(app.getHttpServer())
          .post('/api/auth/verify-email')
          .send({ token: verificationToken })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty(
              'message',
              'Email verified successfully',
            );
          });
      });

      it('should fail with invalid token', () => {
        return request(app.getHttpServer())
          .post('/api/auth/verify-email')
          .send({ token: 'invalid-token-12345' })
          .expect(400);
      });

      it('should fail with empty token', () => {
        return request(app.getHttpServer())
          .post('/api/auth/verify-email')
          .send({ token: '' })
          .expect(400);
      });
    });
  });

  describe('Password Reset Flow', () => {
    let resetToken: string;
    const resetUser = {
      email: `reset-test-${Date.now()}@example.com`,
      password: 'OldPassword123!',
      name: 'Reset Test User',
    };

    beforeAll(async () => {
      // Create a user for password reset tests
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(resetUser)
        .expect(201);
    });

    describe('/api/auth/forgot-password (POST)', () => {
      it('should send password reset email for existing user', () => {
        return request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: resetUser.email })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('message');
            // In non-production, token is included in response
            if (res.body.token) {
              resetToken = res.body.token;
            }
          });
      });

      it('should return success even for non-existent email (prevent enumeration)', () => {
        return request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: 'nonexistent@example.com' })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('success', true);
          });
      });

      it('should fail with invalid email format', () => {
        return request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: 'invalid-email' })
          .expect(400);
      });
    });

    describe('/api/auth/reset-password (POST)', () => {
      it('should reset password with valid token', async () => {
        // If we don't have token from previous test, request reset again
        if (!resetToken) {
          const res = await request(app.getHttpServer())
            .post('/api/auth/forgot-password')
            .send({ email: resetUser.email });
          resetToken = res.body.token;
        }

        const newPassword = 'NewPassword456!';

        return request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({ token: resetToken, password: newPassword })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty(
              'message',
              'Password reset successfully',
            );
          });
      });

      it('should be able to login with new password', () => {
        return request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: resetUser.email,
            password: 'NewPassword456!',
          })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('token');
          });
      });

      it('should fail with invalid token', () => {
        return request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({ token: 'invalid-token-12345', password: 'NewPassword789!' })
          .expect(400);
      });

      it('should fail with weak password', () => {
        return request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({ token: 'some-token', password: '123' })
          .expect(400);
      });
    });
  });

  describe('Change Password Flow', () => {
    let userToken: string;
    const changePasswordUser = {
      email: `change-pwd-${Date.now()}@example.com`,
      password: 'CurrentPassword123!',
      name: 'Change Password User',
    };

    beforeAll(async () => {
      // Create and login user
      const signupRes = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(changePasswordUser);
      userToken = signupRes.body.token;
    });

    describe('/api/auth/change-password (POST)', () => {
      it('should change password with valid current password', () => {
        return request(app.getHttpServer())
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            currentPassword: changePasswordUser.password,
            newPassword: 'UpdatedPassword456!',
          })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty(
              'message',
              'Password changed successfully',
            );
          });
      });

      it('should be able to login with new password', () => {
        return request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: changePasswordUser.email,
            password: 'UpdatedPassword456!',
          })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('success', true);
          });
      });

      it('should fail with incorrect current password', () => {
        return request(app.getHttpServer())
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            currentPassword: 'WrongPassword123!',
            newPassword: 'NewPassword789!',
          })
          .expect(401);
      });

      it('should fail without authentication', () => {
        return request(app.getHttpServer())
          .post('/api/auth/change-password')
          .send({
            currentPassword: 'CurrentPassword123!',
            newPassword: 'NewPassword789!',
          })
          .expect(401);
      });

      it('should fail with weak new password', () => {
        return request(app.getHttpServer())
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            currentPassword: 'UpdatedPassword456!',
            newPassword: '123',
          })
          .expect(400);
      });
    });
  });
});
