import { config } from './config.js'

const graphBase = () => `https://graph.facebook.com/${config.whatsapp.graphVersion}`

const hasWhatsAppCredentials = () => Boolean(config.whatsapp.token && config.whatsapp.phoneNumberId)

const graphFetch = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.whatsapp.token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : {}
  if (!response.ok) {
    const message = data?.error?.message || `WhatsApp API error ${response.status}`
    throw new Error(message)
  }
  return data
}

export const sendTextMessage = async ({ to, body }) => {
  if (!hasWhatsAppCredentials()) {
    return { skipped: true, reason: 'WhatsApp credentials are not configured' }
  }

  return graphFetch(`${graphBase()}/${config.whatsapp.phoneNumberId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body },
    }),
  })
}

export const sendTemplateMessage = async ({ to, templateName, language = 'ru', parameters = [] }) => {
  if (!templateName) {
    return { skipped: true, reason: 'Template name is not configured' }
  }
  if (!hasWhatsAppCredentials()) {
    return { skipped: true, reason: 'WhatsApp credentials are not configured' }
  }

  return graphFetch(`${graphBase()}/${config.whatsapp.phoneNumberId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components: parameters.length
          ? [
              {
                type: 'body',
                parameters: parameters.map((text) => ({ type: 'text', text: String(text) })),
              },
            ]
          : undefined,
      },
    }),
  })
}

export const downloadWhatsappMedia = async ({ mediaId }) => {
  if (!config.whatsapp.token) {
    return { skipped: true, reason: 'WhatsApp token is not configured' }
  }

  const media = await graphFetch(`${graphBase()}/${mediaId}`)
  const mediaResponse = await fetch(media.url, {
    headers: { Authorization: `Bearer ${config.whatsapp.token}` },
  })

  if (!mediaResponse.ok) {
    throw new Error(`Cannot download WhatsApp media ${mediaId}`)
  }

  const mime = media.mime_type || mediaResponse.headers.get('content-type') || 'application/octet-stream'
  const ext = mime.includes('png')
    ? 'png'
    : mime.includes('jpeg') || mime.includes('jpg')
      ? 'jpg'
      : mime.includes('pdf')
        ? 'pdf'
        : 'bin'
  const buffer = Buffer.from(await mediaResponse.arrayBuffer())

  return {
    buffer,
    mime,
    originalName: `whatsapp-${mediaId}.${ext}`,
  }
}
