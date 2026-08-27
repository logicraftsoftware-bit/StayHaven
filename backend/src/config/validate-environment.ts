const environments = new Set(['development', 'test', 'production']);

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const readString = (key: string, fallback = '') => {
    const value = environment[key];
    return typeof value === 'string' ? value : fallback;
  };
  const errors: string[] = [];
  const nodeEnv = readString('NODE_ENV', 'development');
  const port = Number(readString('PORT', '5000'));
  const mongodbUri = readString('MONGODB_URI').trim();
  const jwtSecret = readString('JWT_SECRET').trim();

  if (!environments.has(nodeEnv))
    errors.push('NODE_ENV must be development, test, or production');
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    errors.push('PORT must be an integer between 1 and 65535');
  if (!/^mongodb(\+srv)?:\/\//.test(mongodbUri))
    errors.push('MONGODB_URI must be a valid MongoDB connection string');
  if (jwtSecret.length < 32)
    errors.push('JWT_SECRET must contain at least 32 characters');

  if (errors.length)
    throw new Error(
      `Invalid environment configuration:\n- ${errors.join('\n- ')}`,
    );

  return {
    ...environment,
    NODE_ENV: nodeEnv,
    PORT: String(port),
    MONGODB_URI: mongodbUri,
    JWT_SECRET: jwtSecret,
  };
}
