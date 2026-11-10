import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CHOREO_URL, CHOREO_SLUG } from '../choreo'

// The old admin, owner, kiosk and invoice pages now live in Choreo.
// Old bookmarks and links land here and are sent to the right Choreo page.
//   /admin, /owner       -> Choreo dashboard (front desk is one tap away)
//   /kiosk               -> Choreo kiosk for the studio
//   /invoice/<old id>    -> that invoice in Choreo (pay by card)
export default function GoToChoreo({ to }) {
    const { invoiceId } = useParams()
    const target = to === 'kiosk' ? `${CHOREO_URL}/s/${CHOREO_SLUG}/kiosk`
        : to === 'invoice' ? `${CHOREO_URL}/s/${CHOREO_SLUG}/invoice/${encodeURIComponent(invoiceId || '')}`
        : `${CHOREO_URL}/owner`

    useEffect(() => { window.location.replace(target) }, [target])

    return (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <p>Taking you to the right page…</p>
            <p><a href={target}>Tap here if nothing happens</a></p>
        </div>
    )
}
