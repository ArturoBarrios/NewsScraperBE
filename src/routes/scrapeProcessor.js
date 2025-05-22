import express from 'express'
import { processIncomingArticle } from '../controllers/processScrapedArticle.js'

const router = express.Router()

router.post('/processScrapedNewsArticle', async (req, res) => {
  try {
    const result = await processIncomingArticle(req.body)
    console.log('✅ Processed article:', result)
    res.json({ status: 'ok', data: result })

  } catch (err) {
    console.error('❌ Error processing scraped article:', err)
    res.status(500).json({ error: 'Failed to process article' })
  }
})

export default router
