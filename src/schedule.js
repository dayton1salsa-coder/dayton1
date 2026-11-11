// Turns Choreo's class list into what the Classes page shows:
// "Mondays · Nov 2, 9, 16, 23", "(No class Nov 30)", the class times, and
// one-off events. Heather edits classes in Choreo; this page follows.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const localDate = (iso, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
const localTime = (iso, tz) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(iso))

// "18:30" -> "6:30" (evening classes, like the old page); mornings keep "AM".
function clock(hhmm) {
    const [h, m] = hhmm.split(':').map(Number)
    const h12 = ((h + 11) % 12) + 1
    return `${h12}:${String(m).padStart(2, '0')}${h < 12 ? ' AM' : ''}`
}
function joinDays(list) {
    return list.length <= 1 ? (list[0] || '') : `${list.slice(0, -1).join(', ')} & ${list[list.length - 1]}`
}

export function buildSchedule(data) {
    if (!data) return null
    const tz = data.studio?.timezone || 'America/New_York'
    const weekly = data.weekly || []
    const today = localDate(new Date().toISOString(), tz) // "2026-11-09"
    let [y, m] = today.split('-').map(Number)

    const canceledDays = new Set((data.canceled_classes || []).filter(c => c.weekly).map(c => localDate(c.starts_at, tz)))
    const weekdays = [...new Set(weekly.map(w => w.weekday))].sort()
    const datesIn = (yy, mm) => {
        const n = new Date(Date.UTC(yy, mm, 0)).getUTCDate()
        const out = []
        for (let d = 1; d <= n; d++) {
            if (weekdays.includes(new Date(Date.UTC(yy, mm - 1, d)).getUTCDay())) {
                out.push(`${yy}-${String(mm).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
            }
        }
        return out
    }
    // This month's classes are all over: show next month.
    let dates = datesIn(y, m)
    if (weekdays.length && !dates.some(d => d >= today)) {
        m = m === 12 ? 1 : m + 1
        y = m === 1 ? y + 1 : y
        dates = datesIn(y, m)
    }
    const pretty = (d) => `${SHORT[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8))}`
    const held = dates.filter(d => !canceledDays.has(d))
    const off = dates.filter(d => canceledDays.has(d))
    const list = held.map(pretty)
    const datesList = list.length ? `${list[0]}${list.length > 1 ? ', ' + list.slice(1).map(x => x.split(' ')[1]).join(', ') : ''}` : ''

    const monthKey = `${y}-${String(m).padStart(2, '0')}`
    const events = (data.classes || []).filter(c => !c.weekly && localDate(c.starts_at, tz).startsWith(monthKey)).map(c => ({
        id: c.id,
        title: pretty(localDate(c.starts_at, tz)),
        description: `${c.title} ${localTime(c.starts_at, tz)}${c.duration_min ? ` - ${localTime(new Date(Date.parse(c.starts_at) + c.duration_min * 60000).toISOString(), tz)}` : ''}`
    }))

    // Class times, per weekday (most studios: one night a week).
    const blocks = weekdays.map(wd => ({
        weekday: wd,
        day: DAYS[wd],
        rows: weekly.filter(w => w.weekday === wd).map(w => ({ time: clock(w.start_time), title: w.title }))
    }))

    const place = weekly.find(w => w.location)?.location || (data.classes || []).find(c => c.location)?.location || null
    return {
        month: MONTHS[m - 1],
        dayName: joinDays(weekdays.map(d => DAYS[d])),
        datesList,
        cancellationNote: off.length ? `(No class ${off.map(pretty).join(', ')})` : '',
        announcement: data.studio?.announcement || '',
        specialEvents: events,
        blocks,
        place
    }
}
