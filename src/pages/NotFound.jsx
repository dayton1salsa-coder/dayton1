import { Link } from 'react-router-dom'

// Any address that doesn't exist on the site (instead of the router's developer error page).
// Colors match the site: gold headings, white text on black.
const gold = '#e7c125'
const link = { color: gold, textDecoration: 'none', margin: '0 12px', fontFamily: '"Julius Sans One", serif', letterSpacing: '.05em' }

export default function NotFound() {
    return (
        <div style={{ padding: '90px 20px 70px', textAlign: 'center', color: '#fff' }}>
            <h2 style={{ color: gold, fontFamily: '"Julius Sans One", serif', fontSize: 36, letterSpacing: '.06em', margin: '0 0 12px' }}>Page not found</h2>
            <p style={{ color: '#fff', fontFamily: '"Urbanist", sans-serif', fontSize: 18, margin: '0 0 28px' }}>
                That page doesn&apos;t exist, or it moved.
            </p>
            <p>
                <Link to='/Classes' style={link}>Classes &amp; passes</Link>
                <Link to='/Shop' style={link}>Shop</Link>
                <Link to='/' style={link}>Home</Link>
            </p>
        </div>
    )
}
