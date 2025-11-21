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
let availableDates = [] // array of YYYY-MM-DD strings
let currentDate = null

function isoDateOnly(dt) {
  if (!dt) return null
  const d = new Date(dt)
  if (isNaN(d)) return null
  return d.toISOString().slice(0,10)
}

function shiftDateBy(dateStr, days) {
  const d = dateStr ? new Date(dateStr) : new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0,10)
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
  const today = new Date().toISOString().slice(0,10)
  if (requested) currentDate = requested
  else currentDate = availableDates.includes(today) ? today : (availableDates[0] || today)
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
    empty.innerHTML = `<div class="empty-content">Your wardrobe is empty. Start by adding an outfit!</div>`
    outfitContainer.appendChild(empty)
    outfitContainer.style.background = '#fdf2e0'
    return
  }

  outfitContainer.style.background = 'transparent'
  matches.forEach(item => {
    const card = document.createElement('article')
    card.className = 'outfit-card'
    const imgHtml = item.photoURL ? `<img src="${item.photoURL}" alt="${item.title || 'Outfit'}"/>` : `<div class="no-photo">No image</div>`
    const tagsHtml = (item.brands && item.brands.length) ? `<div class="card-tags">${item.brands.map(b=>`<span class="tag">${b}</span>`).join('')}</div>` : ''
    const stars = item.rating != null ? '★'.repeat(item.rating) + '☆'.repeat(5-item.rating) : '<i>No rating</i>'
    card.innerHTML = `
      <div class="card-left">${imgHtml}${tagsHtml}</div>
      <div class="card-right">
        <h3 class="card-title">${item.title || 'Untitled'}</h3>
        <div class="card-date">${isoDateOnly(item.date) || 'No date'}</div>
        <div class="card-rating">${stars}</div>
        <div class="card-notes">${item.notes || '<i>No notes</i>'}</div>
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

loadDateBtn.addEventListener('click', () => {
  const val = datePicker.value
  if (!val) return
  if (!availableDates.includes(val)) availableDates.push(val)
  availableDates.sort()
  // update URL to include ?date= so user can share/bookmark
  const url = '/outfits.html?date=' + encodeURIComponent(val)
  history.pushState({}, '', url)
  renderForDate(val)
})

datePicker.addEventListener('change', (e) => {
  const v = e.target.value
  if (v) {
    // just update picker; load is via submit button
  }
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
  if (!matches.length) return alert('No outfits to delete for this date.')
  if (matches.length === 1) {
    const picked = await showConfirm(`Delete "${matches[0].title || 'Untitled'}" for ${currentDate}?`)
    if (!picked) return
    const res = await fetch(`/outfits/${matches[0].id}`, { method: 'DELETE' })
    if (res.ok) { await loadAll(); renderForDate(currentDate) }
    else alert('Delete failed')
    return
  }
  // multiple: show modal list
  const picked = await showConfirm(`Choose an outfit to delete for ${currentDate}:`, matches)
  if (!picked) return
  const res = await fetch(`/outfits/${picked.id}`, { method: 'DELETE' })
  if (res.ok) { await loadAll(); renderForDate(currentDate) }
  else alert('Delete failed')
})

editBtn.addEventListener('click', async () => {
  const matches = outfits.filter(o => isoDateOnly(o.date) === currentDate)
  if (matches.length === 0) return alert('No outfit to edit for this date.')
  if (matches.length === 1) {
    window.location.href = `/index.html?editId=${encodeURIComponent(matches[0].id)}&date=${encodeURIComponent(currentDate)}`
    return
  }
  const picked = await showConfirm(`Choose an outfit to edit for ${currentDate}:`, matches)
  if (!picked) return
  window.location.href = `/index.html?editId=${encodeURIComponent(picked.id)}&date=${encodeURIComponent(currentDate)}`
})

// initialize
loadAll()

export {}
