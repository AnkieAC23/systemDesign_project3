// Below we will use the Express Router to define a series of API endpoints.
// Express will listen for API requests and respond accordingly
import express from 'express'
const router = express.Router()

// Set this to match the model name in your Prisma schema
const model = 'outfits'

// Prisma lets NodeJS communicate with MongoDB
// Let's import and initialize the Prisma client
// See also: https://www.prisma.io/docs
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()


// ----- CREATE (POST) -----
// Create a new record for the configured model
// This is the 'C' of CRUD
router.post('/data', async (req, res) => {
    try {
        const created = await prisma[model].create({
            data: req.body
        })
        res.status(201).send(created)
    } catch (err) {
        console.error('POST /data error:', err)
        res.status(500).send({ error: 'Failed to create record', details: err.message || err })
    }
})

// Create via /outfits: map incoming frontend fields to Prisma model
router.post('/outfits', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.oidc || !req.oidc.user) {
            return res.status(401).send({ error: 'Not authenticated' })
        }

        const userId = req.oidc.user.sub
        const payload = req.body || {}
        // Normalize incoming date values: if the client sent a date-only string
        // like 'YYYY-MM-DD', treat it as UTC midnight for consistent storage.
        const normalizeDate = (d) => {
            if (!d) return null
            if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
                return new Date(d + 'T00:00:00Z')
            }
            return new Date(d)
        }

        // Validate required fields: photo (image or photoURL), date, title
        const hasPhoto = Boolean(payload.image || payload.photoURL)
        const hasDate = Boolean(payload.date)
        const hasTitle = Boolean(payload.name || payload.title)
        if (!hasPhoto || !hasDate || !hasTitle) {
            return res.status(400).send({ error: 'Missing required fields', details: { photo: !!hasPhoto, date: !!hasDate, title: !!hasTitle } })
        }

        const data = {
            userId: userId,
            photoURL: payload.image || payload.photoURL,
            date: payload.date ? normalizeDate(payload.date) : null,
            title: payload.name || payload.title || null,
            brands: payload.brands || null,
            occasion: payload.occasion || null,
            rating: payload.rating != null ? Number(payload.rating) : null,
            notes: payload.notes || null
        }

        const created = await prisma[model].create({ data })
        res.status(201).send(created)
    } catch (err) {
        console.error('POST /outfits error:', err)
        res.status(500).send({ error: 'Failed to create outfit', details: err.message || err })
    }
})


// ----- READ (GET) list ----- 
router.get('/outfits', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.oidc || !req.oidc.user) {
            return res.status(401).send({ error: 'Not authenticated' })
        }

        const userId = req.oidc.user.sub
        // fetch records for this user only
        const result = await prisma[model].findMany({
            where: { userId: userId },
            take: 100
        })
        res.send(result)
    } catch (err) {
        console.error('GET /data error:', err)
        res.status(500).send({ error: 'Failed to fetch records', details: err.message || err })
    }
})

// GET single outfit by id
router.get('/outfits/:id', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.oidc || !req.oidc.user) {
            return res.status(401).send({ error: 'Not authenticated' })
        }

        const userId = req.oidc.user.sub
        const id = req.params.id
        const item = await prisma[model].findFirst({ 
            where: { 
                id: id,
                userId: userId 
            } 
        })
        if (!item) return res.status(404).send({ error: 'Not found' })
        res.send(item)
    } catch (err) {
        console.error('GET /outfits/:id error:', err)
        res.status(500).send({ error: 'Failed to fetch outfit', details: err.message || err })
    }
})



// ----- findMany() with search ------- 
// Accepts optional search parameter to filter by name field
// See also: https://www.prisma.io/docs/orm/reference/prisma-client-reference#examples-7
router.get('/search', async (req, res) => {
    try {
        // get search terms from query string, default to empty string
        const searchTerms = req.query.terms || ''
        // fetch the records from the database
        const result = await prisma[model].findMany({
            where: {
                name: {
                    contains: searchTerms,
                    mode: 'insensitive'  // case-insensitive search
                }
            },
            orderBy: { name: 'asc' },
            take: 10
        })
        res.send(result)
    } catch (err) {
        console.error('GET /search error:', err)
        res.status(500).send({ error: 'Search failed', details: err.message || err })
    }
})


// ----- UPDATE (PUT) -----
router.put('/outfits/:id', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.oidc || !req.oidc.user) {
            return res.status(401).send({ error: 'Not authenticated' })
        }

        const userId = req.oidc.user.sub
        const id = req.params.id
        const payload = req.body || {}
        console.log('PUT /outfits/:id called with id=', id, 'payload=', JSON.stringify(payload).slice(0,1000))
        
        // First verify the outfit belongs to this user
        const existing = await prisma[model].findFirst({
            where: { 
                id: id,
                userId: userId 
            }
        })
        if (!existing) {
            return res.status(404).send({ error: 'Not found or unauthorized' })
        }

        const data = {}
        if (payload.title !== undefined) data.title = payload.title
        if (payload.notes !== undefined) data.notes = payload.notes
        if (payload.brands !== undefined) data.brands = payload.brands
        if (payload.occasion !== undefined) data.occasion = payload.occasion
        if (payload.rating !== undefined) data.rating = payload.rating
        if (payload.date !== undefined) {
            // If date was sent as YYYY-MM-DD, interpret it as UTC midnight.
            if (typeof payload.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
                data.date = new Date(payload.date + 'T00:00:00Z')
            } else {
                data.date = payload.date ? new Date(payload.date) : null
            }
        }

        const updated = await prisma[model].update({ where: { id }, data })
        res.send(updated)
    } catch (err) {
        console.error('PUT /outfits/:id error:', err)
        res.status(500).send({ error: 'Failed to update outfit', details: err.message || err })
    }
})


// ----- DELETE -----
router.delete('/outfits/:id', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.oidc || !req.oidc.user) {
            return res.status(401).send({ error: 'Not authenticated' })
        }

        const userId = req.oidc.user.sub
        const id = req.params.id
        
        // First verify the outfit belongs to this user
        const existing = await prisma[model].findFirst({
            where: { 
                id: id,
                userId: userId 
            }
        })
        if (!existing) {
            return res.status(404).send({ error: 'Not found or unauthorized' })
        }

        const deleted = await prisma[model].delete({ where: { id } })
        res.send(deleted)
    } catch (err) {
        console.error('DELETE /outfits/:id error:', err)
        res.status(500).send({ error: 'Failed to delete outfit', details: err.message || err })
    }
})

// ----- GET CURRENT USER -----
// Get the current authenticated user's information
router.get('/user', (req, res) => {
    try {
        if (req.oidc && req.oidc.user) {
            res.send(req.oidc.user)
        } else {
            res.status(401).send({ error: 'Not authenticated' })
        }
    } catch (err) {
        console.error('GET /user error:', err)
        res.status(500).send({ error: 'Failed to get user', details: err.message || err })
    }
})

// export the api routes for use elsewhere in our app 
// (e.g. in index.js )
export default router;

