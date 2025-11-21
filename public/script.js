let readyStatus, notReadyStatus, myForm, contentArea

let editId = null

document.addEventListener('DOMContentLoaded', async () => {
    readyStatus = document.querySelector('#readyStatus')
    notReadyStatus = document.querySelector('#notReadyStatus')
    myForm = document.querySelector('#myForm')
    contentArea = document.querySelector('#content')

    // New form controls
    const imageInput = document.getElementById('image')
    const imagePreview = document.getElementById('imagePreview')
    const brandInput = document.getElementById('brandInput')
    const occasionSelect = document.getElementById('occasionSelect')
    const occasionOther = document.getElementById('occasionOther')
    const starRating = document.getElementById('starRating')
    const saveButton = document.getElementById('saveButton')

    let brands = []
    let imageDataUrl = null
    let rating = 0

    // detect editId from query string and populate form if present
    const params = new URLSearchParams(window.location.search)
    const maybeEdit = params.get('editId')
    if (maybeEdit) {
        editId = maybeEdit
        try {
            const res = await fetch('/outfits/' + encodeURIComponent(editId))
            if (res.ok) {
                const item = await res.json()
                // populate fields
                const nameField = document.querySelector('#name')
                if (nameField) nameField.value = item.title || item.name || ''
                const dateField = document.querySelector('#date')
                if (dateField && item.date) dateField.value = (new Date(item.date)).toISOString().slice(0,10)
                if (item.brands && Array.isArray(item.brands)) {
                    brands = item.brands.slice()
                }
                previousOcc = item.occasion || null
                rating = item.rating != null ? Number(item.rating) : 0
                if (item.notes) {
                    const notes = document.querySelector('#notes')
                    if (notes) notes.value = item.notes
                }
                if (item.photoURL) {
                    imageDataUrl = item.photoURL
                    if (imagePreview) {
                        imagePreview.innerHTML = ''
                        const img = document.createElement('img')
                        img.src = imageDataUrl
                        imagePreview.appendChild(img)
                    }
                }
                renderTags()
                updateStars()
            }
        } catch (err) {
            console.error('Failed to load outfit for edit', err)
        }
    }

    // Image preview
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0]
            if (!file) {
                imagePreview.textContent = 'No image'
                imagePreview.innerHTML = 'No image'
                imageDataUrl = null
                return
            }
            const reader = new FileReader()
            reader.onload = () => {
                imageDataUrl = reader.result
                imagePreview.innerHTML = ''
                const img = document.createElement('img')
                img.src = imageDataUrl
                imagePreview.appendChild(img)
            }
            reader.readAsDataURL(file)
        })
    }

    // Tags handling: separate brand tags and occasion tag
    const occasionTagsContainer = document.getElementById('occasionTags')
    const brandTagsContainer = document.getElementById('brandTags')

    function renderTags() {
        // Render occasion (single) and brand list
        if (occasionTagsContainer) {
            occasionTagsContainer.innerHTML = ''
            if (previousOcc) {
                const span = document.createElement('span')
                span.className = 'tag'
                span.textContent = previousOcc
                const btn = document.createElement('button')
                btn.type = 'button'
                btn.title = 'Remove occasion'
                btn.textContent = '×'
                btn.addEventListener('click', () => {
                    previousOcc = null
                    renderTags()
                })
                span.appendChild(btn)
                occasionTagsContainer.appendChild(span)
            }
        }
        if (brandTagsContainer) {
            brandTagsContainer.innerHTML = ''
            brands.forEach((t, i) => {
                const span = document.createElement('span')
                span.className = 'tag'
                span.textContent = t
                const btn = document.createElement('button')
                btn.type = 'button'
                btn.title = 'Remove brand'
                btn.textContent = '×'
                btn.addEventListener('click', () => {
                    brands.splice(i, 1)
                    renderTags()
                })
                span.appendChild(btn)
                brandTagsContainer.appendChild(span)
            })
        }
    }

    function addBrand(value) {
        const v = value.trim()
        if (!v) return
        if (!brands.includes(v)) {
            brands.push(v)
            renderTags()
        }
    }

    if (brandInput) {
        brandInput.addEventListener('keydown', (e) => {
            // Prevent Enter from submitting the whole form when typing brands
                if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                    addBrand(brandInput.value)
                brandInput.value = ''
                return
            }
            // Allow adding a tag with comma as well
            if (e.key === ',') {
                e.preventDefault()
                e.stopPropagation()
                addBrand(brandInput.value.replace(',', ''))
                brandInput.value = ''
                return
            }
        })

        brandInput.addEventListener('blur', () => {
            if (brandInput.value.trim() !== '') {
                addBrand(brandInput.value)
                brandInput.value = ''
            }
        })
    }

    // Also prevent form submit when Enter is pressed while focused on brand input
    if (myForm && brandInput) {
        myForm.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && document.activeElement === brandInput) {
                e.preventDefault()
                e.stopPropagation()
                addBrand(brandInput.value)
                brandInput.value = ''
            }
        })
    }

    // Occasion: show 'Other' input when selected and add as a tag
    let previousOcc = null
    if (occasionSelect) {
        occasionSelect.addEventListener('change', () => {
            const val = occasionSelect.value
            if (val === 'Other' && occasionOther) {
                occasionOther.style.display = 'block'
            } else if (occasionOther) {
                occasionOther.style.display = 'none'
            }
            // set the current occasion (do not mix with brands)
            if (val && val !== 'Other') {
                previousOcc = val
            } else {
                previousOcc = null
            }
            renderTags()
        })
    }

    // If user types in the 'Other' textbox and blurs or presses Enter, add that as occasion tag
    if (occasionOther) {
        occasionOther.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                const v = occasionOther.value.trim()
                if (v) {
                    previousOcc = v
                    renderTags()
                }
            }
        })
        occasionOther.addEventListener('blur', () => {
            const v = occasionOther.value.trim()
            if (v) {
                previousOcc = v
                renderTags()
            }
        })
    }

    // Star rating
    if (starRating) {
        starRating.addEventListener('click', (e) => {
            const btn = e.target.closest('.star')
            if (!btn) return
            rating = Number(btn.dataset.value)
            updateStars()
        })
    }

    function updateStars() {
        if (!starRating) return
        const starButtons = starRating.querySelectorAll('.star')
        starButtons.forEach(btn => {
            const val = Number(btn.dataset.value)
            if (val <= rating) {
                btn.classList.add('active')
                btn.textContent = '★'
            } else {
                btn.classList.remove('active')
                btn.textContent = '☆'
            }
        })
    }

    // listen for form submissions
    if (myForm) {
        myForm.addEventListener('submit', event => {
            event.preventDefault()
            // handle reset button: when user clicked the reset control
            if (event.submitter && event.submitter.classList.contains('reset')) {
                brands = []
                imageDataUrl = null
                rating = 0
                renderTags()
                if (imagePreview) imagePreview.innerHTML = 'No image'
                updateStars()
                myForm.reset()
                return
            }

            // validation: name required
            const nameField = myForm.querySelector('#name')
            if (!nameField.checkValidity()) {
                alert('Please provide a title/name for the entry.')
                return
            }

            // assemble JSON data
            const data = {}
            data.name = nameField.value.trim()
            const dateVal = myForm.querySelector('#date').value
            data.date = dateVal ? new Date(dateVal).toISOString() : null
            data.brands = brands.slice()
            const occ = occasionSelect ? occasionSelect.value : null
            data.occasion = (occ === 'Other') ? (occasionOther ? occasionOther.value.trim() || null : null) : (occ || null)
            data.rating = rating
            data.notes = myForm.querySelector('#notes').value.trim() || null
            data.image = imageDataUrl // data URL or null

            console.log('Submitting entry:', data)
            createItem(data)
        })
    }

    // initial data load removed on index page to avoid listing outfits here

})


// Given some JSON data, send the data to the API
// NOTE: "async" makes it possible to use "await" 
// See also: https://mdn.io/Statements/async_function
const createItem = async (myData) => {
    // The save operation is nested in a Try/Catch statement
    // See also: https://mdn.io/Statements/try...catch
    try {
        // Let's send the data to the /item endpoint
        // we'll add the data to the body of the request. 
        // https://mdn.io/Fetch_API/Using_Fetch#body

        // We will use the POST method to signal that we want to create a new item
        // Let's also add headers to tell the server we're sending JSON
        // The data is sent in serialized form (via JSON.stringify) 

        const method = editId ? 'PUT' : 'POST'
        const url = editId ? ('/outfits/' + encodeURIComponent(editId)) : '/outfits'
        const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        const response = await fetch(url, { method, headers, body: JSON.stringify(myData) })
        // Check if the response status is OK 
        if (!response.ok) {
            try {
                console.error(await response.json())
            }
            catch (err) {
                console.error(response.statusText)
            }
            throw new Error(response.statusText)
        }
        // If all goes well we will recieve back the submitted data
        // along with a new _id field added by MongoDB
        const result = await response.json()
        // on success redirect to the outfits page so the user can view the saved or updated entry
        console.log('Saved/updated', result)
        const redirectDate = myData && myData.date ? myData.date.slice(0,10) : ''
        const outUrl = '/outfits.html' + (redirectDate ? ('?date=' + encodeURIComponent(redirectDate)) : '')
        window.location.href = outUrl
    }
    catch (err) {
        // Log any errors
        console.error(err)
    }
} // end of save function


// fetch items from API endpoint and populate the content div
const getData = async () => {
    const response = await fetch('/outfits')
    if (response.ok) {
        readyStatus.style.display = 'block'
        const data = await response.json()
        console.log(data)
        if (data.length == 0) {
            contentArea.innerHTML += '<p><i>No data found in the database.</i></p>'
            return
        }
        else {
            contentArea.innerHTML = '<h2>Outfit Entries</h2>'
            data.forEach(item => {
                let div = document.createElement('div')
                div.innerHTML = `<h3>${item.title || item.name || 'Untitled'}</h3>
            <p>Occasion: ${item.occasion || '<i>Not specified</i>'}</p>
            <p>Brands: ${item.brands ? JSON.stringify(item.brands) : '<i>None</i>'}</p>
            <p>Rating: ${item.rating != null ? item.rating : '<i>None</i>'}</p>
            <p>${item.notes || '<i>No Notes</i>'}</p>
            `
                contentArea.appendChild(div)
            })
        }

    }
    else {

        notReadyStatus.style.display = 'block'

    }

}
