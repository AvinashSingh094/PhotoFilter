import { useState, useRef, useEffect, useCallback } from 'react'
import OpenAI from 'openai'
import { QRCodeSVG } from 'qrcode.react'
import {
  Camera,
  RotateCcw,
  Download,
  Upload,
  AlertCircle,
  Loader2,
  Eye,
  ArrowLeft,
  ArrowRight,
  Home,
  Check,
  Printer,
  X,
} from 'lucide-react'

const MODEL_NAME = 'gpt-image-2.6-flare'
const TARGET_WIDTH = 1024
const TARGET_HEIGHT = 1536
const TARGET_ASPECT = TARGET_WIDTH / TARGET_HEIGHT
const RUPAY_LOGO_SRC = '/rupay-logo.png'
const ANYMA_LOGO_SRC = '/anyma-logo.png'
const STYLE_REF_SRC = '/style-ref.jpg'
const STRIP_HEIGHT = 176

const FILTER_THEMES = [
  {
    id: 'crimson-cyan',
    name: 'Crimson & Cyan',
    subtitle: 'Crimson light waves · Cyan glow',
    primarySwatch: '#f43f5e',
    secondarySwatch: '#06b6d4',
    previewBg:
      'radial-gradient(circle at 18% 18%, rgba(244, 63, 94, 0.55), transparent 55%), radial-gradient(circle at 85% 75%, rgba(6, 182, 212, 0.5), transparent 55%), #09090b',
    buttonGradient: 'from-rose-600 to-cyan-600 hover:from-rose-500 hover:to-cyan-500',
    glowShadow: 'shadow-[0_0_50px_-15px_rgba(244,63,94,0.28)]',
    lightingPrompt:
      'Match the exact visual style, lighting, color palette, smooth glossy airbrushed skin finish, and foreground wave-like neon red light-leak smear of Image 2: deep glowing crimson-red washes across the hair, background, and a bright sweeping crimson light wave/flare blooming across the lower-left foreground and chest, paired with intense electric cyan-teal highlights glowing across the left side of the face, nose, cheekbones, forehead, and neck, plus warm glowing highlights on the right cheek/jaw and pitch-black deep shadows',
  },
  {
    id: 'violet-blue',
    name: 'Ultraviolet & Blue',
    subtitle: 'Magenta light waves · Electric blue glow',
    primarySwatch: '#d946ef',
    secondarySwatch: '#3b82f6',
    previewBg:
      'radial-gradient(circle at 18% 18%, rgba(217, 70, 239, 0.55), transparent 55%), radial-gradient(circle at 85% 75%, rgba(59, 130, 246, 0.5), transparent 55%), #09090b',
    buttonGradient: 'from-fuchsia-600 to-blue-600 hover:from-fuchsia-500 hover:to-blue-500',
    glowShadow: 'shadow-[0_0_50px_-15px_rgba(217,70,239,0.28)]',
    lightingPrompt:
      'Match the exact visual style, lighting structure, smooth glossy airbrushed finish, and sweeping foreground light-wave smear of Image 2, but remap its crimson-red tones to vivid neon magenta-violet and its cyan-teal tones to electric cobalt-blue: glowing magenta-violet washes across the hair, background, and a bright sweeping magenta light wave/flare blooming across the lower-left foreground and chest, paired with intense electric blue highlights across the face, cheekbones, and neck against pitch-black deep shadows',
  },
  {
    id: 'amber-teal',
    name: 'Cyber Gold & Teal',
    subtitle: 'Golden light waves · Deep cyan glow',
    primarySwatch: '#f59e0b',
    secondarySwatch: '#14b8a6',
    previewBg:
      'radial-gradient(circle at 18% 18%, rgba(245, 158, 11, 0.55), transparent 55%), radial-gradient(circle at 85% 75%, rgba(20, 184, 166, 0.5), transparent 55%), #09090b',
    buttonGradient: 'from-amber-500 to-teal-600 hover:from-amber-400 hover:to-teal-500',
    glowShadow: 'shadow-[0_0_50px_-15px_rgba(245,158,11,0.25)]',
    lightingPrompt:
      'Match the exact visual style, lighting structure, smooth glossy airbrushed finish, and sweeping foreground light-wave smear of Image 2, but remap its crimson-red tones to glowing golden-amber orange and its cyan-teal tones to deep teal-cyan: warm golden-amber washes across the hair, background, and a bright sweeping amber light wave/flare blooming across the lower-left foreground and chest, paired with intense deep teal-cyan highlights across the face, cheekbones, and neck against pitch-black deep shadows',
  },
  {
    id: 'emerald-magenta',
    name: 'Acid Green & Pink',
    subtitle: 'Emerald light waves · Hot pink glow',
    primarySwatch: '#10b981',
    secondarySwatch: '#ec4899',
    previewBg:
      'radial-gradient(circle at 18% 18%, rgba(16, 185, 129, 0.55), transparent 55%), radial-gradient(circle at 85% 75%, rgba(236, 72, 153, 0.5), transparent 55%), #09090b',
    buttonGradient: 'from-emerald-600 to-pink-600 hover:from-emerald-500 hover:to-pink-500',
    glowShadow: 'shadow-[0_0_50px_-15px_rgba(16,185,129,0.25)]',
    lightingPrompt:
      'Match the exact visual style, lighting structure, smooth glossy airbrushed finish, and sweeping foreground light-wave smear of Image 2, but remap its crimson-red tones to neon emerald-green and its cyan-teal tones to hot neon pink/magenta: glowing emerald-green washes across the hair, background, and a bright sweeping green light wave/flare blooming across the lower-left foreground and chest, paired with intense hot pink highlights across the face, cheekbones, and neck against pitch-black deep shadows',
  },
]

function buildPrompt(theme) {
  return `Transform Image 1 (the person's portrait) using ONLY the exact lighting, color grading, dreamy soft-focus glow, sweeping foreground light waves, and stylized neon music-art aesthetic of Image 2 (the style reference). STRICTLY keep the person from Image 1 100% identical in identity: preserve their exact face, facial structure, eyes, nose, mouth, hair style, beard/facial hair, clothing, pose, expression, and existing glasses/accessories—DO NOT copy the person, sunglasses, headphones, braids, or clothing from Image 2. ${theme.lightingPrompt}. Replicate Image 2's exact dreamy soft-bloom texture, intense split-color light wrapping directly over the face and hair, glowing sweeping light-leak waves across the lower foreground and dark blurred background, ultra-deep velvety black shadows, and surreal electronic-music album-art look—no cityscapes, no straight laser beams, no text.`
}

function prepareImageForApi(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(blob)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const imgAspect = img.width / img.height
      let srcWidth = img.width
      let srcHeight = img.height
      let startX = 0
      let startY = 0

      if (imgAspect > TARGET_ASPECT) {
        srcWidth = Math.round(img.height * TARGET_ASPECT)
        startX = Math.round((img.width - srcWidth) / 2)
      } else {
        srcHeight = Math.round(img.width / TARGET_ASPECT)
        startY = Math.round((img.height - srcHeight) / 2)
      }

      const canvas = document.createElement('canvas')
      canvas.width = TARGET_WIDTH
      canvas.height = TARGET_HEIGHT
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, startX, startY, srcWidth, srcHeight, 0, 0, TARGET_WIDTH, TARGET_HEIGHT)

      canvas.toBlob(
        (compressedBlob) => {
          if (!compressedBlob) {
            reject(new Error('Failed to process image'))
            return
          }
          resolve(new File([compressedBlob], 'capture.jpg', { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.92
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load input image'))
    }

    img.src = objectUrl
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

async function applyRupayStrip(photoDataUrl) {
  const [photoImg, rupayImg, anymaImg] = await Promise.all([
    loadImage(photoDataUrl),
    loadImage(RUPAY_LOGO_SRC),
    loadImage(ANYMA_LOGO_SRC),
  ])

  const width = photoImg.width || TARGET_WIDTH
  const height = photoImg.height || TARGET_HEIGHT
  const stripHeight = Math.round((STRIP_HEIGHT / TARGET_HEIGHT) * height)
  const visiblePhotoHeight = height - stripHeight

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // Draw the top/center portrait area into the space above the bottom strip
  const srcCropY = Math.round((height - visiblePhotoHeight) * 0.35)
  ctx.drawImage(
    photoImg,
    0,
    srcCropY,
    width,
    visiblePhotoHeight,
    0,
    0,
    width,
    visiblePhotoHeight
  )

  // Subtle fade into the bottom strip
  const fadeHeight = Math.round(stripHeight * 0.28)
  const fadeGrad = ctx.createLinearGradient(
    0,
    visiblePhotoHeight - fadeHeight,
    0,
    visiblePhotoHeight
  )
  fadeGrad.addColorStop(0, 'rgba(9, 9, 11, 0)')
  fadeGrad.addColorStop(1, 'rgba(9, 9, 11, 0.92)')
  ctx.fillStyle = fadeGrad
  ctx.fillRect(0, visiblePhotoHeight - fadeHeight, width, fadeHeight)

  // Solid dark bottom strip
  ctx.fillStyle = '#09090b'
  ctx.fillRect(0, visiblePhotoHeight, width, stripHeight)

  // Top hairline divider on the strip
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.fillRect(0, visiblePhotoHeight, width, 2)

  // Centered RuPay logo × Anyma logo inside the bottom strip
  const maxRupayHeight = Math.round(stripHeight * 0.44)
  const maxRupayWidth = Math.round(width * 0.34)
  const rupayAspect = rupayImg.width / rupayImg.height
  let rupayW = maxRupayHeight * rupayAspect
  let rupayH = maxRupayHeight
  if (rupayW > maxRupayWidth) {
    rupayW = maxRupayWidth
    rupayH = rupayW / rupayAspect
  }

  const maxAnymaHeight = Math.round(stripHeight * 0.56)
  const maxAnymaWidth = Math.round(width * 0.34)
  const anymaAspect = anymaImg.width / anymaImg.height
  let anymaW = maxAnymaHeight * anymaAspect
  let anymaH = maxAnymaHeight
  if (anymaW > maxAnymaWidth) {
    anymaW = maxAnymaWidth
    anymaH = anymaW / anymaAspect
  }

  const gap = Math.round(width * 0.028)
  const xFontSize = Math.round(rupayH * 0.72)

  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.font = `700 ${xFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  const xText = '×'
  const xWidth = ctx.measureText(xText).width

  const totalWidth = rupayW + gap + xWidth + gap + anymaW
  const startX = Math.round((width - totalWidth) / 2)
  const centerY = Math.round(visiblePhotoHeight + stripHeight / 2)

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(rupayImg, startX, Math.round(centerY - rupayH / 2), rupayW, rupayH)

  ctx.fillStyle = '#ffffff'
  ctx.fillText(xText, startX + rupayW + gap, centerY)

  ctx.drawImage(
    anymaImg,
    Math.round(startX + rupayW + gap + xWidth + gap),
    Math.round(centerY - anymaH / 2),
    anymaW,
    anymaH
  )

  return canvas.toDataURL('image/png')
}

async function uploadToCloudinary(dataUrl, cloudName, uploadPreset) {
  const formData = new FormData()
  formData.append('file', dataUrl)
  formData.append('upload_preset', uploadPreset)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  )

  const data = await response.json()
  if (!response.ok || !data.secure_url) {
    throw new Error(data?.error?.message || 'Cloudinary upload failed')
  }

  return data.secure_url
}

export default function App() {
  const apiKey = import.meta.env.DEV
    ? import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('openai_api_key') || ''
    : ''
  const cloudinaryCloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim()
  const cloudinaryUploadPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim()

  // Pages: 'home' | 'capture' | 'result'
  const [page, setPage] = useState('home')
  const [selectedThemeId, setSelectedThemeId] = useState(FILTER_THEMES[0].id)

  const [stream, setStream] = useState(null)
  const [cameraError, setCameraError] = useState('')
  const [sourceBlob, setSourceBlob] = useState(null)
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState('')
  const [resultImageUrl, setResultImageUrl] = useState('')
  const [showingOriginal, setShowingOriginal] = useState(false)

  const [cloudinaryUrl, setCloudinaryUrl] = useState('')
  const [isUploadingCloud, setIsUploadingCloud] = useState(false)
  const [cloudError, setCloudError] = useState('')

  // 2-up 4x6 print queue (holds up to 2 portraits: left 2x3 + right 2x3 on a 4x6 sheet)
  const [printQueue, setPrintQueue] = useState([])
  const [currentResultId, setCurrentResultId] = useState('')

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const videoRef = useRef(null)
  const fileInputRef = useRef(null)

  const selectedTheme =
    FILTER_THEMES.find((t) => t.id === selectedThemeId) || FILTER_THEMES[0]

  const stopCamera = useCallback(() => {
    setStream((currentStream) => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop())
      }
      return null
    })
  }, [])

  // Manage camera lifecycle only when on the capture page with no photo taken yet
  useEffect(() => {
    if (page !== 'capture' || sourcePreviewUrl) {
      return
    }

    let active = true
    let activeStream = null

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      .then((mediaStream) => {
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop())
          return
        }
        activeStream = mediaStream
        setCameraError('')
        setStream(mediaStream)
      })
      .catch((err) => {
        if (active) {
          setCameraError('Camera unavailable or permission denied. You can still upload a photo.')
        }
        console.error('Camera access error:', err)
      })

    return () => {
      active = false
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
      setStream(null)
    }
  }, [page, sourcePreviewUrl])

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream, page, sourcePreviewUrl])

  const resetImages = () => {
    if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl)
    setSourceBlob(null)
    setSourcePreviewUrl('')
    setResultImageUrl('')
    setCloudinaryUrl('')
    setCloudError('')
    setError('')
    setShowingOriginal(false)
  }

  const goToCapture = () => {
    setError('')
    setPage('capture')
  }

  const goHome = () => {
    stopCamera()
    resetImages()
    setPage('home')
  }

  const handleRetake = () => {
    resetImages()
    setPage('capture')
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const videoAspect = video.videoWidth / video.videoHeight
    let srcWidth = video.videoWidth
    let srcHeight = video.videoHeight
    let startX = 0
    let startY = 0

    if (videoAspect > TARGET_ASPECT) {
      srcWidth = Math.round(video.videoHeight * TARGET_ASPECT)
      startX = Math.round((video.videoWidth - srcWidth) / 2)
    } else {
      srcHeight = Math.round(video.videoWidth / TARGET_ASPECT)
      startY = Math.round((video.videoHeight - srcHeight) / 2)
    }

    const canvas = document.createElement('canvas')
    canvas.width = TARGET_WIDTH
    canvas.height = TARGET_HEIGHT
    const ctx = canvas.getContext('2d')

    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, startX, startY, srcWidth, srcHeight, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (!blob) return
      if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl)
      setSourceBlob(blob)
      setSourcePreviewUrl(URL.createObjectURL(blob))
      setResultImageUrl('')
      setError('')
      stopCamera()
    }, 'image/png')
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    try {
      const processedFile = await prepareImageForApi(file)
      if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl)
      setSourceBlob(processedFile)
      setSourcePreviewUrl(URL.createObjectURL(processedFile))
      setResultImageUrl('')
      setError('')
      stopCamera()
    } catch (err) {
      console.error('File processing error:', err)
      setError('Could not load the selected image.')
    }
  }

  const applyFilter = async () => {
    if (!sourceBlob) return

    setIsGenerating(true)
    setError('')
    setCloudinaryUrl('')
    setCloudError('')

    try {
      const imageFile = await prepareImageForApi(sourceBlob)
      const prompt = buildPrompt(selectedTheme)
      let b64 = ''

      if (import.meta.env.DEV) {
        const trimmedKey = apiKey.trim()
        if (!trimmedKey || trimmedKey === 'your_openai_api_key_here') {
          setError('API key missing. Set VITE_OPENAI_API_KEY in your .env file.')
          setIsGenerating(false)
          return
        }

        const refRes = await fetch(STYLE_REF_SRC)
        const refBlob = await refRes.blob()
        const styleRefFile = new File([refBlob], 'style-ref.jpg', {
          type: refBlob.type || 'image/jpeg',
        })

        const client = new OpenAI({
          apiKey: trimmedKey,
          baseURL: `${window.location.origin}/openai-api/v1`,
          dangerouslyAllowBrowser: true,
          maxRetries: 2,
        })

        const response = await client.images.edit({
          model: MODEL_NAME,
          image: [imageFile, styleRefFile],
          prompt,
          quality: 'high',
          size: '1024x1536',
          output_format: 'png',
        })

        b64 = response.data?.[0]?.b64_json || ''
      } else {
        const formData = new FormData()
        formData.append('image', imageFile)
        formData.append('prompt', prompt)

        const res = await fetch('/api/filter', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to apply filter.')
        }
        b64 = data?.b64_json || ''
      }

      if (!b64) {
        throw new Error('No image returned.')
      }

      const rawGeneratedDataUrl = `data:image/png;base64,${b64}`
      let finalDataUrl = rawGeneratedDataUrl
      try {
        finalDataUrl = await applyRupayStrip(rawGeneratedDataUrl)
      } catch (stripErr) {
        console.warn('Could not composite RuPay strip, falling back to raw image:', stripErr)
      }

      setResultImageUrl(finalDataUrl)
      setCurrentResultId(`${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
      setPage('result')

      // Automatically upload generated image to Cloudinary if configured
      const hasCloudinaryConfig =
        cloudinaryCloudName &&
        cloudinaryUploadPreset &&
        cloudinaryCloudName !== 'your_cloud_name_here' &&
        cloudinaryUploadPreset !== 'your_unsigned_upload_preset_here'

      if (hasCloudinaryConfig) {
        setIsUploadingCloud(true)
        uploadToCloudinary(finalDataUrl, cloudinaryCloudName, cloudinaryUploadPreset)
          .then((secureUrl) => {
            setCloudinaryUrl(secureUrl)
          })
          .catch((uploadErr) => {
            console.error('Cloudinary upload error:', uploadErr)
            setCloudError(uploadErr?.message || 'Failed to upload image for QR code.')
          })
          .finally(() => {
            setIsUploadingCloud(false)
          })
      } else {
        setCloudError(
          'Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env to enable QR code.'
        )
      }
    } catch (err) {
      console.error('Image Filter error:', err)
      setError('Failed to apply filter. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadImage = () => {
    if (!resultImageUrl) return
    const link = document.createElement('a')
    link.href = resultImageUrl
    link.download = `portrait-${selectedTheme.id}-${Date.now()}.png`
    link.click()
  }

  const print4x6Sheet = (imagesToPrint) => {
    if (!imagesToPrint.length) return

    const [img1, img2] = imagesToPrint
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) {
      document.body.removeChild(iframe)
      return
    }

    doc.open()
    doc.write(`<!doctype html>
<html>
  <head>
    <title>Print 4x6 Sheet (2x3 Pair)</title>
    <style>
      @page {
        size: 6in 4in;
        margin: 0;
      }
      * {
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: 6in;
        height: 4in;
        background: #ffffff;
        overflow: hidden;
      }
      .sheet {
        width: 6in;
        height: 4in;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 0;
      }
      .half {
        width: 3in;
        height: 4in;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        background: #ffffff;
      }
      .half img {
        width: 2in;
        height: 3in;
        object-fit: cover;
        display: block;
      }
      .divider {
        width: 0;
        height: 4in;
        border-left: 1px dashed #d4d4d8;
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="half">
        <img class="print-img" src="${img1}" alt="Portrait 1" />
      </div>
      <div class="divider"></div>
      <div class="half">
        ${img2 ? `<img class="print-img" src="${img2}" alt="Portrait 2" />` : ''}
      </div>
    </div>
    <script>
      const imgs = Array.from(document.querySelectorAll('.print-img'));
      Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              })
        )
      ).then(() => {
        setTimeout(() => {
          window.focus();
          window.print();
        }, 150);
      });
    </script>
  </body>
</html>`)
    doc.close()

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
    }, 60000)
  }

  const isCurrentInQueue = Boolean(
    currentResultId && printQueue.some((item) => item.id === currentResultId)
  )

  const handlePrintAction = () => {
    if (!resultImageUrl || !currentResultId) return

    // If current photo is already queued as slot 1, print now if desired or wait
    if (isCurrentInQueue) {
      if (printQueue.length === 2) {
        print4x6Sheet([printQueue[0].src, printQueue[1].src])
        setPrintQueue([])
      }
      return
    }

    if (printQueue.length === 0) {
      // Queue as Photo 1 of 2 and keep it ready for the next user
      setPrintQueue([{ id: currentResultId, src: resultImageUrl }])
    } else {
      // Combine waiting Photo 1 + current Photo 2, print both on one 4x6 sheet, then reset queue
      const pair = [printQueue[0].src, resultImageUrl]
      print4x6Sheet(pair)
      setPrintQueue([])
    }
  }

  const handlePrintSingleNow = () => {
    if (printQueue.length > 0) {
      print4x6Sheet(printQueue.map((item) => item.src))
      setPrintQueue([])
      return
    }
    if (resultImageUrl) {
      print4x6Sheet([resultImageUrl])
    }
  }

  const removeFromPrintQueue = (id) => {
    setPrintQueue((prev) => prev.filter((item) => item.id !== id))
  }

  const renderPage = () => {
    // 1. HOME PAGE: Select Filter Color
    if (page === 'home') {
      return (
        <main className="w-full max-w-md flex flex-col gap-5">
          <div className="text-center space-y-1.5">
            <h1 className="text-xl font-medium tracking-tight text-zinc-100">
              Choose Filter Style
            </h1>
            <p className="text-xs text-zinc-400">
              Select a neon lighting palette before capturing your portrait
            </p>
          </div>

          {printQueue.length > 0 && (
            <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 px-3 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={printQueue[0].src}
                  alt="Queued print 1"
                  className="w-7 h-10 rounded-md object-cover border border-zinc-700 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-200 truncate">
                    4×6 Print Queue ({printQueue.length}/2)
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    Next photo will print together as 2×3 pair
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handlePrintSingleNow}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition cursor-pointer"
                >
                  Print Now
                </button>
                <button
                  type="button"
                  onClick={() => removeFromPrintQueue(printQueue[0].id)}
                  title="Clear queue"
                  className="p-1 text-zinc-500 hover:text-zinc-200 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {FILTER_THEMES.map((theme) => {
              const isSelected = theme.id === selectedThemeId
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedThemeId(theme.id)}
                  className={`group relative rounded-2xl p-3.5 text-left transition border cursor-pointer flex flex-col justify-between aspect-4/4.5 overflow-hidden ${
                    isSelected
                      ? 'border-zinc-200 ring-1 ring-zinc-200/50'
                      : 'border-zinc-800/90 hover:border-zinc-700'
                  }`}
                  style={{ background: theme.previewBg }}
                >
                  <div
                    className="pointer-events-none absolute -top-10 -left-10 w-40 h-40 rotate-35 opacity-35 blur-xl transition-opacity group-hover:opacity-55"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${theme.primarySwatch}, transparent)`,
                    }}
                  />

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center -space-x-1.5">
                      <span
                        className="w-4 h-4 rounded-full border border-zinc-950/60"
                        style={{ backgroundColor: theme.primarySwatch }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-zinc-950/60"
                        style={{ backgroundColor: theme.secondarySwatch }}
                      />
                    </div>

                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-950 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </span>
                    )}
                  </div>

                  <div className="relative mt-auto pt-8">
                    <div className="text-sm font-medium text-zinc-100 leading-snug">
                      {theme.name}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 leading-tight">
                      {theme.subtitle}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={goToCapture}
            className={`w-full h-11 rounded-xl bg-gradient-to-r ${selectedTheme.buttonGradient} text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition cursor-pointer`}
          >
            <span>Continue to Camera</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </main>
      )
    }

    // 2. CAPTURE PAGE
    if (page === 'capture') {
      return (
        <main className="w-full max-w-sm flex flex-col items-center gap-3.5">
          {/* Top Bar */}
          <div className="w-full flex items-center justify-between">
            <button
              type="button"
              onClick={goHome}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 disabled:opacity-40 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Color</span>
            </button>

            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
              <span className="flex items-center -space-x-1">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: selectedTheme.primarySwatch }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: selectedTheme.secondarySwatch }}
                />
              </span>
              <span>{selectedTheme.name}</span>
            </div>
          </div>

          {/* 2:3 Portrait Viewport */}
          <div
            className={`relative w-full aspect-2/3 max-h-[74svh] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/90 ${selectedTheme.glowShadow} flex items-center justify-center`}
          >
            {!sourcePreviewUrl && !cameraError && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            )}

            {!sourcePreviewUrl && cameraError && (
              <div className="px-6 text-center flex flex-col items-center gap-3">
                <Camera className="w-8 h-8 text-zinc-600" />
                <p className="text-xs text-zinc-400 leading-relaxed">{cameraError}</p>
              </div>
            )}

            {sourcePreviewUrl && (
              <img
                src={sourcePreviewUrl}
                alt="Captured preview"
                className="w-full h-full object-cover"
              />
            )}

            {/* Live RuPay x Anyma Bottom Strip Preview */}
            {(!cameraError || sourcePreviewUrl) && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[11.5%] bg-zinc-950 border-t border-white/12 flex items-center justify-center gap-2.5 z-10 px-4">
                <img
                  src={RUPAY_LOGO_SRC}
                  alt="RuPay"
                  className="h-[44%] max-w-[34%] object-contain select-none"
                />
                <span className="text-white text-lg font-bold leading-none select-none">×</span>
                <img
                  src={ANYMA_LOGO_SRC}
                  alt="Anyma Presents Aeden"
                  className="h-[56%] max-w-[34%] object-contain select-none"
                />
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 bg-zinc-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
                <div className="relative flex items-center justify-center">
                  <div
                    className="absolute w-12 h-12 rounded-full blur-md animate-pulse opacity-35"
                    style={{ backgroundColor: selectedTheme.primarySwatch }}
                  />
                  <Loader2 className="w-7 h-7 text-zinc-100 animate-spin relative" />
                </div>
                <p className="text-xs tracking-wider uppercase text-zinc-200 font-medium">
                  Applying filter...
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="w-full flex items-start gap-2 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3.5 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileUpload}
            className="hidden"
          />

          {!sourcePreviewUrl ? (
            <div className="w-full flex items-center gap-2.5">
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!stream}
                className="flex-1 h-11 rounded-xl bg-zinc-100 text-zinc-950 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-white disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Capture</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-11 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm inline-flex items-center justify-center gap-2 hover:bg-zinc-800/80 hover:text-zinc-100 transition cursor-pointer"
                title="Upload an image instead"
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleRetake}
                disabled={isGenerating}
                className="h-11 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm inline-flex items-center justify-center gap-2 hover:bg-zinc-800/80 disabled:opacity-40 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={applyFilter}
                disabled={isGenerating}
                className={`flex-1 h-11 rounded-xl bg-gradient-to-r ${selectedTheme.buttonGradient} text-white text-sm font-medium inline-flex items-center justify-center disabled:opacity-50 transition cursor-pointer`}
              >
                <span>Apply Filter</span>
              </button>
            </div>
          )}
        </main>
      )
    }

    // 3. RESULT PAGE
    return (
      <main className="w-full max-w-2xl flex flex-col md:flex-row items-center justify-center gap-6">
        {/* Left: Portrait + Action Buttons */}
        <div className="w-full max-w-sm flex flex-col items-center gap-3.5">
          <div
            className={`relative w-full aspect-2/3 max-h-[75svh] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/90 ${selectedTheme.glowShadow} flex items-center justify-center`}
          >
            <img
              src={showingOriginal ? sourcePreviewUrl : resultImageUrl}
              alt="Filtered portrait"
              className="w-full h-full object-cover"
            />

            <button
              type="button"
              onMouseDown={() => setShowingOriginal(true)}
              onMouseUp={() => setShowingOriginal(false)}
              onMouseLeave={() => setShowingOriginal(false)}
              onTouchStart={() => setShowingOriginal(true)}
              onTouchEnd={() => setShowingOriginal(false)}
              className="absolute bottom-[13.5%] right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-zinc-950/80 text-zinc-300 border border-zinc-800 backdrop-blur-md hover:text-white select-none cursor-pointer"
            >
              <Eye className="w-3 h-3" />
              <span>{showingOriginal ? 'Original' : 'Hold to compare'}</span>
            </button>
          </div>

          <div className="w-full flex items-center gap-2">
            <button
              type="button"
              onClick={goHome}
              title="Home"
              className="h-11 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm inline-flex items-center justify-center gap-2 hover:bg-zinc-800/80 hover:text-zinc-100 transition cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={handlePrintAction}
              disabled={isCurrentInQueue}
              className={`flex-1 h-11 rounded-xl border text-sm font-medium inline-flex items-center justify-center gap-2 transition cursor-pointer ${
                isCurrentInQueue
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 cursor-default'
                  : printQueue.length === 1
                    ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-200 hover:bg-cyan-600/30'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800/80 hover:text-white'
              }`}
            >
              {isCurrentInQueue ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Queued (1/2)</span>
                </>
              ) : printQueue.length === 1 ? (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Print Pair (2/2)</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Add to Print (1/2)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={downloadImage}
              title="Download"
              className="h-11 px-4 rounded-xl bg-zinc-100 text-zinc-950 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-white transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Standalone QR Code Card + 4x6 Print Queue Card */}
        <aside className="w-full max-w-sm md:w-56 shrink-0 flex flex-col gap-3">
          <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/90 p-5 flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-xs font-medium tracking-wide uppercase text-zinc-300">
              Scan to Download
            </p>

            {cloudinaryUrl ? (
              <div className="p-3 rounded-xl bg-white shadow-sm">
                <QRCodeSVG value={cloudinaryUrl} size={156} level="M" />
              </div>
            ) : isUploadingCloud ? (
              <div className="w-[180px] h-[180px] rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col items-center justify-center gap-2.5 text-zinc-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-[11px]">Generating QR...</span>
              </div>
            ) : (
              <div className="w-[180px] min-h-[140px] rounded-xl bg-zinc-950/60 border border-zinc-800/80 px-3 py-4 flex items-center justify-center">
                <p className="text-[11px] text-rose-300/90 leading-relaxed">
                  {cloudError || 'QR code unavailable'}
                </p>
              </div>
            )}

            <p className="text-[11px] text-zinc-500 leading-snug">
              Point your phone camera at the QR code to save your photo
            </p>
          </div>

          {/* 4x6 Sheet Queue Status (2x3 + 2x3) */}
          <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/90 p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-300">
                4×6 Print Sheet
              </span>
              <span className="text-[11px] text-zinc-500">{printQueue.length}/2</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((slot) => {
                const queuedItem = printQueue[slot]
                return (
                  <div
                    key={slot}
                    className="relative aspect-2/3 rounded-lg border border-dashed border-zinc-700/80 bg-zinc-950/60 overflow-hidden flex items-center justify-center"
                  >
                    {queuedItem ? (
                      <>
                        <img
                          src={queuedItem.src}
                          alt={`Print slot ${slot + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeFromPrintQueue(queuedItem.id)}
                          title="Remove from print sheet"
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-zinc-950/80 text-zinc-200 flex items-center justify-center hover:bg-rose-600 transition cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-zinc-600">2×3 #{slot + 1}</span>
                    )}
                  </div>
                )
              })}
            </div>

            {printQueue.length === 1 ? (
              <button
                type="button"
                onClick={handlePrintSingleNow}
                className="w-full py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-[11px] text-zinc-300 transition cursor-pointer"
              >
                Print 1 Half Now
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrintSingleNow}
                className="w-full py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-[11px] text-zinc-300 transition cursor-pointer"
              >
                Print Single (Half 4×6)
              </button>
            )}
          </div>
        </aside>
      </main>
    )
  }

  return (
    <div className="relative min-h-svh bg-zinc-950 text-zinc-100 overflow-x-hidden">
      {/* Ambient Theme Gradient Background */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full blur-[120px] opacity-25 transition-colors duration-700"
          style={{ backgroundColor: selectedTheme.primarySwatch }}
        />
        <div
          className="absolute -bottom-36 -right-32 w-[36rem] h-[36rem] rounded-full blur-[130px] opacity-22 transition-colors duration-700"
          style={{ backgroundColor: selectedTheme.secondarySwatch }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-[22rem] -rotate-12 rounded-full blur-[140px] opacity-12 transition-all duration-700"
          style={{
            background: `linear-gradient(90deg, ${selectedTheme.primarySwatch}, ${selectedTheme.secondarySwatch})`,
          }}
        />
      </div>

      <div
        className={`relative z-10 min-h-svh flex items-center justify-center px-4 ${
          page === 'home' ? 'py-8' : 'py-6'
        }`}
      >
        {renderPage()}
      </div>
    </div>
  )
}
