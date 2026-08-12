import { useState, useEffect, useRef } from 'react'
import './App.css'
import { supabase } from './supabaseClient'

// Türkiye saati (UTC+3) için bugünün tarihini döndürür
const getTurkeyDateString = () => {
  const now = new Date()
  const turkeyDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))
  const year = turkeyDate.getFullYear()
  const month = String(turkeyDate.getMonth() + 1).padStart(2, '0')
  const day = String(turkeyDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const NAV_ITEMS = [
  { id: 'gallery', label: 'Anılar' },
  { id: 'notes', label: 'Notlar' },
  { id: 'audio', label: 'Sesli' },
  { id: 'jars', label: 'Kavanoz' },
  { id: 'places', label: 'Yerler' },
  { id: 'timeline', label: 'Zaman' }
]

const FLOATING_HEARTS = [
  { left: 8, size: 13, duration: 19, delay: 0, drift: 30 },
  { left: 24, size: 9, duration: 24, delay: 4, drift: -24 },
  { left: 45, size: 15, duration: 21, delay: 8, drift: 18 },
  { left: 62, size: 10, duration: 26, delay: 2, drift: -32 },
  { left: 79, size: 12, duration: 22, delay: 11, drift: 26 },
  { left: 92, size: 8, duration: 28, delay: 6, drift: -18 }
]

const THEME_ORDER = ['blush', 'vanilla', 'turquoise', 'night']
const THEME_NAMES = { blush: 'Pembe', vanilla: 'Vanilya', turquoise: 'Turkuaz', night: 'Gece' }

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showLoveNote, setShowLoveNote] = useState(false)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [uploadedPhotos, setUploadedPhotos] = useState([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notes, setNotes] = useState([])
  const [audioNotes, setAudioNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showAudioNotesModal, setShowAudioNotesModal] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [editingAudioNote, setEditingAudioNote] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [audioChunks, setAudioChunks] = useState([])
  const [recordingTime, setRecordingTime] = useState(0)
  const [isPlayingAudio, setIsPlayingAudio] = useState(null)
  const [audioNoteTitle, setAudioNoteTitle] = useState('')
  const [audioProgress, setAudioProgress] = useState({})
  const [audioDuration, setAudioDuration] = useState({})
  const [recordingStream, setRecordingStream] = useState(null)
  const [recordingTimer, setRecordingTimer] = useState(null)
  const [currentNotesPage, setCurrentNotesPage] = useState(1)
  const notesPerPage = 6
  const [currentAudioNotesPage, setCurrentAudioNotesPage] = useState(1)
  const audioNotesPerPage = 4
  const [currentPlacesPage, setCurrentPlacesPage] = useState(1)
  const placesPerPage = 4
  const [currentPhotosPage, setCurrentPhotosPage] = useState(1)
  const photosPerPage = 6
  const [timelineEvents, setTimelineEvents] = useState([])
  const [showTimelineModal, setShowTimelineModal] = useState(false)
  const [editingTimeline, setEditingTimeline] = useState(null)
  const [timelineForm, setTimelineForm] = useState({
    icon: '',
    title: '',
    date: '',
    description: ''
  })
  const [visitedPlaces, setVisitedPlaces] = useState([])
  const [showMapModal, setShowMapModal] = useState(false)
  const [editingPlace, setEditingPlace] = useState(null)
  const [mapForm, setMapForm] = useState({
    name: '',
    description: '',
    date: getTurkeyDateString()
  })
  const [dailyAffections, setDailyAffections] = useState([])
  const [todayDate, setTodayDate] = useState(getTurkeyDateString())
  const [isDragging, setIsDragging] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [touchStartY, setTouchStartY] = useState(null)
  const [touchStartIndex, setTouchStartIndex] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('lovesite_theme')
    return THEME_ORDER.includes(savedTheme) ? savedTheme : 'blush'
  })

  const lightboxTouchX = useRef(null)

  // Sadece yüklenen fotoğraflar
  const photos = uploadedPhotos

  // Supabase'den fotoğrafları çek
  useEffect(() => {
    fetchPhotos()
  }, [])

  const fetchPhotos = async () => {
    try {
      const { data: storageData, error: storageError } = await supabase.storage
        .from('love-photos')
        .list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (storageError) throw storageError

      const allPhotos = storageData
        .filter(file => file.name !== '.emptyFolderPlaceholder')
        .map(file => {
          const { data: urlData } = supabase.storage
            .from('love-photos')
            .getPublicUrl(file.name)
          return {
            url: urlData.publicUrl,
            name: file.name
          }
        })

      const { data: orderData, error: orderError } = await supabase
        .from('photo_order')
        .select('*')
        .order('display_order', { ascending: true })

      if (orderError && orderError.code !== 'PGRST116') {
        console.warn('Sıralama verisi çekilemedi:', orderError)
      }

      let sortedPhotos = allPhotos

      if (orderData && orderData.length > 0) {
        const orderMap = new Map()
        orderData.forEach(item => {
          orderMap.set(item.photo_url, item.display_order)
        })

        const orderedPhotos = []
        const unorderedPhotos = []

        allPhotos.forEach(photo => {
          const order = orderMap.get(photo.url)
          if (order !== undefined) {
            orderedPhotos.push({ ...photo, order })
          } else {
            unorderedPhotos.push(photo)
          }
        })

        orderedPhotos.sort((a, b) => a.order - b.order)
        sortedPhotos = [...orderedPhotos, ...unorderedPhotos]
      }

      setUploadedPhotos(sortedPhotos.map(p => p.url))
    } catch (error) {
      console.error('Fotoğraflar yüklenemedi:', error)
    }
  }

  // Fotoğraf yükleme
  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('love-photos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('love-photos')
        .getPublicUrl(fileName)

      try {
        const { data: existingOrders } = await supabase
          .from('photo_order')
          .select('*')
          .order('display_order', { ascending: true })

        if (existingOrders && existingOrders.length > 0) {
          const updatePromises = existingOrders.map(item =>
            supabase
              .from('photo_order')
              .update({ display_order: item.display_order + 1 })
              .eq('id', item.id)
          )
          await Promise.all(updatePromises)
        }

        await supabase
          .from('photo_order')
          .insert([{
            photo_url: urlData.publicUrl,
            photo_name: fileName,
            display_order: 0
          }])
      } catch (orderError) {
        console.warn('Sıralama kaydedilemedi:', orderError)
      }

      await fetchPhotos()
      setCurrentPhotosPage(1)
      setShowUploadModal(false)
      alert('Fotoğraf başarıyla yüklendi! 💕')
    } catch (error) {
      console.error('Yükleme hatası:', error)
      alert('Fotoğraf yüklenirken hata oluştu 😔')
    } finally {
      setUploading(false)
    }
  }

  // Fotoğraf silme
  const handlePhotoDelete = async (photoUrl) => {
    const confirmDelete = window.confirm('Bu fotoğrafı silmek istediğinizden emin misiniz? 🗑️')
    if (!confirmDelete) return

    try {
      const fileName = photoUrl.split('/').pop().split('?')[0]

      const { error: storageError } = await supabase.storage
        .from('love-photos')
        .remove([fileName])

      if (storageError) throw storageError

      const { error: dbError } = await supabase
        .from('photo_order')
        .delete()
        .eq('photo_url', photoUrl)

      if (dbError && dbError.code !== 'PGRST116') {
        console.warn('Sıralama kaydı silinemedi:', dbError)
      }

      await fetchPhotos()
      const totalPages = Math.ceil((photos.length - 1) / photosPerPage)
      if (currentPhotosPage > totalPages && totalPages > 0) {
        setCurrentPhotosPage(totalPages)
      }
      setLightboxImage(null)
      alert('Fotoğraf silindi! 🗑️')
    } catch (error) {
      console.error('Silme hatası:', error)
      alert('Fotoğraf silinirken hata oluştu 😔')
    }
  }

  // Sürükle-bırak işlemleri
  const handleDragStart = (e, index) => {
    if (currentUser?.role !== 'admin') return
    setIsDragging(true)
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.target)
  }

  const handleDragOver = (e) => {
    if (currentUser?.role !== 'admin') return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, dropIndex) => {
    if (currentUser?.role !== 'admin') return
    e.preventDefault()
    setIsDragging(false)

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    await handlePhotoReorder(draggedIndex, dropIndex)
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    if (currentUser?.role !== 'admin') return
    setIsDragging(false)
    setDraggedIndex(null)
  }

  // Mobil touch işlemleri
  const handleTouchStart = (e, index) => {
    if (currentUser?.role !== 'admin') return
    const touch = e.touches[0]
    setTouchStartY(touch.clientY)
    setTouchStartIndex(index)
    setIsDragging(true)
    setDraggedIndex(index)
  }

  const handleTouchMove = (e) => {
    if (currentUser?.role !== 'admin' || touchStartIndex === null) return
    if (isDragging) {
      e.preventDefault()
    }
  }

  const handleTouchEnd = async (e) => {
    if (currentUser?.role !== 'admin' || touchStartIndex === null) {
      setTouchStartY(null)
      setTouchStartIndex(null)
      setIsDragging(false)
      setDraggedIndex(null)
      return
    }

    const touch = e.changedTouches[0]
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)

    let targetIndex = touchStartIndex
    if (elementBelow) {
      const photoItem = elementBelow.closest('.photo-item')
      if (photoItem) {
        const allPhotos = document.querySelectorAll('.photo-item')
        const index = Array.from(allPhotos).indexOf(photoItem)
        if (index !== -1) {
          targetIndex = index
        }
      }
    }

    if (touchStartIndex === targetIndex) {
      setTouchStartY(null)
      setTouchStartIndex(null)
      setIsDragging(false)
      setDraggedIndex(null)
      return
    }

    await handlePhotoReorder(touchStartIndex, targetIndex)

    setTouchStartY(null)
    setTouchStartIndex(null)
    setIsDragging(false)
    setDraggedIndex(null)
  }

  // Fotoğraf sıralamasını değiştir (ortak fonksiyon)
  const handlePhotoReorder = async (fromIndex, toIndex) => {
    if (currentUser?.role !== 'admin') return

    if (fromIndex < 0 || fromIndex >= uploadedPhotos.length ||
        toIndex < 0 || toIndex >= uploadedPhotos.length) {
      console.warn('Geçersiz index:', { fromIndex, toIndex, length: uploadedPhotos.length })
      return
    }

    const newPhotos = [...uploadedPhotos]
    const draggedPhoto = newPhotos[fromIndex]
    newPhotos.splice(fromIndex, 1)
    newPhotos.splice(toIndex, 0, draggedPhoto)

    setUploadedPhotos(newPhotos)

    try {
      const orderData = newPhotos.map((url, index) => ({
        photo_url: url,
        photo_name: url.split('/').pop().split('?')[0],
        display_order: index
      }))

      const { error: checkError } = await supabase
        .from('photo_order')
        .select('photo_url')
        .limit(1)

      if (checkError) {
        const isTableNotFound =
          checkError.code === 'PGRST116' ||
          checkError.message?.includes('does not exist') ||
          checkError.message?.includes('Could not find the table') ||
          checkError.message?.includes('schema cache')

        if (isTableNotFound) {
          console.warn('photo_order tablosu bulunamadı.')
          alert('⚠️ Sıralama özelliği için veritabanı tablosu oluşturulmamış.\n\n📋 Yapmanız gerekenler:\n1. Supabase Dashboard\'a gidin\n2. SQL Editor\'ü açın\n3. photo_order.sql dosyasının içeriğini kopyalayıp yapıştırın\n4. "Run" butonuna tıklayın\n\nDosya konumu: proje kök dizininde /photo_order.sql')
          await fetchPhotos()
          return
        }
        throw checkError
      }

      const { error: deleteError } = await supabase
        .from('photo_order')
        .delete()
        .gte('display_order', 0)

      if (deleteError && deleteError.code !== 'PGRST116') {
        console.warn('Eski kayıtlar silinirken hata:', deleteError)
      }

      const { error: insertError } = await supabase
        .from('photo_order')
        .insert(orderData)

      if (insertError) {
        if (insertError.code === '23505') {
          const upsertPromises = orderData.map(item =>
            supabase
              .from('photo_order')
              .upsert(item, { onConflict: 'photo_url' })
          )
          const results = await Promise.all(upsertPromises)
          const hasError = results.some(result => result.error)
          if (hasError) {
            const firstError = results.find(result => result.error)?.error
            throw firstError
          }
        } else {
          throw insertError
        }
      }

      console.log('Sıralama başarıyla kaydedildi')
    } catch (error) {
      console.error('Sıralama kaydedilemedi:', error)
      await fetchPhotos()

      let errorMessage = 'Sıralama kaydedilirken hata oluştu 😔'
      const isTableNotFound =
        error.code === 'PGRST116' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('Could not find the table') ||
        error.message?.includes('schema cache')

      if (isTableNotFound) {
        errorMessage = '⚠️ Veritabanı tablosu bulunamadı.\n\n📋 Yapmanız gerekenler:\n1. Supabase Dashboard\'a gidin\n2. SQL Editor\'ü açın\n3. photo_order.sql dosyasının içeriğini kopyalayıp yapıştırın\n4. "Run" butonuna tıklayın\n\nDosya konumu: proje kök dizininde /photo_order.sql'
      } else if (error.message) {
        errorMessage += `\n\nHata: ${error.message}`
      }

      alert(errorMessage)
    }
  }

  // Yukarı/aşağı ok butonları ile sıralama (mobil için)
  const handleMovePhoto = async (index, direction) => {
    if (currentUser?.role !== 'admin') return

    const newIndex = direction === 'up' ? index - 1 : index + 1

    if (newIndex < 0 || newIndex >= uploadedPhotos.length) {
      console.warn('Geçersiz hareket:', { index, direction, newIndex, length: uploadedPhotos.length })
      return
    }

    await handlePhotoReorder(index, newIndex)
  }

  // Tema değişikliğini uygula
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('lovesite_theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      const paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()
      if (paper) meta.setAttribute('content', paper)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => THEME_ORDER[(THEME_ORDER.indexOf(prev) + 1) % THEME_ORDER.length])
  }

  const getThemeName = () => THEME_NAMES[theme]

  // LocalStorage'dan giriş durumunu kontrol et
  useEffect(() => {
    const savedUser = localStorage.getItem('lovesite_user')
    if (savedUser) {
      const user = JSON.parse(savedUser)
      setCurrentUser(user)
      setIsAuthenticated(true)
    }
  }, [])

  // Verileri çek
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotes()
      fetchAudioNotes()
      fetchTimelineEvents()
      fetchVisitedPlaces()
      fetchDailyAffections()
    }
  }, [isAuthenticated])

  // Her gün başında tarihi kontrol et
  useEffect(() => {
    const checkNewDay = () => {
      const today = getTurkeyDateString()
      if (today !== todayDate) {
        setTodayDate(today)
        if (isAuthenticated) {
          fetchDailyAffections()
        }
      }
    }

    const interval = setInterval(checkNewDay, 60000)
    checkNewDay()

    return () => clearInterval(interval)
  }, [todayDate, isAuthenticated])

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('love_notes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const textNotes = (data || []).filter(note =>
        note.message &&
        (!note.audio_url || note.audio_url === '' || note.audio_url === null) &&
        (!note.deleted || note.deleted === false)
      )
      setNotes(textNotes)
    } catch (error) {
      console.error('Notlar yüklenemedi:', error)
      alert('Notlar yüklenirken hata oluştu: ' + error.message)
    }
  }

  const fetchAudioNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('audio_notes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('audio_notes tablosu bulunamadı, love_notes tablosundan çekiliyor...')
          const { data: oldData, error: oldError } = await supabase
            .from('love_notes')
            .select('*')
            .order('created_at', { ascending: false })

          if (oldError) throw oldError

          const audioOnlyNotes = (oldData || []).filter(note =>
            note.audio_url && (!note.deleted || note.deleted === false)
          )
          setAudioNotes(audioOnlyNotes)
          return
        }
        throw error
      }

      const activeAudioNotes = (data || []).filter(note =>
        !note.deleted || note.deleted === false
      )
      setAudioNotes(activeAudioNotes)
    } catch (error) {
      console.error('Sesli notlar yüklenemedi:', error)
      setAudioNotes([])
    }
  }

  // Timeline olaylarını çek
  const fetchTimelineEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('timeline_events')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      const activeEvents = (data || []).filter(event =>
        !event.deleted || event.deleted === false
      )
      setTimelineEvents(activeEvents)
    } catch (error) {
      console.error('Timeline yüklenemedi:', error)
    }
  }

  // Ziyaret edilen yerleri çek
  const fetchVisitedPlaces = async () => {
    try {
      const { data, error } = await supabase
        .from('visited_places')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      const activePlaces = (data || []).filter(place =>
        !place.deleted || place.deleted === false
      )
      setVisitedPlaces(activePlaces)
    } catch (error) {
      console.error('Yerler yüklenemedi:', error)
    }
  }

  // Harita yeri ekleme/güncelleme
  const handleAddPlace = async (e) => {
    e.preventDefault()

    if (!mapForm.name) {
      alert('Yer adı gerekli! 💔')
      return
    }

    try {
      if (editingPlace && editingPlace !== 'all') {
        const { error } = await supabase
          .from('visited_places')
          .update({
            name: mapForm.name,
            description: mapForm.description || '',
            created_at: mapForm.date ? new Date(mapForm.date).toISOString() : new Date().toISOString()
          })
          .eq('id', editingPlace)

        if (error) throw error
        alert('Yer güncellendi! 💕')
      } else {
        const { error } = await supabase
          .from('visited_places')
          .insert([
            {
              name: mapForm.name,
              description: mapForm.description || '',
              username: currentUser.username,
              created_at: mapForm.date ? new Date(mapForm.date).toISOString() : new Date().toISOString()
            }
          ])

        if (error) throw error
        alert('Yer eklendi! 💕')
      }

      setMapForm({ name: '', description: '', date: getTurkeyDateString() })
      setEditingPlace(null)
      await fetchVisitedPlaces()
      setCurrentPlacesPage(1)
      setShowMapModal(false)
    } catch (error) {
      console.error('Yer işlemi hatası:', error)
      alert('İşlem sırasında hata oluştu 😔')
    }
  }

  const handleEditPlace = (place) => {
    setEditingPlace(place.id)
    setMapForm({
      name: place.name,
      description: place.description || '',
      date: new Date(place.created_at).toISOString().split('T')[0]
    })
    setShowMapModal(true)
  }

  // Harita yeri silme (soft delete)
  const handleDeletePlace = async (placeId) => {
    const confirmDelete = window.confirm('Bu yeri silmek istediğinizden emin misiniz? 🗑️')
    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('visited_places')
        .update({ deleted: true })
        .eq('id', placeId)

      if (error) throw error

      await fetchVisitedPlaces()
      const totalPages = Math.ceil((visitedPlaces.length - 1) / placesPerPage)
      if (currentPlacesPage > totalPages && totalPages > 0) {
        setCurrentPlacesPage(totalPages)
      }
      alert('Yer silindi! 🗑️')
    } catch (error) {
      console.error('Yer silme hatası:', error)
      alert('Yer silinirken hata oluştu 😔')
    }
  }

  // Günlük affections çek
  const fetchDailyAffections = async () => {
    try {
      const today = getTurkeyDateString()
      const { data, error } = await supabase
        .from('daily_affections')
        .select('*')
        .eq('date', today)
        .order('created_at', { ascending: true })

      if (error) throw error
      setDailyAffections(data || [])
    } catch (error) {
      console.error('Affections yüklenemedi:', error)
    }
  }

  // Affection ekleme
  const handleAddAffection = async (type) => {
    if (!currentUser) return

    try {
      const today = getTurkeyDateString()
      const userColor = currentUser.username === 'baha' ? 'blue' : 'pink'

      const { error } = await supabase
        .from('daily_affections')
        .insert([
          {
            date: today,
            type: type,
            username: currentUser.username,
            color: userColor
          }
        ])

      if (error) throw error

      await fetchDailyAffections()
    } catch (error) {
      console.error('Affection ekleme hatası:', error)
      alert('Eklenirken hata oluştu 😔')
    }
  }

  // Oranlı top gösterimi için helper fonksiyon
  const getProportionalBalls = (affections, type, maxBalls = 100) => {
    const filtered = affections.filter(a => a.type === type)
    const total = filtered.length

    if (total <= maxBalls) {
      return [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    }

    const bahaBalls = filtered.filter(a => a.username === 'baha')
    const aysenurBalls = filtered.filter(a => a.username === 'aysenur')

    const bahaCount = bahaBalls.length
    const aysenurCount = aysenurBalls.length

    const bahaRatio = bahaCount / total
    const aysenurRatio = aysenurCount / total

    let bahaToShow = Math.round(maxBalls * bahaRatio)
    let aysenurToShow = Math.round(maxBalls * aysenurRatio)

    const totalToShow = bahaToShow + aysenurToShow
    if (totalToShow < maxBalls) {
      const remaining = maxBalls - totalToShow
      if (bahaCount > aysenurCount) {
        bahaToShow += remaining
      } else {
        aysenurToShow += remaining
      }
    } else if (totalToShow > maxBalls) {
      const excess = totalToShow - maxBalls
      if (bahaToShow > aysenurToShow) {
        bahaToShow -= excess
      } else {
        aysenurToShow -= excess
      }
    }

    const sortedBaha = [...bahaBalls].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    const sortedAysenur = [...aysenurBalls].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    const selectedBaha = sortedBaha.slice(-bahaToShow)
    const selectedAysenur = sortedAysenur.slice(-aysenurToShow)

    return [...selectedBaha, ...selectedAysenur].slice(0, maxBalls)
  }

  // Timeline olayı ekleme/güncelleme
  const handleAddTimeline = async (e) => {
    e.preventDefault()

    if (!timelineForm.icon || !timelineForm.title || !timelineForm.date || !timelineForm.description) {
      alert('Tüm alanları doldurun! 💔')
      return
    }

    try {
      if (editingTimeline && editingTimeline !== 'all') {
        const { error } = await supabase
          .from('timeline_events')
          .update({
            icon: timelineForm.icon,
            title: timelineForm.title,
            date: timelineForm.date,
            description: timelineForm.description
          })
          .eq('id', editingTimeline)

        if (error) throw error
        alert('Timeline olayı güncellendi! 💕')
      } else {
        const maxOrder = timelineEvents.length > 0
          ? Math.max(...timelineEvents.map(e => e.order_index))
          : 0

        const { error } = await supabase
          .from('timeline_events')
          .insert([
            {
              icon: timelineForm.icon,
              title: timelineForm.title,
              date: timelineForm.date,
              description: timelineForm.description,
              order_index: maxOrder + 1
            }
          ])

        if (error) throw error
        alert('Timeline olayı eklendi! 💕')
      }

      setTimelineForm({ icon: '', title: '', date: '', description: '' })
      setEditingTimeline(null)
      await fetchTimelineEvents()
      setShowTimelineModal(false)
    } catch (error) {
      console.error('Timeline işlemi hatası:', error)
      alert('İşlem sırasında hata oluştu 😔')
    }
  }

  const handleEditTimeline = (event) => {
    setEditingTimeline(event.id)
    setTimelineForm({
      icon: event.icon,
      title: event.title,
      date: event.date,
      description: event.description
    })
    setShowTimelineModal(true)
  }

  // Timeline olayı silme (soft delete)
  const handleDeleteTimeline = async (eventId) => {
    const confirmDelete = window.confirm('Bu olayı silmek istediğinizden emin misiniz? 🗑️')
    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('timeline_events')
        .update({ deleted: true })
        .eq('id', eventId)

      if (error) throw error

      await fetchTimelineEvents()
      alert('Timeline olayı silindi! 🗑️')
    } catch (error) {
      console.error('Timeline silme hatası:', error)
      alert('Timeline silinirken hata oluştu 😔')
    }
  }

  // Giriş işlemi
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.toLowerCase())
        .eq('password', password)
        .single()

      if (error || !data) {
        setLoginError('Kullanıcı adı veya şifre hatalı! 💔')
        return
      }

      setCurrentUser(data)
      setIsAuthenticated(true)
      localStorage.setItem('lovesite_user', JSON.stringify(data))
      setUsername('')
      setPassword('')
    } catch (error) {
      setLoginError('Giriş yapılırken hata oluştu! 💔')
    }
  }

  // Kayıt işlemi
  const handleRegister = async (e) => {
    e.preventDefault()
    setLoginError('')

    if (!username || !password) {
      setLoginError('Kullanıcı adı ve şifre gerekli! 💔')
      return
    }

    if (password.length < 4) {
      setLoginError('Şifre en az 4 karakter olmalı! 💔')
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            username: username.toLowerCase(),
            password: password,
            role: 'visitor'
          }
        ])
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          setLoginError('Bu kullanıcı adı zaten alınmış! 💔')
        } else {
          setLoginError('Kayıt olurken hata oluştu! 💔')
        }
        return
      }

      setCurrentUser(data)
      setIsAuthenticated(true)
      localStorage.setItem('lovesite_user', JSON.stringify(data))
      setUsername('')
      setPassword('')
      setShowRegister(false)
    } catch (error) {
      setLoginError('Kayıt olurken hata oluştu! 💔')
    }
  }

  // Çıkış işlemi
  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
    localStorage.removeItem('lovesite_user')
    setUsername('')
    setPassword('')
    setMenuOpen(false)
  }

  // Ses kaydetmeye başla
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        if (recordingTimer) clearInterval(recordingTimer)
        setAudioChunks([...chunks])
        if (recordingStream) {
          recordingStream.getTracks().forEach(track => track.stop())
        }
      }

      recorder.start()
      setMediaRecorder(recorder)
      setRecordingStream(stream)
      setIsRecording(true)
      setRecordingTime(0)
      setAudioChunks([])

      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      setRecordingTimer(timer)
    } catch (error) {
      console.error('Mikrofon erişim hatası:', error)
      alert('Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini verin. 🎤')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      if (recordingTimer) {
        clearInterval(recordingTimer)
        setRecordingTimer(null)
      }
    }
  }

  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
    }
    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop())
      setRecordingStream(null)
    }
    if (recordingTimer) {
      clearInterval(recordingTimer)
      setRecordingTimer(null)
    }
    setIsRecording(false)
    setAudioChunks([])
    setRecordingTime(0)
    setMediaRecorder(null)
  }

  // Ses dosyasını yükle
  const handleAddNoteWithAudio = async (audioBlob) => {
    try {
      const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`
      const { error: uploadError } = await supabase.storage
        .from('love-photos')
        .upload(`audio/${fileName}`, audioBlob, {
          contentType: 'audio/webm'
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('love-photos')
        .getPublicUrl(`audio/${fileName}`)

      return urlData.publicUrl
    } catch (error) {
      console.error('Ses yükleme hatası:', error)
      throw error
    }
  }

  // Metin notu ekleme/güncelleme
  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!newNote.trim()) {
      alert('Lütfen bir mesaj yazın! 💔')
      return
    }

    try {
      if (editingNote && editingNote !== 'all') {
        const { error } = await supabase
          .from('love_notes')
          .update({
            message: newNote.trim()
          })
          .eq('id', editingNote)

        if (error) throw error
        alert('Not güncellendi! 💕')
      } else {
        const { error } = await supabase
          .from('love_notes')
          .insert([
            {
              author: currentUser.username,
              message: newNote.trim(),
              audio_url: null
            }
          ])
          .select()

        if (error) throw error
        alert('Not eklendi! 💕')
      }

      setNewNote('')
      setEditingNote(null)
      await fetchNotes()
      setCurrentNotesPage(1)
      setShowNotesModal(false)
    } catch (error) {
      console.error('Not işlemi hatası:', error)
      const errorMessage = error.message || error.code || error.hint || 'Bilinmeyen hata'
      alert(`Not eklenirken hata oluştu: ${errorMessage}\n\nLütfen konsolu kontrol edin (F12) 😔`)
    }
  }

  // Sesli not ekleme/güncelleme
  const handleAddAudioNote = async (e) => {
    e.preventDefault()

    if (audioChunks.length === 0) {
      alert('Lütfen bir ses kaydı yapın! 💔')
      return
    }

    try {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      const audioUrl = await handleAddNoteWithAudio(audioBlob)

      if (editingAudioNote && editingAudioNote !== 'all') {
        let { error } = await supabase
          .from('audio_notes')
          .update({
            audio_url: audioUrl,
            title: audioNoteTitle.trim() || null
          })
          .eq('id', editingAudioNote)

        if (error && (error.code === 'PGRST116' || error.message?.includes('does not exist'))) {
          const { error: oldError } = await supabase
            .from('love_notes')
            .update({
              audio_url: audioUrl
            })
            .eq('id', editingAudioNote)

          if (oldError) throw oldError
        } else if (error) {
          throw error
        }

        alert('Sesli not güncellendi! 💕')
      } else {
        let { error } = await supabase
          .from('audio_notes')
          .insert([
            {
              author: currentUser.username,
              audio_url: audioUrl,
              title: audioNoteTitle.trim() || null
            }
          ])

        if (error && (error.code === 'PGRST116' || error.message?.includes('does not exist'))) {
          const { error: oldError } = await supabase
            .from('love_notes')
            .insert([
              {
                author: currentUser.username,
                message: null,
                audio_url: audioUrl
              }
            ])

          if (oldError) throw oldError
        } else if (error) {
          throw error
        }

        alert('Sesli not eklendi! 💕')
      }

      setAudioChunks([])
      setRecordingTime(0)
      setAudioNoteTitle('')
      setEditingAudioNote(null)
      await fetchAudioNotes()
      setCurrentAudioNotesPage(1)
      setShowAudioNotesModal(false)
    } catch (error) {
      console.error('Sesli not işlemi hatası:', error)
      const errorMessage = error.message || error.code || 'Bilinmeyen hata'
      alert(`Sesli not eklenirken hata oluştu: ${errorMessage}\n\nLütfen konsolu kontrol edin (F12) 😔`)
    }
  }

  const handleEditNote = (note) => {
    setEditingNote(note.id)
    setNewNote(note.message || '')
    setAudioChunks([])
    setRecordingTime(0)
    setIsRecording(false)
    setShowNotesModal(true)
  }

  const handleEditAudioNote = (note) => {
    setEditingAudioNote(note.id)
    setAudioNoteTitle(note.title || '')
    setAudioChunks([])
    setRecordingTime(0)
    setIsRecording(false)
    setShowAudioNotesModal(true)
  }

  // Not silme (soft delete)
  const handleDeleteNote = async (noteId) => {
    const confirmDelete = window.confirm('Bu notu silmek istediğinizden emin misiniz? 🗑️')
    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('love_notes')
        .update({ deleted: true })
        .eq('id', noteId)

      if (error) throw error

      await fetchNotes()
      const totalPages = Math.ceil((notes.length - 1) / notesPerPage)
      if (currentNotesPage > totalPages && totalPages > 0) {
        setCurrentNotesPage(totalPages)
      }
      alert('Not silindi! 🗑️')
    } catch (error) {
      console.error('Not silinirken hata:', error)
      alert('Not silinirken hata oluştu 😔')
    }
  }

  // Sesli not silme (soft delete)
  const handleDeleteAudioNote = async (noteId) => {
    const confirmDelete = window.confirm('Bu sesli notu silmek istediğinizden emin misiniz? 🗑️')
    if (!confirmDelete) return

    try {
      let { error } = await supabase
        .from('audio_notes')
        .update({ deleted: true })
        .eq('id', noteId)

      if (error && (error.code === 'PGRST116' || error.message?.includes('does not exist'))) {
        const { error: oldError } = await supabase
          .from('love_notes')
          .update({ deleted: true })
          .eq('id', noteId)

        if (oldError) throw oldError
      } else if (error) {
        throw error
      }

      await fetchAudioNotes()
      const totalPages = Math.ceil((audioNotes.length - 1) / audioNotesPerPage)
      if (currentAudioNotesPage > totalPages && totalPages > 0) {
        setCurrentAudioNotesPage(totalPages)
      }
      alert('Sesli not silindi! 🗑️')
    } catch (error) {
      console.error('Sesli not silinirken hata:', error)
      alert('Sesli not silinirken hata oluştu 😔')
    }
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Tarih güncellemesi
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Scroll ilerleme çubuğu + header durumu
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const max = Math.max(1, el.scrollHeight - el.clientHeight)
      el.style.setProperty('--scroll-progress', String(el.scrollTop / max))
      setScrolled(el.scrollTop > 20)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll ile ortaya çıkma animasyonları
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in')
          io.unobserve(entry.target)
        }
      })
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 })

    const scan = () => {
      document
        .querySelectorAll('[data-reveal]:not(.in), [data-mask]:not(.in), [data-clip]:not(.in)')
        .forEach(el => io.observe(el))
    }

    scan()
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [])

  // Aktif bölümü takip et
  useEffect(() => {
    if (!isAuthenticated) return

    const sections = ['hero', ...NAV_ITEMS.map(i => i.id)]
      .map(id => document.getElementById(id))
      .filter(Boolean)

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveSection(entry.target.id)
      })
    }, { rootMargin: '-45% 0px -50% 0px' })

    sections.forEach(s => io.observe(s))
    return () => io.disconnect()
  }, [isAuthenticated, notes.length, photos.length])

  // Klavye kontrolleri (ESC, ok tuşları)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && menuOpen) setMenuOpen(false)
      if (!lightboxImage) return

      if (e.key === 'Escape') {
        setLightboxImage(null)
      } else if (e.key === 'ArrowLeft') {
        const currentIndex = photos.indexOf(lightboxImage)
        const prevIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1
        setLightboxImage(photos[prevIndex])
      } else if (e.key === 'ArrowRight') {
        const currentIndex = photos.indexOf(lightboxImage)
        const nextIndex = currentIndex === photos.length - 1 ? 0 : currentIndex + 1
        setLightboxImage(photos[nextIndex])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxImage, photos, menuOpen])

  // Modal / menü açıkken scroll kilidi
  const anyOverlayOpen = Boolean(
    lightboxImage || menuOpen || showUploadModal || showNotesModal ||
    showAudioNotesModal || showTimelineModal || showMapModal
  )

  useEffect(() => {
    document.body.classList.toggle('is-locked', anyOverlayOpen)
    return () => document.body.classList.remove('is-locked')
  }, [anyOverlayOpen])

  const goToSection = (id) => {
    setMenuOpen(false)
    const el = document.getElementById(id)
    if (el) {
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 78,
        behavior: 'smooth'
      })
    }
  }

  const showLightboxNeighbor = (step) => {
    const currentIndex = photos.indexOf(lightboxImage)
    if (currentIndex === -1 || photos.length === 0) return
    const nextIndex = (currentIndex + step + photos.length) % photos.length
    setLightboxImage(photos[nextIndex])
  }

  // Birlikte geçirilen süre hesaplama
  const startDate = new Date('2025-09-08T00:00:00+03:00')
  const elapsed = currentDate - startDate
  const daysTogether = Math.floor(elapsed / 86400000)
  const hoursTogether = Math.floor(elapsed / 3600000) % 24
  const minutesTogether = Math.floor(elapsed / 60000) % 60
  const secondsTogether = Math.floor(elapsed / 1000) % 60

  const pad = (n) => String(n).padStart(2, '0')

  const ambience = (
    <div className="ambience" aria-hidden="true">
      <span className="blush blush-1" />
      <span className="blush blush-2" />
      <div className="hearts">
        {FLOATING_HEARTS.map((h, i) => (
          <span
            key={i}
            className="heart"
            style={{
              left: `${h.left}%`,
              fontSize: `${h.size}px`,
              animationDuration: `${h.duration}s`,
              animationDelay: `${h.delay}s`,
              '--drift': `${h.drift}px`
            }}
          >
            ♥
          </span>
        ))}
      </div>
      <span className="grain" />
    </div>
  )

  const themeButton = (extraClass = '') => (
    <button
      className={`theme-btn ${extraClass}`}
      onClick={toggleTheme}
      aria-label="Tema değiştir"
      title={`Tema: ${getThemeName()}`}
    >
      <span className="theme-swatch" />
      <span className="theme-btn-name">{getThemeName()}</span>
    </button>
  )

  // Giriş yapılmadıysa login ekranını göster
  if (!isAuthenticated) {
    return (
      <div className="auth">
        {ambience}

        <div className="auth-bar">
          <span className="eyebrow">♥ Baha & Ayşenur</span>
          {themeButton()}
        </div>

        <div className="auth-main">
          <div>
            <h1 className="auth-title">
              <span data-mask><span>Baha</span></span>
              <span data-mask style={{ '--i': 1 }}><span><em>♥</em> Ayşenur</span></span>
            </h1>
            <p className="auth-lede" data-reveal style={{ '--i': 3 }}>
              İki kişilik minik bir dünya. Fotoğraflar, sesler, notlar ve
              sonsuza kadar saklayacağımız bütün güzel anlar.
            </p>
            <p className="auth-rule" data-reveal style={{ '--i': 4 }}>
              ♥ 08 Eylül 2025'ten beri
            </p>
          </div>

          <div className="auth-card" data-reveal style={{ '--i': 2 }}>
            <div className="auth-card-head">
              <span className="eyebrow">{showRegister ? 'Kayıt' : 'Giriş'}</span>
              <h2>{showRegister ? 'Aramıza katıl' : 'Tekrar hoş geldin'}</h2>
            </div>

            <form onSubmit={showRegister ? handleRegister : handleLogin} className="auth-form">
              <label className="field">
                <span className="field-label">Kullanıcı Adı</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={showRegister ? 'Kullanıcı adı seçin' : 'Kullanıcı adınız'}
                  autoComplete="username"
                  required
                />
              </label>

              <label className="field">
                <span className="field-label">Şifre</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={showRegister ? 'En az 4 karakter' : 'Şifreniz'}
                  autoComplete={showRegister ? 'new-password' : 'current-password'}
                  required
                />
              </label>

              {loginError && <div className="form-error">{loginError}</div>}

              <button type="submit" className="btn btn-primary btn-block">
                {showRegister ? 'Kayıt Ol' : 'Giriş Yap'}
              </button>

              <button
                type="button"
                className="btn btn-quiet btn-block"
                onClick={() => {
                  setShowRegister(!showRegister)
                  setLoginError('')
                  setUsername('')
                  setPassword('')
                }}
              >
                {showRegister ? 'Zaten hesabım var' : 'Hesabım yok, kayıt ol'}
              </button>
            </form>

            <p className="auth-foot">
              Fotoğraflarımız ve notlarımız sadece giriş yapanlara görünür 🤍
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {ambience}
      <div className="scroll-progress" aria-hidden="true" />

      <header className={`nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="nav-inner">
          <button className="brand" onClick={() => goToSection('hero')}>
            <span className="brand-mark">♥</span>
            <span className="brand-text">
              <strong>Baha & Ayşenur</strong>
              <small>{daysTogether} gün</small>
            </span>
          </button>

          <nav className="nav-links">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`nav-link ${activeSection === item.id ? 'is-active' : ''}`}
                onClick={() => goToSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="nav-actions">
            {themeButton()}
            <button className="btn btn-ghost btn-sm nav-logout" onClick={handleLogout}>
              Çıkış
            </button>
            <button
              className={`burger ${menuOpen ? 'is-open' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menü"
              aria-expanded={menuOpen}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <div className={`menu-overlay ${menuOpen ? 'is-open' : ''}`}>
        <nav className="menu-list">
          {NAV_ITEMS.map((item, i) => (
            <button
              key={item.id}
              className="menu-item"
              style={{ '--i': i }}
              onClick={() => goToSection(item.id)}
            >
              <span className="menu-item-index">0{i + 1}</span>
              <span className="menu-item-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="menu-foot" style={{ '--i': NAV_ITEMS.length }}>
          <span>{currentUser?.username === 'baha' ? 'Baha' : currentUser?.username === 'aysenur' ? 'Ayşenur' : currentUser?.username}</span>
          <button className="btn btn-quiet btn-sm" onClick={handleLogout}>Çıkış Yap</button>
        </div>
      </div>

      <main className="content">
        {/* Hero */}
        <section id="hero" className="hero">
          <div className="hero-meta" data-reveal>
            <span>08 Eylül 2025</span>
            <span className="dot" />
            <span>Bizim küçük dünyamız</span>
          </div>

          <h1 className="hero-title">
            <span data-mask><span>Baha</span></span>
            <span data-mask className="line-2" style={{ '--i': 1 }}><span><em>♥</em> Ayşenur</span></span>
          </h1>
          <p className="hero-surname" data-reveal style={{ '--i': 3 }}>Şenel</p>

          <div className="hero-grid">
            <p className="hero-lede" data-reveal style={{ '--i': 4 }}>
              Bütün güzel anlarımız burada: fotoğraflar, sesler, notlar
              ve birlikte gezdiğimiz her yer.
              <br />
              Sadece ikimize ait.{'\u00A0'}🤍
            </p>

            <div className="counter" data-reveal style={{ '--i': 5 }}>
              <span className="counter-value">{daysTogether}</span>
              <span className="counter-caption">gündür birlikte</span>
              <div className="counter-clock">
                <span>{pad(hoursTogether)} SA</span>
                <span>{pad(minutesTogether)} DK</span>
                <span>{pad(secondsTogether)} SN</span>
              </div>
            </div>
          </div>

          <div className="marquee" data-reveal style={{ '--i': 6 }}>
            <div className="marquee-track">
              {Array.from({ length: 2 }).map((_, k) => (
                <span key={k}>
                  Seni seviyorum ♥ {daysTogether} gündür birlikte ♥ Sonsuza dek ♥ Seni seviyorum ♥ {daysTogether} gündür birlikte ♥ Sonsuza dek ♥
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Aşk mektubu */}
        <section id="letter" className="section">
          <article className="letter">
            <div className="letter-side" data-reveal>
              <span className="eyebrow">Mektup</span>
              <h2 className="letter-title">Sevgilim<br />Ayşenur'a,</h2>
            </div>

            <div className="letter-body" data-reveal style={{ '--i': 1 }}>
              <p>
                Seninle geçirdiğim her an hayatımın en güzel anları.
                Gülüşün benim en sevdiğim melodi, gözlerin benim en sevdiğim manzara.
                Her yeni günde seninle olmak beni dünyanın en şanslı insanı yapıyor.
              </p>
              <p>
                Bu site sadece sana olan aşkımın küçük bir göstergesi.
                Seninle paylaştığımız tüm anılar kalbimde sonsuza kadar yaşayacak.
              </p>
              <p className="letter-sign">Seni sonsuza dek seven, Baha</p>

              <div className={`letter-secret ${showLoveNote ? 'is-open' : ''}`}>
                <div className="letter-secret-inner">
                  <p>
                    Her sabah gözlerimi açtığımda ilk düşündüğüm sensin...
                    Her gece uyumadan önce son düşündüğüm de...
                    Sen benim hayatımın en güzel armağanısın.
                    Seninle her an özel, seninle her gün bayram.
                    Seni çok ama çok seviyorum.
                  </p>
                </div>
              </div>

              <div className="letter-actions">
                <button className="btn" onClick={() => setShowLoveNote(!showLoveNote)}>
                  {showLoveNote ? 'Mesajı Gizle' : 'Özel Mesajı Aç'}
                </button>
              </div>
            </div>
          </article>
        </section>

        {/* Fotoğraf galerisi */}
        <section id="gallery" className={`section ${isEditMode ? 'is-edit-mode' : ''}`}>
          <div className="sec-head" data-reveal>
            <div className="sec-head-text">
              <span className="eyebrow">Galeri</span>
              <h2 className="sec-title">Anı<em>larımız</em></h2>
              <p className="sec-sub">{photos.length} kare, tek bir hikâye</p>
            </div>
            {currentUser?.role === 'admin' && (
              <div className="sec-actions">
                <button className="btn btn-primary btn-sm" onClick={() => setShowUploadModal(true)}>
                  Fotoğraf Yükle
                </button>
                <button
                  className={`btn btn-ghost btn-sm ${isEditMode ? 'is-active' : ''}`}
                  onClick={() => setIsEditMode(!isEditMode)}
                >
                  {isEditMode ? 'Bitti' : 'Sırala'}
                </button>
              </div>
            )}
          </div>

          {photos.length === 0 ? (
            <div className="empty" data-reveal>
              <p>Henüz fotoğraf yok</p>
              {currentUser?.role === 'admin' && <span>İlk anınızı yükleyin</span>}
            </div>
          ) : (
            <>
              <div className="gallery-grid">
                {(() => {
                  const startIndex = (currentPhotosPage - 1) * photosPerPage
                  const currentPhotos = photos.slice(startIndex, startIndex + photosPerPage)

                  return currentPhotos.map((photo, index) => {
                    const globalIndex = startIndex + index
                    const isDraggingThis = isDragging && draggedIndex === globalIndex
                    return (
                      <figure
                        key={globalIndex}
                        className={`photo-item ${isDraggingThis ? 'dragging' : ''} ${currentUser?.role === 'admin' ? 'draggable' : ''}`}
                        data-reveal
                        style={{ '--i': index }}
                        onClick={() => {
                          if (!isDragging && !touchStartIndex && !isEditMode) {
                            setLightboxImage(photo)
                          }
                        }}
                        draggable={currentUser?.role === 'admin' && !isEditMode}
                        {...(currentUser?.role === 'admin' && !isEditMode ? {
                          onDragStart: (e) => handleDragStart(e, globalIndex),
                          onDragOver: handleDragOver,
                          onDrop: (e) => handleDrop(e, globalIndex),
                          onDragEnd: handleDragEnd,
                          onTouchStart: (e) => handleTouchStart(e, globalIndex),
                          onTouchMove: handleTouchMove,
                          onTouchEnd: handleTouchEnd
                        } : {})}
                      >
                        <img src={photo} alt={`Anımız ${globalIndex + 1}`} loading="lazy" />
                        <span className="photo-index">{String(globalIndex + 1).padStart(2, '0')}</span>
                        {currentUser?.role === 'admin' && isEditMode && (
                          <div className="order-controls">
                            <button
                              className="order-btn"
                              disabled={globalIndex === 0}
                              onClick={(e) => { e.stopPropagation(); handleMovePhoto(globalIndex, 'up') }}
                              aria-label="Yukarı taşı"
                            >↑</button>
                            <button
                              className="order-btn"
                              disabled={globalIndex === photos.length - 1}
                              onClick={(e) => { e.stopPropagation(); handleMovePhoto(globalIndex, 'down') }}
                              aria-label="Aşağı taşı"
                            >↓</button>
                          </div>
                        )}
                      </figure>
                    )
                  })
                })()}
              </div>

              {photos.length > photosPerPage && (
                <Pagination
                  page={currentPhotosPage}
                  total={Math.ceil(photos.length / photosPerPage)}
                  onChange={setCurrentPhotosPage}
                />
              )}
            </>
          )}
        </section>

        {/* Aşk notları */}
        <section id="notes" className="section">
          <div className="sec-head" data-reveal>
            <div className="sec-head-text">
              <span className="eyebrow">Kelimeler</span>
              <h2 className="sec-title">Aşk <em>Notlarımız</em></h2>
              <p className="sec-sub">Birbirimize bıraktığımız izler</p>
            </div>
            {currentUser?.role === 'admin' && (
              <div className="sec-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { setEditingNote(null); setNewNote(''); setShowNotesModal(true) }}
                >
                  Not Ekle
                </button>
                <button
                  className={`btn btn-ghost btn-sm ${editingNote === 'all' ? 'is-active' : ''}`}
                  onClick={() => setEditingNote(editingNote ? null : 'all')}
                >
                  {editingNote === 'all' ? 'Bitti' : 'Düzenle'}
                </button>
              </div>
            )}
          </div>

          {notes.length === 0 ? (
            <div className="empty" data-reveal>
              <p>Henüz not eklenmemiş</p>
              {currentUser?.role === 'admin' && <span>İlk notu siz yazın</span>}
            </div>
          ) : (
            <>
              <div className="notes-grid">
                {(() => {
                  const startIndex = (currentNotesPage - 1) * notesPerPage
                  return notes.slice(startIndex, startIndex + notesPerPage).map((note, i) => (
                    <article
                      key={note.id}
                      className={`note-card ${note.author === 'baha' ? 'is-baha' : 'is-aysenur'}`}
                      data-reveal
                      style={{ '--i': i }}
                    >
                      <header className="note-top">
                        <span className="note-who">
                          <span className="avatar">{note.author === 'baha' ? 'B' : 'A'}</span>
                          <span className="note-meta">
                            <strong>{note.author === 'baha' ? 'Baha' : 'Ayşenur'}</strong>
                          </span>
                        </span>
                        <time>
                          {new Date(note.created_at).toLocaleDateString('tr-TR', {
                            day: 'numeric', month: 'long', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </time>
                      </header>
                      <p className="note-body">{note.message}</p>
                      {currentUser?.role === 'admin' && editingNote === 'all' && (
                        <div className="card-tools">
                          <button className="icon-btn" onClick={() => handleEditNote(note)} title="Düzenle">✎</button>
                          <button className="icon-btn is-danger" onClick={() => handleDeleteNote(note.id)} title="Sil">✕</button>
                        </div>
                      )}
                    </article>
                  ))
                })()}
              </div>

              {notes.length > notesPerPage && (
                <Pagination
                  page={currentNotesPage}
                  total={Math.ceil(notes.length / notesPerPage)}
                  onChange={setCurrentNotesPage}
                />
              )}
            </>
          )}
        </section>

        {/* Sesli notlar */}
        <section id="audio" className="section">
          <div className="sec-head" data-reveal>
            <div className="sec-head-text">
              <span className="eyebrow">Sesler</span>
              <h2 className="sec-title">Sesli <em>Notlarımız</em></h2>
              <p className="sec-sub">Yazıya sığmayan her şey</p>
            </div>
            {currentUser?.role === 'admin' && (
              <div className="sec-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingAudioNote(null)
                    setAudioNoteTitle('')
                    setAudioChunks([])
                    setRecordingTime(0)
                    setIsRecording(false)
                    setShowAudioNotesModal(true)
                  }}
                >
                  Sesli Not Ekle
                </button>
                <button
                  className={`btn btn-ghost btn-sm ${editingAudioNote === 'all' ? 'is-active' : ''}`}
                  onClick={() => setEditingAudioNote(editingAudioNote ? null : 'all')}
                >
                  {editingAudioNote === 'all' ? 'Bitti' : 'Düzenle'}
                </button>
              </div>
            )}
          </div>

          {audioNotes.length === 0 ? (
            <div className="empty" data-reveal>
              <p>Henüz sesli not eklenmemiş</p>
              {currentUser?.role === 'admin' && <span>İlk kaydı siz yapın</span>}
            </div>
          ) : (
            <>
              <div className="notes-grid">
                {(() => {
                  const startIndex = (currentAudioNotesPage - 1) * audioNotesPerPage
                  return audioNotes.slice(startIndex, startIndex + audioNotesPerPage).map((note, i) => {
                    const playing = isPlayingAudio === note.id
                    const dur = audioDuration[note.id] || 0
                    const pos = audioProgress[note.id] || 0
                    return (
                      <article
                        key={note.id}
                        className={`note-card is-audio ${note.author === 'baha' ? 'is-baha' : 'is-aysenur'} ${playing ? 'is-playing' : ''}`}
                        data-reveal
                        style={{ '--i': i }}
                      >
                        <header className="note-top">
                          <span className="note-who">
                            <span className="avatar">{note.author === 'baha' ? 'B' : 'A'}</span>
                            <span className="note-meta">
                              <strong>{note.author === 'baha' ? 'Baha' : 'Ayşenur'}</strong>
                            </span>
                          </span>
                          <time>
                            {new Date(note.created_at).toLocaleDateString('tr-TR', {
                              day: 'numeric', month: 'long', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </time>
                        </header>

                        {note.title && <h3 className="audio-title">{note.title}</h3>}

                        {note.audio_url && (
                          <div className="player">
                            <audio
                              id={`audio-${note.id}`}
                              src={note.audio_url}
                              preload="metadata"
                              onLoadedMetadata={(e) => {
                                const duration = e.target.duration
                                setAudioDuration(prev => ({ ...prev, [note.id]: duration }))
                              }}
                              onTimeUpdate={(e) => {
                                setAudioProgress(prev => ({ ...prev, [note.id]: e.target.currentTime }))
                              }}
                              onEnded={() => {
                                setIsPlayingAudio(null)
                                setAudioProgress(prev => ({ ...prev, [note.id]: 0 }))
                              }}
                            />
                            <button
                              className="player-play"
                              aria-label={playing ? 'Duraklat' : 'Oynat'}
                              onClick={() => {
                                const audio = document.getElementById(`audio-${note.id}`)
                                if (playing) {
                                  audio.pause()
                                  setIsPlayingAudio(null)
                                } else {
                                  if (isPlayingAudio) {
                                    const prevAudio = document.getElementById(`audio-${isPlayingAudio}`)
                                    if (prevAudio) {
                                      prevAudio.pause()
                                      prevAudio.currentTime = 0
                                    }
                                    setIsPlayingAudio(null)
                                  }
                                  audio.play()
                                  setIsPlayingAudio(note.id)
                                }
                              }}
                            >
                              {playing ? '❚❚' : '▶'}
                            </button>

                            <div className="player-body">
                              <div className="wave" aria-hidden="true">
                                {Array.from({ length: 28 }).map((_, b) => (
                                  <span key={b} style={{ '--b': b, '--h': `${20 + ((b * 37) % 70)}%` }} />
                                ))}
                                <span
                                  className="wave-mask"
                                  style={{ width: `${dur ? 100 - (pos / dur) * 100 : 100}%` }}
                                />
                              </div>
                              <div className="player-row">
                                <span className="player-time">{formatTime(pos)} / {formatTime(dur)}</span>
                                <input
                                  type="range"
                                  min="0"
                                  max={dur || 0}
                                  value={pos}
                                  onChange={(e) => {
                                    const audio = document.getElementById(`audio-${note.id}`)
                                    const newTime = parseFloat(e.target.value)
                                    audio.currentTime = newTime
                                    setAudioProgress(prev => ({ ...prev, [note.id]: newTime }))
                                  }}
                                  className="player-seek"
                                  step="0.1"
                                  aria-label="Ses konumu"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {currentUser?.role === 'admin' && editingAudioNote === 'all' && (
                          <div className="card-tools">
                            <button className="icon-btn" onClick={() => handleEditAudioNote(note)} title="Düzenle">✎</button>
                            <button className="icon-btn is-danger" onClick={() => handleDeleteAudioNote(note.id)} title="Sil">✕</button>
                          </div>
                        )}
                      </article>
                    )
                  })
                })()}
              </div>

              {audioNotes.length > audioNotesPerPage && (
                <Pagination
                  page={currentAudioNotesPage}
                  total={Math.ceil(audioNotes.length / audioNotesPerPage)}
                  onChange={setCurrentAudioNotesPage}
                />
              )}
            </>
          )}
        </section>

        {/* Aşk kavanozu */}
        <section id="jars" className="section">
          <div className="sec-head" data-reveal>
            <div className="sec-head-text">
              <span className="eyebrow">Bugün</span>
              <h2 className="sec-title">Aşk <em>Kavanozu</em></h2>
              <p className="sec-sub">Her gün sıfırlanır, her gün yeniden dolar</p>
            </div>
          </div>

          <div className="jars">
            {[
              { type: 'ozeldim', title: 'Özledim', emoji: '💙', cta: 'Özledim' },
              { type: 'opucuk', title: 'Öpücük', emoji: '💋', cta: 'Öp' },
              { type: 'sarilma', title: 'Sarılma', emoji: '🤗', cta: 'Sarıl' }
            ].map((jar, i) => {
              const balls = getProportionalBalls(dailyAffections, jar.type, 100)
              const bahaCount = dailyAffections.filter(a => a.type === jar.type && a.username === 'baha').length
              const aysenurCount = dailyAffections.filter(a => a.type === jar.type && a.username === 'aysenur').length
              return (
                <div key={jar.type} className="jar-card" data-reveal style={{ '--i': i }}>
                  <h3 className="jar-name">{jar.title}</h3>
                  <Jar uid={jar.type} balls={balls} />

                  {(currentUser?.username === 'baha' || currentUser?.username === 'aysenur') && (
                    <button className="btn btn-primary btn-block jar-cta" onClick={() => handleAddAffection(jar.type)}>
                      {jar.emoji} {jar.cta}
                    </button>
                  )}

                  <div className="jar-stats">
                    <div className="jar-stat">
                      <span>Baha</span>
                      <b>{bahaCount}</b>
                    </div>
                    <div className="jar-stat">
                      <span>Ayşenur</span>
                      <b>{aysenurCount}</b>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Müzik */}
        <section id="music" className="section">
          <div className="sec-head" data-reveal>
            <div className="sec-head-text">
              <span className="eyebrow">Playlist</span>
              <h2 className="sec-title">Bizim <em>Müziklerimiz</em></h2>
              <p className="sec-sub">Bize ait olan şarkılar</p>
            </div>
          </div>
          <div className="music-frame" data-reveal>
            <iframe
              src="https://open.spotify.com/embed/playlist/2vshuINzSOm7vXwdP8eeIR?utm_source=generator&theme=0"
              width="100%"
              height="380"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Bizim Müziklerimiz"
            />
          </div>
        </section>

        {/* Yerler */}
        <section id="places" className="section">
          <div className="sec-head" data-reveal>
            <div className="sec-head-text">
              <span className="eyebrow">Harita</span>
              <h2 className="sec-title">Birlikte Gittiğimiz <em>Yerler</em></h2>
              <p className="sec-sub">{visitedPlaces.length} durak ve devamı gelecek</p>
            </div>
            {currentUser?.role === 'admin' && (
              <div className="sec-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingPlace(null)
                    setMapForm({ name: '', description: '', date: getTurkeyDateString() })
                    setShowMapModal(true)
                  }}
                >
                  Yer Ekle
                </button>
                <button
                  className={`btn btn-ghost btn-sm ${editingPlace === 'all' ? 'is-active' : ''}`}
                  onClick={() => setEditingPlace(editingPlace ? null : 'all')}
                >
                  {editingPlace ? 'Bitti' : 'Düzenle'}
                </button>
              </div>
            )}
          </div>

          {visitedPlaces.length === 0 ? (
            <div className="empty" data-reveal>
              <p>Henüz yer eklenmemiş</p>
              {currentUser?.role === 'admin' && <span>İlk durağınızı ekleyin</span>}
            </div>
          ) : (
            <>
              <div className="places-list">
                {(() => {
                  const startIndex = (currentPlacesPage - 1) * placesPerPage
                  return visitedPlaces.slice(startIndex, startIndex + placesPerPage).map((place, i) => (
                    <article key={place.id} className="place-card" data-reveal style={{ '--i': i }}>
                      <span className="place-num">{String(startIndex + i + 1).padStart(2, '0')}</span>
                      <div className="place-body">
                        <h3>{place.name}</h3>
                        {place.description && <p>{place.description}</p>}
                      </div>
                      <time className="place-date">
                        {new Date(place.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </time>
                      {currentUser?.role === 'admin' && editingPlace === 'all' && (
                        <div className="card-tools">
                          <button className="icon-btn" onClick={() => handleEditPlace(place)} title="Düzenle">✎</button>
                          <button className="icon-btn is-danger" onClick={() => handleDeletePlace(place.id)} title="Sil">✕</button>
                        </div>
                      )}
                    </article>
                  ))
                })()}
              </div>

              {visitedPlaces.length > placesPerPage && (
                <Pagination
                  page={currentPlacesPage}
                  total={Math.ceil(visitedPlaces.length / placesPerPage)}
                  onChange={setCurrentPlacesPage}
                />
              )}
            </>
          )}
        </section>

        {/* Zaman çizelgesi */}
        <section id="timeline" className="section">
          <div className="sec-head" data-reveal>
            <div className="sec-head-text">
              <span className="eyebrow">Kronoloji</span>
              <h2 className="sec-title">Özel <em>Anlarımız</em></h2>
              <p className="sec-sub">Başlangıçtan bugüne</p>
            </div>
            {currentUser?.role === 'admin' && (
              <div className="sec-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingTimeline(null)
                    setTimelineForm({ icon: '', title: '', date: '', description: '' })
                    setShowTimelineModal(true)
                  }}
                >
                  Olay Ekle
                </button>
                <button
                  className={`btn btn-ghost btn-sm ${editingTimeline === 'all' ? 'is-active' : ''}`}
                  onClick={() => setEditingTimeline(editingTimeline ? null : 'all')}
                >
                  {editingTimeline === 'all' ? 'Bitti' : 'Düzenle'}
                </button>
              </div>
            )}
          </div>

          {timelineEvents.length === 0 ? (
            <div className="empty" data-reveal>
              <p>Henüz özel an eklenmemiş</p>
              {currentUser?.role === 'admin' && <span>İlk anınızı ekleyin</span>}
            </div>
          ) : (
            <div className="timeline">
              {timelineEvents.map((event, i) => (
                <article key={event.id} className="tl-item" data-reveal style={{ '--i': i % 4 }}>
                  <div className="tl-aside">
                    <span className="tl-glyph">{event.icon}</span>
                    <time className="tl-date">{event.date}</time>
                  </div>
                  <div className="tl-card">
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                    {currentUser?.role === 'admin' && editingTimeline === 'all' && (
                      <div className="card-tools">
                        <button className="icon-btn" onClick={() => handleEditTimeline(event)} title="Düzenle">✎</button>
                        <button className="icon-btn is-danger" onClick={() => handleDeleteTimeline(event.id)} title="Sil">✕</button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="footer" data-reveal>
          <span className="footer-heart">♥</span>
          <p className="footer-line">Sonsuza <em>dek</em> birlikte</p>
          <div className="footer-meta">
            <span>{currentDate.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>{daysTogether} gün</span>
            <button onClick={handleLogout} className="btn btn-quiet btn-sm">Çıkış Yap</button>
          </div>
        </footer>
      </main>

      {/* Mobil hızlı gezinme */}
      <nav className="tabbar">
        {NAV_ITEMS.slice(0, 5).map(item => (
          <button
            key={item.id}
            className={`tab ${activeSection === item.id ? 'is-active' : ''}`}
            onClick={() => goToSection(item.id)}
          >
            <span className="tab-dot" />
            <span className="tab-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="lightbox"
          onClick={() => setLightboxImage(null)}
          onTouchStart={(e) => { lightboxTouchX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            if (lightboxTouchX.current === null) return
            const delta = e.changedTouches[0].clientX - lightboxTouchX.current
            if (Math.abs(delta) > 60) showLightboxNeighbor(delta < 0 ? 1 : -1)
            lightboxTouchX.current = null
          }}
        >
          <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
            <span className="lightbox-count">
              {photos.indexOf(lightboxImage) + 1} / {photos.length}
            </span>
            <div className="lightbox-bar-actions">
              {currentUser?.role === 'admin' && (
                <button className="icon-btn is-danger" onClick={() => handlePhotoDelete(lightboxImage)} aria-label="Sil">🗑</button>
              )}
              <button className="icon-btn" onClick={() => setLightboxImage(null)} aria-label="Kapat">✕</button>
            </div>
          </div>

          <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-arrow prev" onClick={() => showLightboxNeighbor(-1)} aria-label="Önceki">‹</button>
            <img key={lightboxImage} src={lightboxImage} alt="Büyük görsel" />
            <button className="lightbox-arrow next" onClick={() => showLightboxNeighbor(1)} aria-label="Sonraki">›</button>
          </div>

          <p className="lightbox-hint">Kaydırarak veya ← → tuşlarıyla gezinin · ESC ile kapatın</p>
        </div>
      )}

      {/* Not modalı */}
      <Modal
        open={showNotesModal && currentUser?.role === 'admin'}
        onClose={() => { setShowNotesModal(false); setEditingNote(null); setNewNote('') }}
        title={editingNote && editingNote !== 'all' ? 'Notu Düzenle' : 'Sevgilime Not Yaz'}
        subtitle={editingNote && editingNote !== 'all' ? 'Notu güncelleyin' : 'Sevgilinize özel bir mesaj bırakın'}
      >
        <form onSubmit={handleAddNote} className="form">
          <label className="field">
            <span className="field-label">Mesaj</span>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Sevgilime yazmak istediğim..."
              rows="6"
              required
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block">
            {editingNote && editingNote !== 'all' ? 'Güncelle' : 'Notu Ekle'}
          </button>
        </form>
      </Modal>

      {/* Sesli not modalı */}
      <Modal
        open={showAudioNotesModal && currentUser?.role === 'admin'}
        onClose={() => {
          if (isRecording) cancelRecording()
          setShowAudioNotesModal(false)
          setEditingAudioNote(null)
          setAudioNoteTitle('')
          setAudioChunks([])
          setRecordingTime(0)
        }}
        title={editingAudioNote && editingAudioNote !== 'all' ? 'Sesli Notu Düzenle' : 'Sesli Not Kaydet'}
        subtitle={editingAudioNote && editingAudioNote !== 'all' ? 'Kaydı güncelleyin' : 'Sevgilinize özel bir ses kaydı bırakın'}
      >
        <form onSubmit={handleAddAudioNote} className="form">
          <label className="field">
            <span className="field-label">Başlık (opsiyonel)</span>
            <input
              type="text"
              value={audioNoteTitle}
              onChange={(e) => setAudioNoteTitle(e.target.value)}
              placeholder="Örn: İyi geceler mesajı"
            />
          </label>

          <div className="recorder">
            {!isRecording && audioChunks.length === 0 && (
              <button type="button" className="rec-start" onClick={startRecording}>
                <span className="rec-dot" />
                Kaydı Başlat
              </button>
            )}

            {isRecording && (
              <div className="rec-live">
                <div className="rec-status">
                  <span className="rec-pulse" />
                  Kaydediliyor · {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </div>
                <div className="rec-bars" aria-hidden="true">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span key={i} style={{ '--b': i }} />
                  ))}
                </div>
                <div className="rec-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={stopRecording}>Durdur</button>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={cancelRecording}>İptal</button>
                </div>
              </div>
            )}

            {!isRecording && audioChunks.length > 0 && (
              <div className="rec-preview">
                <audio
                  src={URL.createObjectURL(new Blob(audioChunks, { type: 'audio/webm' }))}
                  controls
                />
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={() => { setAudioChunks([]); setRecordingTime(0) }}
                >
                  Kaydı Kaldır
                </button>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={audioChunks.length === 0}>
            {editingAudioNote && editingAudioNote !== 'all' ? 'Güncelle' : 'Sesli Notu Ekle'}
          </button>
        </form>
      </Modal>

      {/* Timeline modalı */}
      <Modal
        open={showTimelineModal && currentUser?.role === 'admin'}
        onClose={() => {
          setShowTimelineModal(false)
          setEditingTimeline(null)
          setTimelineForm({ icon: '', title: '', date: '', description: '' })
        }}
        title={editingTimeline && editingTimeline !== 'all' ? 'Özel Anı Düzenle' : 'Özel An Ekle'}
        subtitle={editingTimeline && editingTimeline !== 'all' ? 'Anıyı güncelleyin' : 'Yeni bir anıyı zaman çizelgesine ekleyin'}
      >
        <form onSubmit={handleAddTimeline} className="form">
          <div className="field-row">
            <label className="field field-narrow">
              <span className="field-label">İkon</span>
              <input
                type="text"
                value={timelineForm.icon}
                onChange={(e) => setTimelineForm({ ...timelineForm, icon: e.target.value })}
                placeholder="🎉"
                maxLength="2"
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Başlık</span>
              <input
                type="text"
                value={timelineForm.title}
                onChange={(e) => setTimelineForm({ ...timelineForm, title: e.target.value })}
                placeholder="Örn: İlk Buluşmamız"
                required
              />
            </label>
          </div>
          <label className="field">
            <span className="field-label">Tarih</span>
            <input
              type="text"
              value={timelineForm.date}
              onChange={(e) => setTimelineForm({ ...timelineForm, date: e.target.value })}
              placeholder="Örn: 14 Şubat 2025"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Açıklama</span>
            <textarea
              value={timelineForm.description}
              onChange={(e) => setTimelineForm({ ...timelineForm, description: e.target.value })}
              placeholder="Bu özel anı açıklayın..."
              rows="4"
              required
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block">
            {editingTimeline && editingTimeline !== 'all' ? 'Güncelle' : 'Ekle'}
          </button>
        </form>
      </Modal>

      {/* Fotoğraf yükleme modalı */}
      <Modal
        open={showUploadModal && currentUser?.role === 'admin'}
        onClose={() => setShowUploadModal(false)}
        title="Fotoğraf Yükle"
        subtitle="Birlikte çektiğiniz özel bir kareyi ekleyin"
      >
        <div className="uploader">
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            disabled={uploading}
            id="photo-upload"
            hidden
          />
          <label htmlFor="photo-upload" className={`dropzone ${uploading ? 'is-busy' : ''}`}>
            {uploading ? (
              <>
                <span className="spinner" />
                <span>Yükleniyor…</span>
              </>
            ) : (
              <>
                <span className="dropzone-icon">＋</span>
                <span className="dropzone-title">Fotoğraf Seç</span>
                <span className="dropzone-hint">JPG · PNG · JPEG</span>
              </>
            )}
          </label>
        </div>
      </Modal>

      {/* Yer ekleme modalı */}
      <Modal
        open={showMapModal && currentUser?.role === 'admin'}
        onClose={() => {
          setShowMapModal(false)
          setEditingPlace(null)
          setMapForm({ name: '', description: '', date: getTurkeyDateString() })
        }}
        title={editingPlace && editingPlace !== 'all' ? 'Yeri Düzenle' : 'Yer Ekle'}
        subtitle={editingPlace && editingPlace !== 'all' ? 'Bilgileri güncelleyin' : 'Birlikte gittiğiniz özel bir yeri ekleyin'}
      >
        <form onSubmit={handleAddPlace} className="form">
          <label className="field">
            <span className="field-label">Yer Adı</span>
            <input
              type="text"
              value={mapForm.name}
              onChange={(e) => setMapForm({ ...mapForm, name: e.target.value })}
              placeholder="Örn: İstanbul, Kapadokya"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Açıklama (opsiyonel)</span>
            <textarea
              value={mapForm.description}
              onChange={(e) => setMapForm({ ...mapForm, description: e.target.value })}
              placeholder="Bu yer hakkında bir şeyler yazın..."
              rows="3"
            />
          </label>
          <label className="field">
            <span className="field-label">Tarih</span>
            <input
              type="date"
              value={mapForm.date}
              onChange={(e) => setMapForm({ ...mapForm, date: e.target.value })}
              max={getTurkeyDateString()}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block">
            {editingPlace && editingPlace !== 'all' ? 'Güncelle' : 'Yeri Ekle'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

// Cam kavanoz — SVG ile çizilmiş gövde, içindekiler gövdeye kırpılır
const JAR_BODY = 'M27 54 C27 38 42 32.5 42 32.5 L78 32.5 C78 32.5 93 38 93 54 L93 140 C93 156.5 81 165 60 165 C39 165 27 156.5 27 140 Z'
const JAR_INNER = 'M31 55 C31 41 45.5 36 45.5 36 L74.5 36 C74.5 36 89 41 89 55 L89 138.5 C89 152.5 78 160.5 60 160.5 C42 160.5 31 152.5 31 138.5 Z'

function Jar({ uid, balls }) {
  const cols = 8
  const stepX = 6.6
  const stepY = 6.6
  const baseX = 36.8
  const baseY = 152

  return (
    <svg className="jar-svg" viewBox="0 0 120 178" aria-hidden="true">
      <defs>
        <linearGradient id={`glass-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="26%" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="72%" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.62" />
        </linearGradient>
        <linearGradient id={`lid-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-2)" />
          <stop offset="55%" stopColor="var(--accent-2)" stopOpacity="0.82" />
          <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0.55" />
        </linearGradient>
        <clipPath id={`inner-${uid}`}>
          <path d={JAR_INNER} />
        </clipPath>
      </defs>

      {/* zemin gölgesi */}
      <ellipse cx="60" cy="171" rx="29" ry="4.5" fill="var(--ink)" opacity="0.09" />

      {/* kapak */}
      <rect x="35" y="7" width="50" height="17" rx="6.5" fill={`url(#lid-${uid})`} />
      <rect x="35" y="7" width="50" height="6" rx="3" fill="#fff" opacity="0.25" />
      <rect x="41" y="24" width="38" height="9" rx="2.5" fill="var(--accent-2)" opacity="0.55" />

      {/* cam gövde */}
      <path d={JAR_BODY} fill="var(--paper-2)" opacity="0.55" />

      {/* içindekiler */}
      <g clipPath={`url(#inner-${uid})`}>
        {balls.map((affection, index) => {
          const row = Math.floor(index / cols)
          const col = index % cols
          return (
            <circle
              key={`${uid}-${affection.id}`}
              className="jar-ball"
              cx={baseX + col * stepX}
              cy={baseY - row * stepY}
              r="3.1"
              fill={affection.color === 'blue' ? 'var(--him)' : 'var(--her)'}
              style={{ animationDelay: `${(index % 14) * 0.05}s` }}
            />
          )
        })}
      </g>

      {/* cam parlaklığı */}
      <path d={JAR_BODY} fill={`url(#glass-${uid})`} />
      <path d={JAR_BODY} fill="none" stroke="var(--ink)" strokeOpacity="0.14" strokeWidth="1.4" />
      <rect x="37.5" y="62" width="6" height="58" rx="3" fill="#fff" opacity="0.65" />
      <rect x="48" y="66" width="2.6" height="26" rx="1.3" fill="#fff" opacity="0.4" />
    </svg>
  )
}

function Pagination({ page, total, onChange }) {
  if (total <= 1) return null
  return (
    <div className="pagination" data-reveal>
      <button className="page-btn" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}>‹</button>
      <span className="page-count">
        {String(page).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
      <button className="page-btn" onClick={() => onChange(Math.min(total, page + 1))} disabled={page === total}>›</button>
    </div>
  )
}

function Modal({ open, onClose, title, subtitle, children }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <span className="modal-grip" />
        <button className="modal-close" onClick={onClose} aria-label="Kapat">✕</button>
        <header className="modal-head">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export default App
