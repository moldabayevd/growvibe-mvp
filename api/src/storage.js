import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { Client as MinioClient } from 'minio'
import { config } from './config.js'

const driver = config.storage.driver

const makeKey = (originalName = '') => {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '')
  return `${Date.now()}-${randomUUID()}${ext}`
}

const buildPublicUrl = (key) => `/uploads/${encodeURIComponent(key)}`

let minioClient = null
let minioReady = null

const getMinioClient = () => {
  if (!minioClient) {
    minioClient = new MinioClient({
      endPoint: config.storage.minio.endpoint,
      port: config.storage.minio.port,
      useSSL: config.storage.minio.useSSL,
      accessKey: config.storage.minio.accessKey,
      secretKey: config.storage.minio.secretKey,
    })
  }
  return minioClient
}

const ensureMinioBucket = async () => {
  if (minioReady) return minioReady
  minioReady = (async () => {
    const client = getMinioClient()
    const bucket = config.storage.minio.bucket
    const exists = await client.bucketExists(bucket).catch(() => false)
    if (!exists) {
      await client.makeBucket(bucket, config.storage.minio.region || 'us-east-1')
    }
  })().catch((err) => {
    minioReady = null
    throw err
  })
  return minioReady
}

export const initStorage = async () => {
  if (driver === 'minio') {
    await ensureMinioBucket()
    console.log(`[storage] minio ready: bucket=${config.storage.minio.bucket}`)
  } else {
    await fs.mkdir(config.uploadDir, { recursive: true })
    console.log(`[storage] local ready: dir=${config.uploadDir}`)
  }
}

export const putReceipt = async ({ buffer, originalName, mimetype }) => {
  const key = makeKey(originalName)
  if (driver === 'minio') {
    await ensureMinioBucket()
    await getMinioClient().putObject(
      config.storage.minio.bucket,
      key,
      buffer,
      buffer.length,
      { 'Content-Type': mimetype || 'application/octet-stream' },
    )
  } else {
    await fs.mkdir(config.uploadDir, { recursive: true })
    await fs.writeFile(path.join(config.uploadDir, key), buffer)
  }
  return { key, url: buildPublicUrl(key) }
}

export const getReceipt = async (key) => {
  if (!key || key.includes('/') || key.includes('..')) {
    const err = new Error('Invalid receipt key')
    err.statusCode = 400
    throw err
  }
  if (driver === 'minio') {
    await ensureMinioBucket()
    const stat = await getMinioClient().statObject(config.storage.minio.bucket, key).catch(() => null)
    if (!stat) {
      const err = new Error('Receipt not found')
      err.statusCode = 404
      throw err
    }
    const stream = await getMinioClient().getObject(config.storage.minio.bucket, key)
    return {
      stream,
      contentType: stat.metaData?.['content-type'] || 'application/octet-stream',
      size: stat.size,
    }
  }
  const filePath = path.join(config.uploadDir, key)
  const stat = await fs.stat(filePath).catch(() => null)
  if (!stat) {
    const err = new Error('Receipt not found')
    err.statusCode = 404
    throw err
  }
  return { stream: createReadStream(filePath), contentType: undefined, size: stat.size }
}
