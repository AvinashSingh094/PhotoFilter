import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import express from 'express'
import multer from 'multer'
import OpenAI, { toFile } from 'openai'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
})

const PORT = process.env.PORT || 3000

app.post('/api/filter', upload.single('image'), async (req, res) => {
  try {
    const apiKey = (
      process.env.OPENAI_API_KEY ||
      process.env.VITE_OPENAI_API_KEY ||
      ''
    ).trim()

    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      return res.status(500).json({ error: 'Server OpenAI API key is not configured.' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required.' })
    }

    const prompt = req.body?.prompt
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' })
    }

    const client = new OpenAI({ apiKey, maxRetries: 2 })
    const imageFile = await toFile(req.file.buffer, req.file.originalname || 'capture.jpg', {
      type: req.file.mimetype || 'image/jpeg',
    })

    const response = await client.images.edit({
      model: 'gpt-image-2.6-flare',
      image: imageFile,
      prompt,
      quality: 'high',
      size: '1024x1536',
      output_format: 'png',
    })

    const b64 = response.data?.[0]?.b64_json
    if (!b64) {
      return res.status(502).json({ error: 'No image returned from image service.' })
    }

    res.json({ b64_json: b64 })
  } catch (err) {
    console.error('Image generation error:', err)
    res.status(err?.status || 500).json({ error: 'Failed to apply filter.' })
  }
})

// Serve built React app in production
const distPath = path.join(__dirname, 'dist')
app.use(express.static(distPath))

app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
