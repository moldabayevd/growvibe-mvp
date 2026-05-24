const BASE = process.env.BASE || 'http://localhost:4000'
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin12345'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me-admin-token'

let passed = 0, failed = 0
const failures = []
const groupTitles = []

const fmt = (v) => {
  if (typeof v === 'string') return v.length > 200 ? v.slice(0, 200) + '…' : v
  try { return JSON.stringify(v).slice(0, 200) } catch { return String(v) }
}

const ok = (name, detail = '') => {
  passed++
  console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`)
}
const fail = (name, detail) => {
  failed++
  failures.push(`${groupTitles[groupTitles.length - 1] || ''} :: ${name} — ${fmt(detail)}`)
  console.log(`  ❌ ${name} — ${fmt(detail)}`)
}
const assert = (cond, name, detail) => {
  if (cond) ok(name)
  else fail(name, detail)
  return cond
}
const group = (title) => {
  groupTitles.push(title)
  console.log(`\n=== ${title} ===`)
}

const req = async (path, options = {}) => {
  const res = await fetch(BASE + path, options)
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch {}
  return { status: res.status, json, text, headers: res.headers }
}

const adminHeaders = (token, extra = {}) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  ...extra,
})

const fdUpload = async (path, filename, bytes, mime, extra = {}) => {
  const fd = new FormData()
  fd.append('receipt', new Blob([bytes], { type: mime }), filename)
  const res = await fetch(BASE + path, { method: 'POST', body: fd, ...extra })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch {}
  return { status: res.status, json, text }
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(40).fill(0)])
const PDF = Buffer.from('%PDF-1.4\n%test pdf\n', 'utf8')

const main = async () => {
  // ============================================================
  group('1. Health / public config')
  // ============================================================
  {
    const r = await req('/health')
    assert(r.status === 200, 'GET /health 200', r.status)
    assert(r.json?.ok === true, 'health.ok=true', r.json)
    assert(r.json?.service === 'growvibe-api', 'health.service', r.json)
  }
  {
    const r = await req('/api/public/config')
    assert(r.status === 200, 'GET /api/public/config 200', r.status)
    assert(typeof r.json?.kaspiPhone === 'string', 'config.kaspiPhone is string', r.json)
    assert(typeof r.json?.kaspiAmount === 'number', 'config.kaspiAmount is number', r.json)
  }

  // ============================================================
  group('2. Public sessions list')
  // ============================================================
  let publicSessions = []
  {
    const r = await req('/api/public/sessions')
    assert(r.status === 200, 'GET /api/public/sessions 200', r.status)
    publicSessions = r.json?.sessions || []
    assert(Array.isArray(publicSessions) && publicSessions.length >= 5, 'seed produced ≥5 sessions', publicSessions.length)
    const s = publicSessions[0]
    assert(s?.publicId && s?.city && s?.date && s?.priceKzt, 'session has required fields', s)
    assert(typeof s?.registrationOpen === 'boolean', 'registrationOpen is boolean', s)
    assert(typeof s?.seatsLeft === 'number', 'seatsLeft is number', s)
  }

  // ============================================================
  group('3. Auth: login flows')
  // ============================================================
  let token = null
  {
    const r = await req('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
    })
    assert(r.status === 200, 'login with correct creds 200', r.status)
    token = r.json?.token
    assert(typeof token === 'string' && token.length > 60, 'token returned', token?.length)
    assert(r.json?.username === ADMIN_USER, 'username echoed', r.json)
    assert(!!r.json?.expiresAt, 'expiresAt present', r.json)
  }
  {
    const r = await req('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USER, password: 'wrong' }),
    })
    assert(r.status === 401, 'login wrong password → 401', r.status)
    assert(r.json?.error?.includes('Неверный'), 'error in russian', r.json)
  }
  {
    const r = await req('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'notadmin', password: ADMIN_PASS }),
    })
    assert(r.status === 401, 'login wrong username → 401', r.status)
  }
  {
    const r = await req('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    assert(r.status === 400 || r.status === 500, 'login empty body → 400/500', r.status)
  }
  {
    const r = await req('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    assert(r.status >= 400, 'login broken json → 4xx/5xx', r.status)
  }

  // ============================================================
  group('4. Auth: protected endpoints')
  // ============================================================
  {
    const r = await req('/api/admin/me')
    assert(r.status === 401, 'no auth → 401', r.status)
  }
  {
    const r = await req('/api/admin/me', { headers: { Authorization: 'Bearer not.a.token' } })
    assert(r.status === 401, 'bad bearer → 401', r.status)
  }
  {
    const r = await req('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
    assert(r.status === 200, 'good bearer → 200', r.status)
    assert(r.json?.username === ADMIN_USER, '/me returns username', r.json)
  }
  {
    const r = await req('/api/admin/me', { headers: { 'x-admin-token': ADMIN_TOKEN } })
    assert(r.status === 200, 'legacy x-admin-token still works', r.status)
  }
  {
    const r = await req('/api/admin/me', { headers: { 'x-admin-token': 'wrong-token' } })
    assert(r.status === 401, 'wrong x-admin-token → 401', r.status)
  }
  {
    // tampered token (change last char)
    const bad = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A')
    const r = await req('/api/admin/me', { headers: { Authorization: `Bearer ${bad}` } })
    assert(r.status === 401, 'tampered bearer → 401', r.status)
  }

  // ============================================================
  group('5. Admin: summary, sessions list')
  // ============================================================
  {
    const r = await req('/api/admin/summary', { headers: adminHeaders(token) })
    assert(r.status === 200, 'GET /api/admin/summary 200', r.status)
    assert(Array.isArray(r.json?.sessions), 'summary.sessions array', r.json)
    assert(typeof r.json?.pendingProofs === 'number', 'summary.pendingProofs number', r.json)
  }
  {
    const r = await req('/api/admin/sessions', { headers: adminHeaders(token) })
    assert(r.status === 200, 'GET /api/admin/sessions 200', r.status)
    assert(r.json?.sessions?.length >= 5, 'admin sees seed sessions', r.json?.sessions?.length)
  }

  // ============================================================
  group('6. Admin: create / patch / delete session')
  // ============================================================
  let createdSessionId = null
  {
    const r = await req('/api/admin/sessions', {
      method: 'POST', headers: adminHeaders(token),
      body: JSON.stringify({
        city: 'Астана', date: '2026-07-01', time: '19:00–22:00',
        format: 'Вечерняя группа', location: 'Тестовое место', seatsTotal: 3, seatsMin: 2,
      }),
    })
    assert(r.status === 201, 'POST /api/admin/sessions 201', r.status)
    createdSessionId = r.json?.session?.publicId
    assert(!!createdSessionId, 'created has publicId', r.json)
    assert(r.json?.session?.city === 'Астана', 'city stored', r.json?.session?.city)
    assert(r.json?.session?.seatsTotal === 3, 'seatsTotal stored', r.json?.session?.seatsTotal)
  }
  {
    const r = await req('/api/admin/sessions', {
      method: 'POST', headers: adminHeaders(token),
      body: JSON.stringify({ city: 'X' }),
    })
    assert(r.status >= 400, 'create with missing required fields → 4xx', r.status)
  }
  {
    const r = await req(`/api/admin/sessions/${createdSessionId}`, {
      method: 'PATCH', headers: adminHeaders(token),
      body: JSON.stringify({ time: '20:00–23:00', priceKzt: 75000, seatsTotal: 5, location: 'Новое место' }),
    })
    assert(r.status === 200, 'PATCH session 200', r.status)
    assert(r.json?.session?.time === '20:00–23:00', 'time updated', r.json?.session?.time)
    assert(r.json?.session?.priceKzt === 75000, 'price updated', r.json?.session?.priceKzt)
    assert(r.json?.session?.seatsTotal === 5, 'seatsTotal updated', r.json?.session?.seatsTotal)
    assert(r.json?.session?.location === 'Новое место', 'location UTF-8 ok', r.json?.session?.location)
  }
  {
    const r = await req(`/api/admin/sessions/nonexistent-xxxxxxx`, {
      method: 'PATCH', headers: adminHeaders(token),
      body: JSON.stringify({ time: '10:00' }),
    })
    assert(r.status === 404, 'PATCH nonexistent → 404', r.status)
  }
  {
    const r = await req(`/api/admin/sessions/${createdSessionId}`, {
      method: 'DELETE', headers: adminHeaders(token),
    })
    assert(r.status === 200, 'DELETE empty session 200', r.status)
  }
  {
    const r = await req(`/api/admin/sessions/${createdSessionId}`, {
      method: 'DELETE', headers: adminHeaders(token),
    })
    assert(r.status === 404, 'DELETE already-deleted → 404', r.status)
  }

  // ============================================================
  group('7. Public application: validation + creation')
  // ============================================================
  const sess = publicSessions[0]
  {
    const r = await req('/api/public/applications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert(r.status >= 400, 'empty body → 4xx', r.status)
  }
  {
    const r = await req('/api/public/applications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X', phone: '+77001112233', sessionPublicId: 'doesnotexist' }),
    })
    assert(r.status >= 400, 'too short name → 4xx', r.status)
  }
  {
    const r = await req('/api/public/applications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Иван', phone: '+77001112233', sessionPublicId: 'doesnotexist' }),
    })
    assert(r.status === 404, 'nonexistent session → 404', r.status)
  }
  let appId = null
  {
    const r = await req('/api/public/applications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Иван Тестов', phone: '+7 (701) 111-22-33', email: 'ivan@test.kz',
        sessionPublicId: sess.publicId, flowCompleted: true, readinessConfirmed: true, conditionsConfirmed: true,
      }),
    })
    assert(r.status === 201, 'POST application 201', r.status)
    appId = r.json?.applicationId
    assert(!!appId, 'application has id', r.json)
    assert(r.json?.status === 'PAYMENT_PENDING', 'status PAYMENT_PENDING', r.json)
    assert(r.json?.payment?.kaspiPhone, 'kaspi phone present', r.json?.payment)
    assert(typeof r.json?.payment?.amountKzt === 'number', 'amountKzt number', r.json?.payment)
  }
  // duplicate from same phone → re-uses application
  {
    const r = await req('/api/public/applications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Иван Тестов', phone: '+77011112233',
        sessionPublicId: sess.publicId, flowCompleted: true, readinessConfirmed: true, conditionsConfirmed: true,
      }),
    })
    assert(r.status === 201, 'duplicate application also 201', r.status)
    assert(r.json?.applicationId === appId, 'reused same application id', { got: r.json?.applicationId, want: appId })
  }

  // ============================================================
  group('8. Public payment-proof: upload + validation')
  // ============================================================
  {
    const r = await fdUpload(`/api/public/applications/${appId}/payment-proof`, 'r.png', PNG, 'image/png')
    assert(r.status === 200, 'upload png 200', r.status)
    assert(r.json?.status === 'PROOF_UPLOADED', 'application status PROOF_UPLOADED', r.json)
  }
  {
    const r = await fdUpload(`/api/public/applications/nonexistent/payment-proof`, 'r.png', PNG, 'image/png')
    assert(r.status === 404, 'upload to nonexistent app → 404', r.status)
  }
  {
    const r = await fdUpload(`/api/public/applications/${appId}/payment-proof`, 'r.exe', Buffer.from('MZ'), 'application/x-msdownload')
    // multer fileFilter rejects → no file → 400
    assert(r.status === 400, 'disallowed mime → 400', r.status)
  }
  {
    // empty form
    const fd = new FormData()
    const res = await fetch(BASE + `/api/public/applications/${appId}/payment-proof`, { method: 'POST', body: fd })
    assert(res.status === 400, 'no file field → 400', res.status)
  }
  {
    const r = await fdUpload(`/api/public/applications/${appId}/payment-proof`, 'r.pdf', PDF, 'application/pdf')
    assert(r.status === 200, 'replace with pdf 200', r.status)
  }

  // ============================================================
  group('9. Receipt retrieval via /uploads/:key')
  // ============================================================
  let receiptUrl = null
  {
    const r = await req('/api/admin/applications', { headers: adminHeaders(token) })
    const a = r.json?.applications?.find((x) => x.id === appId)
    receiptUrl = a?.payments?.[0]?.receiptUrl
    assert(!!receiptUrl && receiptUrl.startsWith('/uploads/'), 'receiptUrl present', receiptUrl)
  }
  {
    const r = await fetch(BASE + receiptUrl)
    assert(r.status === 200, 'GET receipt 200', r.status)
    const ct = r.headers.get('content-type')
    assert(ct?.includes('pdf') || ct?.includes('octet-stream'), 'content-type pdf-ish', ct)
    const bytes = await r.arrayBuffer()
    assert(bytes.byteLength === PDF.length, 'receipt bytes match', bytes.byteLength)
  }
  {
    const r = await fetch(BASE + '/uploads/nonexistent-key.png')
    assert(r.status === 404, 'unknown receipt key → 404', r.status)
  }
  {
    const r = await fetch(BASE + '/uploads/..%2Fetc%2Fpasswd')
    assert(r.status === 400 || r.status === 404, 'path traversal blocked', r.status)
  }

  // ============================================================
  group('10. Admin: payment verify / reject / status update')
  // ============================================================
  let paymentId = null
  {
    const r = await req('/api/admin/applications', { headers: adminHeaders(token) })
    const a = r.json?.applications?.find((x) => x.id === appId)
    paymentId = a?.payments?.[0]?.id
    assert(!!paymentId, 'paymentId from admin', paymentId)
  }
  {
    const r = await req(`/api/admin/payments/${paymentId}/verify`, {
      method: 'POST', headers: adminHeaders(token), body: '{}',
    })
    assert(r.status === 200, 'verify payment 200', r.status)
    assert(r.json?.application?.status === 'PAID', 'application now PAID', r.json?.application?.status)
  }
  {
    const r = await req(`/api/admin/payments/${paymentId}/reject`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ reason: 'Тестовый отказ' }),
    })
    assert(r.status === 200, 'reject payment 200', r.status)
    assert(r.json?.application?.status === 'PAYMENT_PENDING', 'app back to PAYMENT_PENDING', r.json?.application?.status)
  }
  {
    const r = await req(`/api/admin/applications/${appId}/status`, {
      method: 'PATCH', headers: adminHeaders(token),
      body: JSON.stringify({ status: 'CONFIRMED' }),
    })
    assert(r.status === 200, 'status update 200', r.status)
    assert(r.json?.application?.status === 'CONFIRMED', 'status CONFIRMED', r.json?.application?.status)
  }
  {
    const r = await req(`/api/admin/applications/${appId}/status`, {
      method: 'PATCH', headers: adminHeaders(token),
      body: JSON.stringify({ status: 'INVALID_STATUS' }),
    })
    assert(r.status >= 400, 'invalid status → 4xx', r.status)
  }
  {
    const r = await req('/api/admin/applications?status=CONFIRMED', { headers: adminHeaders(token) })
    assert(r.status === 200, 'filter by status 200', r.status)
    assert(r.json?.applications?.every((a) => a.status === 'CONFIRMED'), 'filter works', r.json?.applications?.length)
  }

  // ============================================================
  group('11. Admin: message endpoint')
  // ============================================================
  {
    const r = await req(`/api/admin/applications/${appId}/messages`, {
      method: 'POST', headers: adminHeaders(token),
      body: JSON.stringify({ body: 'Привет, это тест!' }),
    })
    assert(r.status === 200, 'send msg 200 (queued when no WA creds)', r.status)
    assert(r.json?.message?.status === 'QUEUED' || r.json?.message?.status === 'SENT', 'msg status', r.json?.message?.status)
    assert(r.json?.message?.body?.includes('Привет'), 'msg body stored', r.json?.message?.body)
  }
  {
    const r = await req(`/api/admin/applications/nonexistent/messages`, {
      method: 'POST', headers: adminHeaders(token),
      body: JSON.stringify({ body: 'test' }),
    })
    assert(r.status === 404, 'msg to nonexistent app → 404', r.status)
  }
  {
    const r = await req(`/api/admin/applications/${appId}/messages`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ body: '' }),
    })
    assert(r.status >= 400, 'empty body → 4xx', r.status)
  }

  // ============================================================
  group('12. DELETE session protection (with PAID app)')
  // ============================================================
  {
    // set app back to PAID to test protection
    await req(`/api/admin/applications/${appId}/status`, {
      method: 'PATCH', headers: adminHeaders(token), body: JSON.stringify({ status: 'PAID' }),
    })
    const r = await req(`/api/admin/sessions/${sess.publicId}`, {
      method: 'DELETE', headers: adminHeaders(token),
    })
    assert(r.status === 409, 'DELETE session with PAID app → 409', r.status)
    assert(r.json?.error?.includes('Нельзя'), 'block reason in error', r.json?.error)
  }

  // ============================================================
  group('13. Session capacity / full booking')
  // ============================================================
  {
    // create tiny session with 2 seats
    const create = await req('/api/admin/sessions', {
      method: 'POST', headers: adminHeaders(token),
      body: JSON.stringify({
        city: 'Алматы', date: '2026-08-01', time: '10:00–13:00',
        format: 'Суббота', location: 'Капасити-тест', seatsTotal: 2, seatsMin: 2,
      }),
    })
    assert(create.status === 201, 'create capacity-test session', create.status)
    const sid = create.json?.session?.publicId

    // book 2 different users + verify payments
    const userIds = []
    for (const phone of ['+77011000001', '+77011000002']) {
      const a = await req('/api/public/applications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'User ' + phone, phone, sessionPublicId: sid, flowCompleted: true, readinessConfirmed: true, conditionsConfirmed: true }),
      })
      assert(a.status === 201, `book ${phone}`, a.status)
      userIds.push(a.json.applicationId)
      const up = await fdUpload(`/api/public/applications/${a.json.applicationId}/payment-proof`, 'r.png', PNG, 'image/png')
      const pid = up.json?.paymentId
      const v = await req(`/api/admin/payments/${pid}/verify`, { method: 'POST', headers: adminHeaders(token), body: '{}' })
      assert(v.status === 200, `verify payment for ${phone}`, v.status)
    }

    // 3rd booking should be rejected
    const overflow = await req('/api/public/applications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Overflow User', phone: '+77011000003', sessionPublicId: sid, flowCompleted: true, readinessConfirmed: true, conditionsConfirmed: true }),
    })
    assert(overflow.status === 409, '3rd booking when full → 409', overflow.status)
    assert(overflow.json?.error?.toLowerCase().includes('full'), 'error mentions full', overflow.json?.error)

    // public view should show seatsLeft=0 and registrationOpen=false
    const pub = await req('/api/public/sessions')
    const s = pub.json?.sessions?.find((x) => x.publicId === sid)
    assert(s?.seatsLeft === 0, 'seatsLeft=0', s?.seatsLeft)
    assert(s?.registrationOpen === false, 'registrationOpen=false', s?.registrationOpen)
    assert(s?.paidCount === 2, 'paidCount=2', s?.paidCount)
  }

  // ============================================================
  group('14. Public session filter: CANCELLED hidden')
  // ============================================================
  {
    // create + cancel
    const c = await req('/api/admin/sessions', {
      method: 'POST', headers: adminHeaders(token),
      body: JSON.stringify({ city: 'Астана', date: '2026-09-01', time: '12:00', format: 'Суббота', location: 'Cancel-test', status: 'CANCELLED' }),
    })
    const sid = c.json?.session?.publicId
    const pub = await req('/api/public/sessions')
    const found = pub.json?.sessions?.find((x) => x.publicId === sid)
    assert(!found, 'CANCELLED session hidden from public', !!found)
  }

  // ============================================================
  group('15. WhatsApp webhook')
  // ============================================================
  {
    const r = await req('/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=growvibe-webhook-token&hub.challenge=ABC123')
    assert(r.status === 200, 'webhook verify with correct token 200', r.status)
    assert(r.text === 'ABC123', 'returns challenge', r.text)
  }
  {
    const r = await req('/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=ABC')
    assert(r.status === 403, 'webhook verify wrong token → 403', r.status)
  }
  {
    const r = await req('/webhooks/whatsapp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{ changes: [{ value: { messages: [{ id: 'wamid.test', from: '77019999999', type: 'text', text: { body: 'Привет от клиента' } }], contacts: [{ wa_id: '77019999999', profile: { name: 'Тест Клиент' } }] } }] }],
      }),
    })
    assert(r.status === 200, 'inbound webhook accepted 200', r.status)
  }

  // ============================================================
  group('16. CORS')
  // ============================================================
  {
    const r = await fetch(BASE + '/api/public/sessions', {
      headers: { Origin: 'http://localhost:5173' },
    })
    assert(r.status === 200, 'CORS allowed origin 200', r.status)
    assert(r.headers.get('access-control-allow-origin') === 'http://localhost:5173', 'CORS header echoed', r.headers.get('access-control-allow-origin'))
  }
  {
    const r = await fetch(BASE + '/api/public/sessions', {
      headers: { Origin: 'https://evil.example.com' },
    })
    // cors lib: if origin not allowed, header not set. Request still goes through (server doesn't enforce, browser does).
    // We just assert no allow-origin header is echoed.
    const allow = r.headers.get('access-control-allow-origin')
    assert(!allow || allow === '*' || allow === 'http://localhost:5173' ? !allow : false, 'evil origin not echoed', allow)
  }

  // ============================================================
  group('17. Security headers')
  // ============================================================
  {
    const r = await fetch(BASE + '/health')
    assert(r.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff', r.headers.get('x-content-type-options'))
    assert(r.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Referrer-Policy set', r.headers.get('referrer-policy'))
    assert(!r.headers.get('x-powered-by'), 'X-Powered-By disabled', r.headers.get('x-powered-by'))
  }

  // ============================================================
  group('18. Frontend reachability')
  // ============================================================
  for (const [name, url] of [['landing', 'http://localhost:5173'], ['admin', 'http://localhost:5174']]) {
    const r = await fetch(url)
    assert(r.status === 200, `${name} returns 200`, r.status)
    const html = await r.text()
    assert(html.includes('<div id="root"></div>'), `${name} HTML has root`, html.slice(0, 120))
  }

  // ============================================================
  console.log('\n' + '='.repeat(60))
  console.log(`RESULT: ${passed} passed, ${failed} failed`)
  if (failures.length) {
    console.log('\nFAILURES:')
    failures.forEach((f) => console.log('  - ' + f))
    process.exit(1)
  }
}

main().catch((e) => { console.error('runner crashed:', e); process.exit(2) })
