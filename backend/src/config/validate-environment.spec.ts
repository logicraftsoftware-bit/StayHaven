import { validateEnvironment } from './validate-environment';

describe('environment validation', () => {
  it('normalizes valid configuration', () => {
    expect(
      validateEnvironment({
        NODE_ENV: 'production',
        PORT: '5000',
        MONGODB_URI: 'mongodb://localhost:27017/app',
        JWT_SECRET: 'a-secure-secret-with-at-least-32-characters',
      }),
    ).toEqual(
      expect.objectContaining({ NODE_ENV: 'production', PORT: '5000' }),
    );
  });

  it('reports all missing critical settings before startup', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow(
      /MONGODB_URI.*JWT_SECRET/s,
    );
  });
});
