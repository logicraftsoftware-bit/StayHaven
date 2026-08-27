export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongodbUri: process.env.MONGODB_URI,
  dnsServers: (process.env.DNS_SERVERS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  frontendUrls: (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean),
});
