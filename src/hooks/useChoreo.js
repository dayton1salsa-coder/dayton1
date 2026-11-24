import { useEffect, useState } from 'react'
import { CHOREO_URL, CHOREO_SLUG } from '../choreo'

// Everything the website shows comes from Choreo (https://choreo.icanoki.com):
// passes, merch (with photos), the class schedule and the studio's notice.
// One request per page visit, shared by every part of the page.
let cached = null
function load() {
    if (!cached) {
        cached = fetch(`${CHOREO_URL}/api/public/${CHOREO_SLUG}`)
            .then(r => r.json())
            .then(d => { if (d.error) throw new Error(d.error); return d })
            .catch(e => { cached = null; throw e })
    }
    return cached
}

export function useChoreo() {
    const [state, setState] = useState({ data: null, loading: true, error: '' })
    useEffect(() => {
        let live = true
        load()
            .then(data => live && setState({ data, loading: false, error: '' }))
            .catch(e => live && setState({ data: null, loading: false, error: e.message || 'Could not load' }))
        return () => { live = false }
    }, [])
    return state
}

const dollars = (c) => (c / 100).toFixed(2).replace(/\.00$/, '')

// Passes on sale right now (Choreo already hides passes outside their sale window).
// Shaped like the old pass types: { id, key, label, amount, duration, goodThrough, highlight }.
export function useChoreoPasses() {
    const { data, loading, error } = useChoreo()
    const passes = (data?.passes || []).map(p => ({
        id: p.id,
        key: p.id,
        label: p.name,
        amount: dollars(p.price_cents),
        duration: p.duration === 'day' ? 'day' : 'month',
        goodThrough: p.good_through,
        highlight: p.highlight,
        description: p.description
    }))
    const paused = data && data.studio?.taking_payments === false && !passes.length
    return { passes, loading, error: error || (paused ? 'paused' : '') }
}

// Merch, shaped like the old products: { id, name, price, description, imageUrl, photos, active,
// variants: [{ id, size, stock, left }] }. left = exact count only when 5 or fewer. Items without sizes get one "One size" choice.
// stock is only a hint for the page (Choreo checks the real stock when paying).
export function useChoreoProducts() {
    const { data, loading, error } = useChoreo()
    const products = (data?.merch || []).map(m => ({
        id: m.id,
        name: m.name,
        price: dollars(m.price_cents),
        description: m.description || '',
        imageUrl: m.photos?.[0] || '',
        photos: m.photos || [],
        active: true,
        variants: m.sizes?.length
            ? m.sizes.map(s => ({ id: s.id, size: s.label, stock: s.in_stock ? (s.left ?? 20) : 0, left: s.left || null }))
            : [{ id: null, size: 'One size', stock: m.in_stock ? 20 : 0, left: null }]
    }))
    return { products, loading, error }
}

// Events (Heather site update 04): her own events from Choreo (tickets or free RSVP)
// and other people's events she promotes (Choreo update 54). Upcoming only, soonest
// first; Choreo drops them by itself once they're over.
// Shaped for the Events page: { id, title, photo, date, time, place, own, host, priceLine,
//   status, button: { label, url, external } | null, canceled }.
export function useChoreoEvents() {
    const { data, loading, error } = useChoreo()
    const tz = data?.studio?.timezone || 'America/New_York'
    const fmt = (iso, o) => new Intl.DateTimeFormat('en-US', { timeZone: tz, ...o }).format(new Date(iso))
    const hm = (iso) => fmt(iso, { hour: 'numeric', minute: '2-digit' }).replace(':00', '')
    const money = (c) => `$${dollars(c)}`
    const events = (data?.events || []).map(e => {
        const own = !e.promoted
        const tickets = (e.tickets || []).filter(t => !t.sold_out)
        const soldOut = own && e.kind === 'tickets' && (e.spots_left === 0 || !tickets.length)
        const full = own && e.kind === 'rsvp' && e.spots_left === 0
        // "Full night $15 · Social only $10", "$45", "Free · RSVP"
        const priceLine = !own ? ''
            : e.kind === 'rsvp' ? 'Free · RSVP'
            : tickets.length === 1 ? money(tickets[0].price_cents)
            : tickets.length > 1 && tickets.length <= 3 ? tickets.map(t => `${t.name} ${money(t.price_cents)}`).join(' · ')
            : tickets.length ? `From ${money(Math.min(...tickets.map(t => t.price_cents)))}` : ''
        const status = e.canceled ? 'Canceled' : soldOut ? 'Sold out' : full ? 'Full'
            : own && e.spots_left != null && e.spots_left <= 10 ? `${e.spots_left} spot${e.spots_left === 1 ? '' : 's'} left` : ''
        const button = e.canceled || soldOut || full ? null
            : own ? { label: e.kind === 'rsvp' ? 'RSVP' : 'Get tickets', url: e.page, external: false }
            : e.info_url ? { label: 'More info', url: e.info_url, external: true } : null
        return {
            id: e.id,
            title: e.title,
            photo: e.photo_small || e.photo || '',
            date: fmt(e.starts_at, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
            time: e.ends_at ? `${hm(e.starts_at)} – ${hm(e.ends_at)}` : hm(e.starts_at),
            place: [e.place?.name, e.place?.address].filter(Boolean).join(', '),
            own,
            host: e.host_name || '',
            priceLine,
            status,
            button,
            canceled: !!e.canceled,
        }
    })
    // "Next up": the soonest event that's still on.
    const next = events.find(e => !e.canceled)
    return { events, nextId: next?.id || null, loading, error }
}
