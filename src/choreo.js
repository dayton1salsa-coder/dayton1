// Where the studio's passes come from now: Choreo (https://choreo.icanoki.com).
// Nothing secret here; prices are public. Change the address in Netlify with
// VITE_CHOREO_SLUG / VITE_CHOREO_URL if needed (no code change).
export const CHOREO_URL = (import.meta.env.VITE_CHOREO_URL || 'https://choreo.icanoki.com').replace(/\/$/, '')
export const CHOREO_SLUG = import.meta.env.VITE_CHOREO_SLUG || 'dayton1'

// PayPal: "true" only on a test deploy that uses PayPal sandbox keys.
export const PAYPAL_SANDBOX = import.meta.env.VITE_PAYPAL_SANDBOX === 'true'
export const PAYPAL_CLIENT_ID = PAYPAL_SANDBOX
    ? 'ATa2uW4F2oDvrxNJ4TxL6hkZ4Zd8nF-K0KTzjZxFQbVhl9CUe1pNznPexU6cgfoLOLxcKWaIBpe2AuDt'
    : 'AVI4LpJe46rQQcObnfSR6qyf9dzp3ypfM9HI4pqp61LZLE5cynC16Z5ASlu73y5ggpX7tQTbE-exYM1l'
