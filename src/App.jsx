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
  Aperture,
  Focus,
  Zap,
  Film,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react'

const CARD_DOODLE_ICONS = [
  { Icon: Camera, className: 'top-[16%] left-[44%] w-8 h-8 sm:w-11 sm:h-11 -rotate-12' },
  { Icon: Sparkles, className: 'top-[12%] right-[24%] w-6 h-6 sm:w-8 sm:h-8 rotate-12' },
  { Icon: Aperture, className: 'top-[38%] left-[10%] w-8 h-8 sm:w-10 sm:h-10 rotate-18' },
  { Icon: Zap, className: 'top-[34%] right-[10%] w-7 h-7 sm:w-9 sm:h-9 -rotate-15' },
  { Icon: Focus, className: 'top-[48%] left-[46%] w-8 h-8 sm:w-10 sm:h-10 rotate-6' },
  { Icon: Film, className: 'bottom-[26%] right-[12%] w-8 h-8 sm:w-10 sm:h-10 rotate-15' },
  { Icon: ImageIcon, className: 'bottom-[34%] left-[20%] w-7 h-7 sm:w-9 sm:h-9 -rotate-12' },
  { Icon: Camera, className: 'bottom-[12%] right-[28%] w-6 h-6 sm:w-8 sm:h-8 rotate-12' },
]

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
        width: 1.8in;
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

  const handlePrintDouble = () => {
    if (!resultImageUrl) return
    print4x6Sheet([resultImageUrl, resultImageUrl])
  }

  const handlePrintSingle = () => {
    if (!resultImageUrl) return
    print4x6Sheet([resultImageUrl])
  }

  const renderPage = () => {
    // 1. HOME PAGE: Select Filter Color
    if (page === 'home') {
      return (
        <main className="w-full max-w-[820px] flex flex-col gap-8 sm:gap-10">
          <div className="text-center space-y-2.5">
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white drop-shadow-sm">
              Choose Filter Style
            </h1>
            <p className="text-sm sm:text-xl text-zinc-200/85">
              Select a neon lighting palette before capturing your portrait
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5 sm:gap-6">
            {FILTER_THEMES.map((theme) => {
              const isSelected = theme.id === selectedThemeId
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedThemeId(theme.id)}
                  className={`group relative rounded-3xl p-5 sm:p-7 text-left transition border-2 cursor-pointer flex flex-col justify-between aspect-4/4.3 overflow-hidden shadow-2xl ${
                    isSelected
                      ? 'border-white ring-2 ring-white/40 scale-[1.01]'
                      : 'border-white/15 hover:border-white/35'
                  }`}
                  style={{ background: theme.previewBg }}
                >
                  <div
                    className="pointer-events-none absolute -top-12 -left-12 w-56 h-56 rotate-35 opacity-45 blur-2xl transition-opacity group-hover:opacity-65"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${theme.primarySwatch}, transparent)`,
                    }}
                  />

                  {/* Scattered white photo/camera doodle pattern */}
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-0 text-white transition-opacity duration-300 ${
                      isSelected ? 'opacity-25' : 'opacity-15 group-hover:opacity-20'
                    }`}
                  >
                    {CARD_DOODLE_ICONS.map(({ Icon, className }, idx) => (
                      <Icon
                        key={idx}
                        strokeWidth={1.6}
                        className={`absolute ${className}`}
                      />
                    ))}
                  </div>

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center -space-x-2">
                      <span
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-zinc-950/60"
                        style={{ backgroundColor: theme.primarySwatch }}
                      />
                      <span
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-zinc-950/60"
                        style={{ backgroundColor: theme.secondarySwatch }}
                      />
                    </div>

                    {isSelected && (
                      <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.75]" />
                      </span>
                    )}
                  </div>

                  <div className="relative mt-auto pt-10">
                    <div className="text-lg sm:text-2xl font-semibold text-white leading-snug">
                      {theme.name}
                    </div>
                    <div className="text-xs sm:text-base text-zinc-200/85 mt-1 leading-snug">
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
            className={`w-full h-14 sm:h-20 rounded-2xl bg-gradient-to-r ${selectedTheme.buttonGradient} text-white text-lg sm:text-2xl font-semibold inline-flex items-center justify-center gap-3 shadow-xl transition cursor-pointer`}
          >
            <span>Continue to Camera</span>
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </main>
      )
    }

    // 2. CAPTURE PAGE
    if (page === 'capture') {
      return (
        <main className="w-full max-w-[820px] flex flex-col items-center gap-5 sm:gap-6">
          {/* Top Bar */}
          <div className="w-full flex items-center justify-between">
            <button
              type="button"
              onClick={goHome}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 text-sm sm:text-lg text-zinc-200 hover:text-white disabled:opacity-40 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Change Color</span>
            </button>

            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-zinc-900/60 backdrop-blur-md border border-white/15 text-xs sm:text-base text-white">
              <span className="flex items-center -space-x-1.5">
                <span
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full"
                  style={{ backgroundColor: selectedTheme.primarySwatch }}
                />
                <span
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full"
                  style={{ backgroundColor: selectedTheme.secondarySwatch }}
                />
              </span>
              <span className="font-medium">{selectedTheme.name}</span>
            </div>
          </div>

          {/* 2:3 Portrait Viewport */}
          <div
            className={`relative w-full aspect-2/3 max-h-[70svh] rounded-3xl overflow-hidden bg-zinc-900/80 border border-white/15 ${selectedTheme.glowShadow} flex items-center justify-center shadow-2xl`}
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
              <div className="px-8 text-center flex flex-col items-center gap-4">
                <Camera className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-400" />
                <p className="text-sm sm:text-lg text-zinc-300 leading-relaxed max-w-md">
                  {cameraError}
                </p>
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
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[11.5%] bg-zinc-950 border-t border-white/12 flex items-center justify-center gap-3.5 z-10 px-6">
                <img
                  src={RUPAY_LOGO_SRC}
                  alt="RuPay"
                  className="h-[44%] max-w-[34%] object-contain select-none"
                />
                <span className="text-white text-xl sm:text-3xl font-bold leading-none select-none">
                  ×
                </span>
                <img
                  src={ANYMA_LOGO_SRC}
                  alt="Anyma Presents Aeden"
                  className="h-[56%] max-w-[34%] object-contain select-none"
                />
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 bg-zinc-950/75 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                <div className="relative flex items-center justify-center">
                  <div
                    className="absolute w-20 h-20 rounded-full blur-xl animate-pulse opacity-45"
                    style={{ backgroundColor: selectedTheme.primarySwatch }}
                  />
                  <Loader2 className="w-11 h-11 sm:w-14 sm:h-14 text-white animate-spin relative" />
                </div>
                <p className="text-sm sm:text-lg tracking-wider uppercase text-zinc-100 font-semibold">
                  Applying filter...
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="w-full flex items-start gap-3 text-sm sm:text-base text-rose-200 bg-rose-950/60 backdrop-blur-md border border-rose-400/40 rounded-2xl px-5 py-3.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-300" />
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
            <div className="w-full flex items-center gap-4">
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!stream}
                className="flex-1 h-14 sm:h-20 rounded-2xl bg-white text-zinc-950 text-lg sm:text-2xl font-semibold inline-flex items-center justify-center gap-3 hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none shadow-xl transition cursor-pointer"
              >
                <Camera className="w-5 h-5 sm:w-7 sm:h-7" />
                <span>Capture</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-14 sm:h-20 px-6 sm:px-8 rounded-2xl bg-zinc-900/65 backdrop-blur-md border border-white/15 text-zinc-100 text-base sm:text-xl font-medium inline-flex items-center justify-center gap-2.5 hover:bg-zinc-800/80 transition cursor-pointer"
                title="Upload an image instead"
              >
                <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>Upload</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center gap-4">
              <button
                type="button"
                onClick={handleRetake}
                disabled={isGenerating}
                className="h-14 sm:h-20 px-6 sm:px-8 rounded-2xl bg-zinc-900/65 backdrop-blur-md border border-white/15 text-zinc-100 text-base sm:text-xl font-medium inline-flex items-center justify-center gap-2.5 hover:bg-zinc-800/80 disabled:opacity-40 transition cursor-pointer"
              >
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={applyFilter}
                disabled={isGenerating}
                className={`flex-1 h-14 sm:h-20 rounded-2xl bg-gradient-to-r ${selectedTheme.buttonGradient} text-white text-lg sm:text-2xl font-semibold inline-flex items-center justify-center disabled:opacity-50 shadow-xl transition cursor-pointer`}
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
      <main className="w-full max-w-[820px] xl:max-w-5xl flex flex-col xl:flex-row items-center justify-center gap-6 sm:gap-8">
        {/* Left/Top: Portrait + Action Buttons */}
        <div className="w-full max-w-[700px] xl:max-w-lg flex flex-col items-center gap-5">
          <div
            className={`relative w-full aspect-2/3 max-h-[58svh] xl:max-h-[75svh] rounded-3xl overflow-hidden bg-zinc-900/80 border border-white/15 ${selectedTheme.glowShadow} flex items-center justify-center shadow-2xl`}
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
              className="absolute bottom-[13.5%] right-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-base bg-zinc-950/75 text-zinc-100 border border-white/20 backdrop-blur-md hover:text-white select-none cursor-pointer"
            >
              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{showingOriginal ? 'Original' : 'Hold to compare'}</span>
            </button>
          </div>

          <div className="w-full flex items-center gap-3.5">
            <button
              type="button"
              onClick={goHome}
              title="Home"
              className="h-14 sm:h-[72px] px-5 sm:px-7 rounded-2xl bg-zinc-900/65 backdrop-blur-md border border-white/15 text-zinc-100 text-base sm:text-xl font-medium inline-flex items-center justify-center gap-2.5 hover:bg-zinc-800/80 transition cursor-pointer"
            >
              <Home className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={handlePrintDouble}
              className={`flex-1 h-14 sm:h-[72px] rounded-2xl bg-gradient-to-r ${selectedTheme.buttonGradient} text-white text-base sm:text-xl font-semibold inline-flex items-center justify-center gap-2.5 shadow-xl transition cursor-pointer`}
            >
              <Printer className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Print 2 Copies (4×6)</span>
            </button>

            <button
              type="button"
              onClick={downloadImage}
              title="Download"
              className="h-14 sm:h-[72px] px-5 sm:px-7 rounded-2xl bg-white text-zinc-950 text-base sm:text-xl font-semibold inline-flex items-center justify-center gap-2 hover:bg-zinc-100 shadow-lg transition cursor-pointer"
            >
              <Download className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Right/Bottom: Standalone QR Code Card + 4x6 Print Queue Card */}
        <aside className="w-full max-w-[700px] xl:w-72 shrink-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4 sm:gap-5">
          <div className="rounded-3xl bg-zinc-900/60 backdrop-blur-md border border-white/15 p-5 sm:p-6 flex flex-col items-center justify-center gap-3.5 text-center shadow-xl">
            <p className="text-sm sm:text-base font-semibold tracking-wide uppercase text-white">
              Scan to Download
            </p>

            {cloudinaryUrl ? (
              <div className="p-3.5 rounded-2xl bg-white shadow-md">
                <QRCodeSVG value={cloudinaryUrl} size={184} level="M" />
              </div>
            ) : isUploadingCloud ? (
              <div className="w-[212px] h-[212px] rounded-2xl bg-zinc-950/50 border border-white/10 flex flex-col items-center justify-center gap-3 text-zinc-300">
                <Loader2 className="w-7 h-7 animate-spin" />
                <span className="text-sm">Generating QR...</span>
              </div>
            ) : (
              <div className="w-[212px] min-h-[168px] rounded-2xl bg-zinc-950/50 border border-white/10 px-4 py-5 flex items-center justify-center">
                <p className="text-xs sm:text-sm text-rose-200/90 leading-relaxed">
                  {cloudError || 'QR code unavailable'}
                </p>
              </div>
            )}

            <p className="text-xs sm:text-sm text-zinc-300 leading-snug">
              Point your phone camera at the QR code to save your photo
            </p>
          </div>

          {/* 4x6 Sheet 2-Up Preview (2x3 + 2x3) */}
          <div className="rounded-3xl bg-zinc-900/60 backdrop-blur-md border border-white/15 p-5 sm:p-6 flex flex-col justify-between gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-semibold uppercase tracking-wide text-white">
                4×6 Print Sheet
              </span>
              <span className="text-sm sm:text-base text-zinc-300 font-medium">2/2</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((slot) => (
                <div
                  key={slot}
                  className="relative aspect-2/3 rounded-xl border border-white/20 bg-zinc-950/45 overflow-hidden flex items-center justify-center"
                >
                  {resultImageUrl ? (
                    <img
                      src={resultImageUrl}
                      alt={`2×3 copy ${slot + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs sm:text-sm text-zinc-400">2×3 #{slot + 1}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handlePrintDouble}
                className="w-full py-2.5 sm:py-3 rounded-xl bg-white/20 hover:bg-white/30 text-xs sm:text-sm font-semibold text-white inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>Print Double</span>
              </button>

              <button
                type="button"
                onClick={handlePrintSingle}
                className="w-full py-2.5 sm:py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs sm:text-sm font-medium text-zinc-100 inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>Print Single</span>
              </button>
            </div>
          </div>
        </aside>
      </main>
    )
  }

  return (
    <div
      className="relative min-h-svh text-zinc-100 overflow-x-hidden transition-all duration-700"
      style={{
        backgroundColor: '#12131f',
        backgroundImage: `radial-gradient(circle at 12% 14%, color-mix(in srgb, ${selectedTheme.primarySwatch} 62%, transparent) 0%, transparent 56%), radial-gradient(circle at 88% 84%, color-mix(in srgb, ${selectedTheme.secondarySwatch} 58%, transparent) 0%, transparent 58%), radial-gradient(circle at 82% 24%, color-mix(in srgb, ${selectedTheme.secondarySwatch} 32%, transparent) 0%, transparent 48%), radial-gradient(circle at 18% 78%, color-mix(in srgb, ${selectedTheme.primarySwatch} 34%, transparent) 0%, transparent 50%), linear-gradient(155deg, color-mix(in srgb, ${selectedTheme.primarySwatch} 26%, #141526) 0%, #151728 48%, color-mix(in srgb, ${selectedTheme.secondarySwatch} 26%, #141526) 100%)`,
      }}
    >
      {/* Ambient Theme Glow Orbs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-24 -left-24 w-[70vw] max-w-[48rem] h-[70vw] max-h-[48rem] rounded-full blur-[120px] opacity-45 transition-colors duration-700"
          style={{ backgroundColor: selectedTheme.primarySwatch }}
        />
        <div
          className="absolute -bottom-28 -right-24 w-[72vw] max-w-[50rem] h-[72vw] max-h-[50rem] rounded-full blur-[130px] opacity-42 transition-colors duration-700"
          style={{ backgroundColor: selectedTheme.secondarySwatch }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] max-w-[56rem] h-[36rem] -rotate-12 rounded-full blur-[140px] opacity-25 transition-all duration-700"
          style={{
            background: `linear-gradient(90deg, ${selectedTheme.primarySwatch}, ${selectedTheme.secondarySwatch})`,
          }}
        />
      </div>

      <div
        className={`relative z-10 min-h-svh flex items-center justify-center px-6 sm:px-10 ${
          page === 'home' ? 'py-10 sm:py-14' : 'py-8 sm:py-10'
        }`}
      >
        {renderPage()}
      </div>
    </div>
  )
}
