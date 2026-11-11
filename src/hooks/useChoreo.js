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
