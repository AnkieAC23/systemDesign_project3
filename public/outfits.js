// All code generated with the help of GitHub Copilot with minor modifications by Ankie Chen. 
// outfits.js — page logic for outfits view
const datePicker = document.getElementById('datePicker')
const loadDateBtn = document.getElementById('loadDate')
const editBtn = document.getElementById('editEntry')
const deleteBtn = document.getElementById('deleteEntry')
const outfitContainer = document.getElementById('outfitContainer')
const prevDate = document.getElementById('prevDate')
const nextDate = document.getElementById('nextDate')
const confirmModal = document.getElementById('confirmModal')
const confirmMessage = document.getElementById('confirmMessage')
const confirmList = document.getElementById('confirmList')
const confirmCancel = document.getElementById('confirmCancel')
const confirmOk = document.getElementById('confirmOk')

let outfits = []
let availableDates = []
let currentDate = null

function isoDateOnly(dt) {
  // Normalize stored date values to YYYY-MM-DD without timezone shifts.
  if (!dt) return null
  if (typeof dt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dt)) return dt
  const d = new Date(dt)
  if (isNaN(d)) return null
  // Use UTC components so stored UTC-midnight values map to the intended calendar day
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatLocalYYYYMMDD(d) {
  // Keep a UTC-based formatter for consistency with stored dates
  if (!(d instanceof Date)) d = new Date(d)
  if (isNaN(d)) return null
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatLongDate(dateStr) {
  if (!dateStr) return ''
  // Parse stored values and display the calendar date using UTC so we
  // don't accidentally show the previous day in timezones behind UTC.
  let d
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    d = new Date(dateStr + 'T00:00:00Z')
  } else {
    d = new Date(dateStr)
  }
  if (isNaN(d)) return dateStr
  const opts = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }
  return d.toLocaleDateString(undefined, opts)
}

function shiftDateBy(dateStr, days) {
  // dateStr is expected as YYYY-MM-DD; parse as UTC midnight then shift using UTC methods
  const base = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(dateStr + 'T00:00:00Z') : (dateStr ? new Date(dateStr) : new Date())
  base.setUTCDate(base.getUTCDate() + days)
  const y = base.getUTCFullYear()
  const m = String(base.getUTCMonth() + 1).padStart(2, '0')
  const day = String(base.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function showConfirm(message, items=[]) {
  return new Promise(resolve => {
    confirmMessage.textContent = message
    confirmList.innerHTML = ''
    if (items && items.length) {
      // render radio list
      items.forEach((it, i) => {
        const id = `confirm_item_${i}`
        const row = document.createElement('div')
        row.className = 'confirm-row'
        row.innerHTML = `<label><input type="radio" name="confirmPick" value="${i}" ${i===0? 'checked' : ''}/> ${it.title || 'Untitled'}</label>`
        confirmList.appendChild(row)
      })
    }
    confirmModal.setAttribute('aria-hidden', 'false')
    confirmModal.style.display = 'flex'

    function cleanup(result) {
      confirmModal.setAttribute('aria-hidden', 'true')
      confirmModal.style.display = 'none'
      confirmCancel.removeEventListener('click', onCancel)
      confirmOk.removeEventListener('click', onOk)
      resolve(result)
    }
    function onCancel() { cleanup(null) }
    function onOk() {
      if (!items || items.length===0) return cleanup(true)
      const selected = confirmList.querySelector('input[name="confirmPick"]:checked')
      const idx = selected ? Number(selected.value) : 0
      cleanup(items[idx])
    }
    confirmCancel.addEventListener('click', onCancel)
    confirmOk.addEventListener('click', onOk)
  })
}

// showAlert: use the existing confirm modal UI but present a single-OK dialog
function showAlert(message) {
  return new Promise(resolve => {
    const modal = document.getElementById('confirmModal')
    const msg = document.getElementById('confirmMessage')
    const list = document.getElementById('confirmList')
    const cancel = document.getElementById('confirmCancel')
    const ok = document.getElementById('confirmOk')
    if (!modal || !msg || !ok) {
      alert(message)
      return resolve()
    }
    msg.textContent = message
    list.innerHTML = ''
    cancel.style.display = 'none'
    const prevText = ok.textContent
    ok.textContent = 'OK'
    modal.setAttribute('aria-hidden', 'false')
    modal.style.display = 'flex'

    function cleanup() {
      modal.setAttribute('aria-hidden', 'true')
      modal.style.display = 'none'
      cancel.style.display = ''
      ok.textContent = prevText
      cancel.removeEventListener('click', onCancel)
      ok.removeEventListener('click', onOk)
      resolve()
    }
    function onCancel() { cleanup() }
    function onOk() { cleanup() }
    cancel.addEventListener('click', onCancel)
    ok.addEventListener('click', onOk)
  })
}

async function loadAll() {
  const res = await fetch('/outfits')
  if (!res.ok) return
  outfits = await res.json()
  // normalize date keys
  const dates = new Set()
  outfits.forEach(o => {
    const d = isoDateOnly(o.date)
    if (d) dates.add(d)
  })
  availableDates = Array.from(dates).sort()
  // read optional ?date= param and prefer it if present
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('date')
  // set currentDate to requested if present, else today or first available
  const today = formatLocalYYYYMMDD(new Date())
  if (requested) {
    currentDate = requested
  } else {
    // Prefer today's date if any outfits exist for today; otherwise fall back
    // to the most recent available date (latest) so users see the newest entries.
    if (availableDates.includes(today)) currentDate = today
    else currentDate = availableDates.length ? availableDates[availableDates.length - 1] : today
  }
  datePicker.value = currentDate
  renderForDate(currentDate)
}

// no dropdown to render; date selection is via date input

function renderForDate(dateStr) {
  currentDate = dateStr
  datePicker.value = dateStr
  outfitContainer.querySelectorAll('.outfit-card, .empty-card').forEach(n => n.remove())

  const matches = outfits.filter(o => isoDateOnly(o.date) === dateStr)
  if (!matches || matches.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'empty-card'
    empty.innerHTML = `<div class="empty-content">Your wardrobe is empty.<br/>Start by adding an outfit!</div>`
    outfitContainer.appendChild(empty)
    outfitContainer.style.background = 'transparent'
    return
  }

  outfitContainer.style.background = 'transparent'
  matches.forEach(item => {
    const card = document.createElement('article')
    card.className = 'outfit-card'
    const imgHtml = item.photoURL ? `<img src="${item.photoURL}" alt="${item.title || 'Outfit'}"/>` : `<div class="no-photo">No image</div>`
    // Build tags: put occasion on its own row and brands on a separate row
    const occasionHtml = item.occasion ? `<div class="card-occasion"><span class="tag occasion-tag">${item.occasion}</span></div>` : ''
    const brandsHtml = (item.brands && item.brands.length) ? `<div class="card-brands">${item.brands.map(b => `<span class="tag brand-tag">${b}</span>`).join('')}</div>` : ''
    const tagsHtml = (occasionHtml || brandsHtml) ? `<div class="card-tags">${occasionHtml}${brandsHtml}</div>` : ''
    const stars = item.rating != null ? '★'.repeat(item.rating) + '☆'.repeat(5-item.rating) : '<i>No rating</i>'
    card.innerHTML = `
      <div class="card-left">${imgHtml}${tagsHtml}</div>
      <div class="card-right">
        <h3 class="card-title">${item.title || 'Untitled'}</h3>
        <div class="card-date">${formatLongDate(item.date) || 'No date'}</div>
        <div class="card-rating">${stars}</div>
        <div class="card-notes"><strong>Personal Note:</strong> ${item.notes || '<i>No notes</i>'}</div>
      </div>
    `
    card.dataset.id = item.id
    outfitContainer.appendChild(card)
  })
}

function setDateTo(idx) {
  if (!availableDates.length) return
  if (idx < 0) idx = 0
  if (idx >= availableDates.length) idx = availableDates.length -1
  renderForDate(availableDates[idx])
}

function gotoPrevDate() {
  const idx = availableDates.indexOf(currentDate)
  if (idx > 0) setDateTo(idx-1)
}
function gotoNextDate() {
  const idx = availableDates.indexOf(currentDate)
  if (idx < availableDates.length-1) setDateTo(idx+1)
}

// Auto-load when the user picks a date — update URL and render immediately
datePicker.addEventListener('change', (e) => {
  const val = e.target.value
  if (!val) return
  if (!availableDates.includes(val)) availableDates.push(val)
  availableDates.sort()
  const url = '/outfits.html?date=' + encodeURIComponent(val)
  history.pushState({}, '', url)
  renderForDate(val)
})

prevDate.addEventListener('click', () => renderForDate(shiftDateBy(currentDate, -1)))
nextDate.addEventListener('click', () => renderForDate(shiftDateBy(currentDate, 1)))

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') renderForDate(shiftDateBy(currentDate, -1))
  if (e.key === 'ArrowRight') renderForDate(shiftDateBy(currentDate, 1))
})

deleteBtn.addEventListener('click', async () => {
  if (!currentDate) return
  const matches = outfits.filter(o => isoDateOnly(o.date) === currentDate)
  if (!matches.length) return showAlert('No outfits to delete for this date.')
  if (matches.length === 1) {
    const picked = await showConfirm(`Delete "${matches[0].title || 'Untitled'}" for ${currentDate}?`)
    if (!picked) return
    const res = await fetch(`/outfits/${matches[0].id}`, { method: 'DELETE' })
    if (res.ok) { await loadAll(); renderForDate(currentDate) }
    else showAlert('Delete failed')
    return
  }
  // multiple: show modal list
  const picked = await showConfirm(`Choose an outfit to delete for ${currentDate}:`, matches)
  if (!picked) return
  const res = await fetch(`/outfits/${picked.id}`, { method: 'DELETE' })
  if (res.ok) { await loadAll(); renderForDate(currentDate) }
  else showAlert('Delete failed')
})

editBtn.addEventListener('click', async () => {
  const matches = outfits.filter(o => isoDateOnly(o.date) === currentDate)
  if (matches.length === 0) return showAlert('No outfit to edit for this date.')
  if (matches.length === 1) {
    window.location.href = `/index.html?editId=${encodeURIComponent(matches[0].id)}&date=${encodeURIComponent(currentDate)}`
    return
  }
  const picked = await showConfirm(`Choose an outfit to edit for ${currentDate}:`, matches)
  if (!picked) return
  window.location.href = `/index.html?editId=${encodeURIComponent(picked.id)}&date=${encodeURIComponent(currentDate)}`
})

loadAll()

// Fetch and display user greeting
async function displayUserGreeting() {
  try {
    const response = await fetch('/user')
    if (response.ok) {
      const user = await response.json()
      const greeting = document.getElementById('outfitGreeting')
      if (greeting) {
        greeting.textContent = `Hello, ${user.nickname || user.name || 'User'}`
      }
    }
  } catch (error) {
    console.log('Could not fetch user info')
  }
}

displayUserGreeting()

// Profile dropdown toggle (non-functional Settings / Log Out links)
const profileWrapper = document.getElementById('profileMenuWrapper')
const profileDropdown = document.getElementById('profileDropdown')
if (profileWrapper && profileDropdown) {
  function hideProfileDropdown() {
    profileDropdown.style.display = 'none'
    profileDropdown.setAttribute('aria-hidden', 'true')
  }
  function showProfileDropdown() {
    profileDropdown.style.display = 'block'
    profileDropdown.setAttribute('aria-hidden', 'false')
  }

  profileWrapper.addEventListener('click', (ev) => {
    ev.stopPropagation()
    const isOpen = profileDropdown.getAttribute('aria-hidden') === 'false'
    if (isOpen) hideProfileDropdown()
    else showProfileDropdown()
  })

  // Close when clicking outside
  document.addEventListener('click', (ev) => {
    if (!profileWrapper.contains(ev.target)) hideProfileDropdown()
  })

  // Close on Escape
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') hideProfileDropdown()
  })

  // Handle Log Out click
  const logOutLink = profileDropdown.querySelector('.dropdown-item:nth-child(2)')
  if (logOutLink) {
    logOutLink.addEventListener('click', (ev) => {
      ev.preventDefault()
      window.location.href = '/logout'
    })
  }
}

export {}
// All code generated with the help of GitHub Copilot with minor modifications by Ankie Chen. 