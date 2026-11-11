import { useEffect, useRef } from 'react'
import { PAYPAL_CLIENT_ID } from '../choreo'

// The PayPal button. Prices are worked out on the server (create-paypal-order),
// and the sale is recorded on the server (capture-paypal-order) in Choreo:
// passes and merch. The browser never decides the price.
//
// cart       = [{ id, firstName, lastName, phone, email, passKey }]   (passKey = Choreo pass id)
// merchItems = [{ productId, productName, size, sizeId, quantity, unitPrice }]   (Choreo ids)
// buyer      = { name, phone, email }
// onSuccess(details) where details = { id: transactionId }
export default function PayPalButton({ cart, merchItems = [], buyer, onSuccess }) {
    const containerRef = useRef(null)
    const cartRef = useRef(cart)
    const merchRef = useRef(merchItems)
    const buyerRef = useRef(buyer)
    const onSuccessRef = useRef(onSuccess)

    useEffect(() => { cartRef.current = cart }, [cart])
    useEffect(() => { merchRef.current = merchItems }, [merchItems])
    useEffect(() => { buyerRef.current = buyer }, [buyer])
    useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])

    useEffect(() => {
        if (containerRef.current) containerRef.current.innerHTML = ''

        function renderButtons() {
            if (!window.paypal || !containerRef.current) return
            window.paypal.Buttons({
                createOrder: async () => {
                    const res = await fetch('/.netlify/functions/create-paypal-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            buyer: buyerRef.current,
                            people: cartRef.current.map(p => ({
                                firstName: p.firstName, lastName: p.lastName, phone: p.phone, email: p.email, passId: p.passKey
                            })),
                            merch: merchRef.current.map(m => ({ productId: m.productId, sizeId: m.sizeId || null, quantity: m.quantity }))
                        })
                    })
                    const data = await res.json()
                    if (!res.ok || !data.id) {
                        if (data.waiverUrl) {
                            if (confirm(`${data.error}\n\nOpen the waiver now?`)) window.open(data.waiverUrl, '_blank', 'noopener')
                        } else {
                            alert(data.error || 'Could not start the payment. Please try again.')
                        }
                        throw new Error(data.error || 'create-order failed')
                    }
                    return data.id
                },
                onApprove: async (data) => {
                    try {
                        const res = await fetch('/.netlify/functions/capture-paypal-order', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orderID: data.orderID })
                        })
                        const result = await res.json()
                        if (!res.ok || !result.success) throw new Error(result.error || 'Payment could not be verified.')
                        if (result.warning) alert(result.warning)
                        onSuccessRef.current({ id: result.transactionId })
                    } catch (err) {
                        console.error('Capture failed:', err)
                        alert('Payment was not completed: ' + (err?.message || String(err)))
                    }
                },
                onError: (err) => {
                    console.error('PayPal error:', err)
                },
                onCancel: () => {
                    alert('Payment cancelled. You can try again when ready.')
                }
            }).render(containerRef.current)
        }

        if (window.paypal) { renderButtons(); return }
        const existingScript = document.querySelector('script[src*="paypal.com/sdk"]')
        if (existingScript) { existingScript.addEventListener('load', renderButtons); return }

        const script = document.createElement('script')
        script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&enable-funding=venmo`
        script.async = true
        script.onload = renderButtons
        script.onerror = () => alert('Could not load payment system. Please refresh and try again.')
        document.body.appendChild(script)
        return () => { if (document.body.contains(script)) document.body.removeChild(script) }
    }, [])

    return <div ref={containerRef} />
}
