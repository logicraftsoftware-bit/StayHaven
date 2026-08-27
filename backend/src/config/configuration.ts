export default () => ({
  port: parseInt(process.env.PORT || '5000', 10),
  mongodbUri: process.env.MONGODB_URI,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  frontendUrls: [
    'https://stay-haven-red.vercel.app',
    ...(process.env.FRONTEND_URL || '').split(','),
  ]
    .map((x) => x.trim())
    .filter(Boolean),
});
