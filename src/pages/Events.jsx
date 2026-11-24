import './Events.css'
import { useChoreoEvents } from '../hooks/useChoreo'

// Events (Heather site update 04): everything comes from Choreo now. Heather adds
// her own events (tickets or free RSVP) and other people's events she promotes
// in Choreo > Classes & events > Events, with the flyer as the photo. Past events
// drop off by themselves.
const INSTAGRAM = 'https://www.instagram.com/dayton1salsa/'
const FACEBOOK = 'https://www.facebook.com/DaytOn1Salsa'

function EventCard({ event, next }) {
    const { button } = event
    const inner = (
        <>
            <div className='event-card-img'>
                {event.photo
                    ? <img src={event.photo} alt={event.title} loading='lazy' />
                    : <div className='event-card-img-blank'><span>{event.title}</span></div>}
                {event.status
                    ? <span className={`event-card-pill ${/Canceled|Sold out|Full/.test(event.status) ? 'off' : ''}`}>{event.status}</span>
                    : next && <span className='event-card-pill gold'>Next up</span>}
            </div>
            <div className='event-card-info'>
                <p className={`event-card-whose ${event.own ? 'own' : ''}`}>
                    {event.own ? 'DaytOn1 event' : event.host ? `Hosted by ${event.host}` : 'Around town'}
                </p>
                <h3 className='event-card-title'>{event.title}</h3>
                <p className='event-card-date'>{event.date}</p>
                <p className='event-card-time'>{event.time}</p>
                {event.place && <p className='event-card-location'>{event.place}</p>}
                {event.priceLine && <p className='event-card-price'>{event.priceLine}</p>}
                {button && <span className='event-card-btn'>{button.label}</span>}
            </div>
        </>
    )
    // The whole card opens the button's link (Choreo's page to buy or RSVP, or the host's link).
    if (!button) return <div className={`event-card event-card-no-link ${event.canceled ? 'canceled' : ''}`}>{inner}</div>
    return (
        <a href={button.url} className='event-card' {...(button.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
            {inner}
        </a>
    )
}

export default function Events() {
    const { events, nextId, loading, error } = useChoreoEvents()

    return (
        <div className="events-page">
            <div className='events-content'>
                <h2 className='events-header'>DaytOn1 Events</h2>

                {loading && (
                    <div className='events-grid' aria-busy='true'>
                        {[0, 1, 2].map(i => <div key={i} className='event-card event-card-skeleton' />)}
                    </div>
                )}

                {!loading && (error || !events.length) && (
                    <div className='events-empty'>
                        <p>{error ? 'Events couldn’t load right now.' : 'No events on the calendar right now.'}</p>
                        <p>Follow us for the next social:</p>
                        <div className='events-empty-links'>
                            <a href={INSTAGRAM} target='_blank' rel='noreferrer'>Instagram</a>
                            <a href={FACEBOOK} target='_blank' rel='noreferrer'>Facebook</a>
                        </div>
                    </div>
                )}

                {!loading && events.length > 0 && (
                    <div className='events-grid'>
                        {events.map(event => <EventCard key={event.id} event={event} next={event.id === nextId} />)}
                    </div>
                )}
            </div>
        </div>
    )
}
