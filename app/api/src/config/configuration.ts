export const configuration = () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL ?? '15m',
    refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL ?? '7d',
    audience: process.env.JWT_TOKEN_AUDIENCE ?? 'localhost',
    issuer: process.env.JWT_TOKEN_ISSUER ?? 'localhost',
    algorithm: 'HS256',
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
  },

  signing: {
    keyPath: process.env.SIGNING_KEY_PATH ?? './keys/signing.key',
    publicKeyPath: process.env.SIGNING_PUBLIC_KEY_PATH ?? './keys/signing.pub',
    keyPassphrase: process.env.SIGNING_KEY_PASSPHRASE,
    useVault: process.env.USE_VAULT === 'true',
    vaultAddress: process.env.VAULT_ADDR,
    vaultToken: process.env.VAULT_TOKEN,
  },

  app: {
    baseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3001',
    issuerDid: process.env.ISSUER_DID ?? 'did:web:localhost',
    issuerName:
      process.env.ISSUER_NAME ?? 'DHIS2 Server Certification Authority',
  },
});

export type AppConfig = ReturnType<typeof configuration>;
