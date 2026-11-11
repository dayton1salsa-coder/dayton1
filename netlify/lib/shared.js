// Shared by the PayPal functions. SERVER ONLY (runs on Netlify, never in the browser).
//
// Netlify environment variables used:
//   PP_CLIENT, PP_SECRET            Heather's PayPal app (live or sandbox)
//   PAYPAL_SANDBOX                  "true" only on a test deploy that uses PayPal sandbox keys
//   CHOREO_URL                      https://choreo.icanoki.com
//   CHOREO_SLUG                     the studio's address in Choreo, e.g. dayton1
//   CHOREO_WEBSITE_KEY              from Choreo > Settings > Your website (PayPal). Secret.
// Everything (passes, merch, stock, orders) lives in Choreo. Firebase is no longer used.

export const PP_BASE = process.env.PAYPAL_SANDBOX === 'true' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'

export const json = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
})

// Names of required settings that are missing (never their values).
export function missingSettings(names) {
    return names.filter(n => !process.env[n])
}

export async function paypalToken() {
    const auth = Buffer.from(`${process.env.PP_CLIENT}:${process.env.PP_SECRET}`).toString('base64')
    const res = await fetch(`${PP_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    })
    const data = await res.json()
    if (!res.ok || !data.access_token) throw new Error('Could not connect to PayPal. Please try again.')
    return data.access_token
}

// Talk to Choreo with the studio's website key.
export async function choreo(path, body) {
    const res = await fetch(`${process.env.CHOREO_URL.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CHOREO_WEBSITE_KEY}` },
        body: JSON.stringify({ slug: process.env.CHOREO_SLUG, ...body })
    })
    let data = {}
    try { data = await res.json() } catch { /* empty */ }
    return { ok: res.ok, status: res.status, data }
}

export const cents = (dollars) => Math.round(parseFloat(dollars) * 100)
export const money = (c) => (c / 100).toFixed(2)
