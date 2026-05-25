import 'dotenv/config'
import path from 'node:path'

const splitOrigins = (value) =>
  value
    ? value.split(',').map((item) => item.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174']

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL,
  adminToken: process.env.ADMIN_TOKEN || 'change-me-admin-token',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin12345',
  sessionSecret: process.env.SESSION_SECRET || process.env.ADMIN_TOKEN || 'change-me-session-secret',
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS || 12 * 60 * 60),
  corsOrigins: splitOrigins(process.env.CORS_ORIGINS),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  storage: {
    driver: (process.env.STORAGE_DRIVER || 'local').toLowerCase() === 'minio' ? 'minio' : 'local',
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'minio',
      port: Number(process.env.MINIO_PORT || 9000),
      useSSL: String(process.env.MINIO_USE_SSL || 'false').toLowerCase() === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'growvibe',
      secretKey: process.env.MINIO_SECRET_KEY || 'growvibe-secret',
      bucket: process.env.MINIO_BUCKET || 'receipts',
      region: process.env.MINIO_REGION || 'us-east-1',
    },
  },
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  litellmBaseUrl: process.env.LITELLM_BASE_URL || '',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:4000',
  kaspiPhone: process.env.KASPI_PHONE || '+7 (777) 000-00-00',
  kaspiAmount: Number(process.env.KASPI_AMOUNT || 50000),
  whatsapp: {
    token: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'growvibe-webhook-token',
    graphVersion: process.env.WHATSAPP_GRAPH_VERSION || 'v24.0',
    templates: {
      applicationReceived: process.env.WHATSAPP_TEMPLATE_APPLICATION_RECEIVED || '',
      proofReceived: process.env.WHATSAPP_TEMPLATE_PROOF_RECEIVED || '',
      paymentVerified: process.env.WHATSAPP_TEMPLATE_PAYMENT_VERIFIED || '',
      reminder24h: process.env.WHATSAPP_TEMPLATE_REMINDER_24H || '',
      reminder3h: process.env.WHATSAPP_TEMPLATE_REMINDER_3H || '',
    },
  },
}
