// Step 2 of paying: take the money with PayPal, then tell Choreo it was paid.
// Choreo creates the passes and marks the merch order paid (ready for pickup).
// Body: { orderID }. Safe to call twice for the same order.
import { PP_BASE, json, paypalToken, choreo, cents } from '../lib/shared.js'

const isUuid = (v) => /^[0-9a-f-]{36}$/i.test(v || '')

async function paypal(token, path, method = 'GET', extraHeaders = {}) {
    const res = await fetch(`${PP_BASE}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extraHeaders }
    })
    let data = {}
    try { data = await res.json() } catch { /* empty */ }
    return { ok: res.ok, data }
}

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
    try {
        const { orderID } = JSON.parse(event.body || '{}')
        if (!orderID || !/^[A-Z0-9-]{5,40}$/i.test(orderID)) return json(400, { success: false, error: 'Missing order.' })
        const token = await paypalToken()
        const path = `/v2/checkout/orders/${encodeURIComponent(orderID)}`

        // Which Choreo order is this? (Set when the PayPal order was created.)
        const before = await paypal(token, path)
        if (!before.ok) return json(404, { success: false, error: 'Order not found. Please start again.' })
        const choreoOrderId = before.data?.purchase_units?.[0]?.custom_id
        if (!isUuid(choreoOrderId)) return json(400, { success: false, error: 'This order was not started on this website. Please start again.' })

        // Take the money (or read it, if it was already taken: e.g. a double click).
        let after = before.data.status === 'COMPLETED' ? before
            : await paypal(token, `${path}/capture`, 'POST', { 'PayPal-Request-Id': `capture-${orderID}` })
        if (!after.ok && after.data?.details?.some(d => d.issue === 'ORDER_ALREADY_CAPTURED')) after = await paypal(token, path)
        if (!after.ok) return json(402, { success: false, error: after.data?.details?.[0]?.description || 'The payment was not completed.' })
        const capture = after.data?.purchase_units?.[0]?.payments?.captures?.[0]
        if (!capture || capture.status === 'DECLINED' || capture.status === 'FAILED') {
            return json(402, { success: false, error: 'The payment was declined. Please try another way to pay.' })
        }

        // Record the sale in Choreo (try twice if Choreo is briefly busy).
        const body = { order_id: choreoOrderId, paypal_capture_id: capture.id, amount_cents: cents(capture.amount?.value || '0') }
        let r = await choreo('/api/website/complete', body)
        if (!r.ok && r.status >= 500) r = await choreo('/api/website/complete', body)
        if (!r.ok) {
            console.error('Choreo did not record the sale', orderID, capture.id, r.status, r.data)
            return json(200, { success: true, transactionId: capture.id,
                warning: `Your payment went through. If the front desk can't find your order, show them this transaction ID: ${capture.id}` })
        }
        return json(200, { success: true, transactionId: capture.id })
    } catch (err) {
        console.error('capture-paypal-order failed', err)
        return json(500, { success: false, error: 'Something went wrong. If you were charged, please contact the studio.' })
    }
}
