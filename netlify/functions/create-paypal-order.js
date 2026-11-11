// Step 1 of paying: build the PayPal order ON THE SERVER with the real prices.
// Choreo prices everything (passes and merch), holds the order and reserves the
// merch stock. The browser only says what's in the cart, never how much it costs.
//
// Body: { buyer: {name, email, phone},
//         people: [{ firstName, lastName, phone, email, passId }],
//         merch:  [{ productId, sizeId, quantity }] }      (Choreo ids)
// Returns { id } (the PayPal order id) or { error }.
import { randomUUID } from 'node:crypto'
import { PP_BASE, json, missingSettings, paypalToken, choreo, money } from '../lib/shared.js'

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
    const missing = missingSettings(['PP_CLIENT', 'PP_SECRET', 'CHOREO_URL', 'CHOREO_SLUG', 'CHOREO_WEBSITE_KEY'])
    if (missing.length) return json(500, { error: 'Payments are not set up yet (missing settings: ' + missing.join(', ') + ').' })

    try {
        const { buyer = {}, people = [], merch = [] } = JSON.parse(event.body || '{}')
        if (!Array.isArray(people) || !Array.isArray(merch) || (people.length === 0 && merch.length === 0)) {
            return json(400, { error: 'Your order is empty.' })
        }
        if (people.length > 20 || merch.length > 20) return json(400, { error: 'Too many items in one order.' })
        for (const m of merch) {
            const qty = parseInt(m.quantity, 10)
            if (!(qty >= 1 && qty <= 20)) return json(400, { error: 'Bad quantity.' })
        }

        // 1. Choreo prices the cart and holds the order (and the merch stock).
        const r = await choreo('/api/website/prepare', {
            buyer: { name: String(buyer.name || '').trim(), email: String(buyer.email || '').trim(), phone: buyer.phone || '' },
            people: people.map(p => ({
                name: `${String(p.firstName || '').trim()} ${String(p.lastName || '').trim()}`.trim(),
                email: String(p.email || '').trim(),
                phone: p.phone || '',
                pass_id: p.passId
            })),
            merch: merch.map(m => ({ product_id: m.productId, variant_id: m.sizeId || null, quantity: parseInt(m.quantity, 10) }))
        })
        if (!r.ok) {
            return json(r.status === 409 ? 409 : 400, {
                error: r.data.error || 'Could not start the order. Please refresh and try again.',
                waiverUrl: r.data.waiver_url || null
            })
        }
        const lines = (r.data.lines || []).map(l => ({
            name: `${l.name}${l.holder_name ? ` - ${l.holder_name}` : ''}`.slice(0, 127),
            unit_amount: { currency_code: 'USD', value: money(l.unit_price_cents) },
            quantity: String(l.quantity),
            category: l.kind === 'merch' ? 'PHYSICAL_GOODS' : 'DIGITAL_GOODS'
        }))

        // 2. The PayPal order for exactly Choreo's total. custom_id links it back to Choreo.
        const total = money(r.data.total_cents)
        const token = await paypalToken()
        const res = await fetch(`${PP_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': randomUUID() },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    description: 'DaytOn1 Salsa Order',
                    custom_id: r.data.order_id,
                    amount: { currency_code: 'USD', value: total, breakdown: { item_total: { currency_code: 'USD', value: total } } },
                    items: lines
                }]
            })
        })
        const order = await res.json()
        if (!res.ok || !order.id) return json(502, { error: 'PayPal could not start the payment. Please try again.' })
        return json(200, { id: order.id })
    } catch (err) {
        console.error('create-paypal-order failed', err)
        return json(500, { error: 'Could not start the payment. Please try again.' })
    }
}
