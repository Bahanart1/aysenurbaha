import { useState, useEffect, useMemo } from 'react'
import './App.css'
import { supabase } from './supabaseClient'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [hearts, setHearts] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showLoveNote, setShowLoveNote] = useState(false)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [uploadedPhotos, setUploadedPhotos] = useState([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [currentNotesPage, setCurrentNotesPage] = useState(1)
  const notesPerPage = 5
  const [currentPlacesPage, setCurrentPlacesPage] = useState(1)
  const placesPerPage = 4
  const [currentPhotosPage, setCurrentPhotosPage] = useState(1)
  const photosPerPage = 6
  const [timelineEvents, setTimelineEvents] = useState([])
  const [showTimelineModal, setShowTimelineModal] = useState(false)
  const [timelineForm, setTimelineForm] = useState({
    icon: '',
    title: '',
    date: '',
    description: ''
  })
  const [visitedPlaces, setVisitedPlaces] = useState([])
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapForm, setMapForm] = useState({
    name: '',
    description: ''
  })
  const [dailyAffections, setDailyAffections] = useState([])
  const [todayDate, setTodayDate] = useState(new Date().toISOString().split('T')[0])
  
  
  // Sadece yüklenen fotoğraflar
  const photos = uploadedPhotos

  // Supabase'den fotoğrafları çek
  useEffect(() => {
    fetchPhotos()
  }, [])

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('love-photos')
        .list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) throw error

      const photoUrls = data
        .filter(file => file.name !== '.emptyFolderPlaceholder')
        .map(file => {
          const { data: urlData } = supabase.storage
            .from('love-photos')
            .getPublicUrl(file.name)
          return urlData.publicUrl
        })

      setUploadedPhotos(photoUrls)
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

      await fetchPhotos()
      setCurrentPhotosPage(1) // Yeni fotoğraf yüklendiğinde ilk sayfaya dön
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
      // URL'den dosya adını çıkar
      const fileName = photoUrl.split('/').pop().split('?')[0]

      const { error } = await supabase.storage
        .from('love-photos')
        .remove([fileName])

      if (error) throw error

      await fetchPhotos()
      // Eğer son sayfada tek fotoğraf varsa ve silinirse bir önceki sayfaya geç
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

  // LocalStorage'dan giriş durumunu kontrol et
  useEffect(() => {
    const savedUser = localStorage.getItem('lovesite_user')
    if (savedUser) {
      const user = JSON.parse(savedUser)
      setCurrentUser(user)
      setIsAuthenticated(true)
    }
  }, [])

  // Notları çek
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotes()
      fetchTimelineEvents()
      fetchVisitedPlaces()
      fetchDailyAffections()
    }
  }, [isAuthenticated])

  // Her gün başında tarihi kontrol et
  useEffect(() => {
    const checkNewDay = () => {
      const today = new Date().toISOString().split('T')[0]
      if (today !== todayDate) {
        setTodayDate(today)
        if (isAuthenticated) {
          fetchDailyAffections()
        }
      }
    }
    
    const interval = setInterval(checkNewDay, 60000) // Her dakika kontrol et
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
      setNotes(data || [])
    } catch (error) {
      console.error('Notlar yüklenemedi:', error)
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
      setTimelineEvents(data || [])
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
      setVisitedPlaces(data || [])
    } catch (error) {
      console.error('Yerler yüklenemedi:', error)
    }
  }

  // Harita yeri ekleme
  const handleAddPlace = async (e) => {
    e.preventDefault()
    
    if (!mapForm.name) {
      alert('Yer adı gerekli! 💔')
      return
    }

    try {
      const { error } = await supabase
        .from('visited_places')
        .insert([
          {
            name: mapForm.name,
            description: mapForm.description || '',
            username: currentUser.username
          }
        ])

      if (error) throw error

      setMapForm({ name: '', description: '' })
      await fetchVisitedPlaces()
      setCurrentPlacesPage(1) // Yeni yer eklendiğinde ilk sayfaya dön
      setShowMapModal(false)
      alert('Yer eklendi! 💕')
    } catch (error) {
      console.error('Yer ekleme hatası:', error)
      alert('Yer eklenirken hata oluştu 😔')
    }
  }

  // Harita yeri silme
  const handleDeletePlace = async (placeId) => {
    const confirmDelete = window.confirm('Bu yeri silmek istediğinizden emin misiniz? 🗑️')
    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('visited_places')
        .delete()
        .eq('id', placeId)

      if (error) throw error

      await fetchVisitedPlaces()
      // Eğer son sayfada tek yer varsa ve silinirse bir önceki sayfaya geç
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
      const today = new Date().toISOString().split('T')[0]
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
      const today = new Date().toISOString().split('T')[0]
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
      // Tarih sırasına göre sırala (en eskiden yeniye)
      return [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    }
    
    const bahaBalls = filtered.filter(a => a.username === 'baha')
    const aysenurBalls = filtered.filter(a => a.username === 'aysenur')
    
    const bahaCount = bahaBalls.length
    const aysenurCount = aysenurBalls.length
    
    // Oranları hesapla
    const bahaRatio = bahaCount / total
    const aysenurRatio = aysenurCount / total
    
    // Gösterilecek top sayılarını hesapla
    let bahaToShow = Math.round(maxBalls * bahaRatio)
    let aysenurToShow = Math.round(maxBalls * aysenurRatio)
    
    // Toplam 100'e tamamlamak için
    const totalToShow = bahaToShow + aysenurToShow
    if (totalToShow < maxBalls) {
      // Eksik kalan sayıyı daha fazla topu olan tarafa ekle
      const remaining = maxBalls - totalToShow
      if (bahaCount > aysenurCount) {
        bahaToShow += remaining
      } else {
        aysenurToShow += remaining
      }
    } else if (totalToShow > maxBalls) {
      // Fazla varsa azalt
      const excess = totalToShow - maxBalls
      if (bahaToShow > aysenurToShow) {
        bahaToShow -= excess
      } else {
        aysenurToShow -= excess
      }
    }
    
    // Topları tarih sırasına göre sırala (en eskiden yeniye)
    const sortedBaha = [...bahaBalls].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    const sortedAysenur = [...aysenurBalls].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    
    // En son eklenenlerden başlayarak seç
    const selectedBaha = sortedBaha.slice(-bahaToShow)
    const selectedAysenur = sortedAysenur.slice(-aysenurToShow)
    
    // Sabit sırayla döndür (Baha topları önce, sonra Ayşenur topları, her biri kendi içinde tarih sırasında)
    return [...selectedBaha, ...selectedAysenur].slice(0, maxBalls)
  }

  // Timeline olayı ekleme
  const handleAddTimeline = async (e) => {
    e.preventDefault()
    
    if (!timelineForm.icon || !timelineForm.title || !timelineForm.date || !timelineForm.description) {
      alert('Tüm alanları doldurun! 💔')
      return
    }

    try {
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

      setTimelineForm({ icon: '', title: '', date: '', description: '' })
      await fetchTimelineEvents()
      setShowTimelineModal(false)
      alert('Timeline olayı eklendi! 💕')
    } catch (error) {
      console.error('Timeline ekleme hatası:', error)
      alert('Timeline eklenirken hata oluştu 😔')
    }
  }

  // Timeline olayı silme
  const handleDeleteTimeline = async (eventId) => {
    const confirmDelete = window.confirm('Bu olayı silmek istediğinizden emin misiniz? 🗑️')
    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('timeline_events')
        .delete()
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
  }

  // Not ekleme
  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!newNote.trim()) return

    try {
      const { error } = await supabase
        .from('love_notes')
        .insert([
          {
            author: currentUser.username,
            message: newNote.trim()
          }
        ])

      if (error) throw error

      setNewNote('')
      await fetchNotes()
      setCurrentNotesPage(1) // Yeni not eklendiğinde ilk sayfaya dön
      alert('Not eklendi! 💕')
    } catch (error) {
      console.error('Not eklenirken hata:', error)
      alert('Not eklenirken hata oluştu 😔')
    }
  }

  // Not silme
  const handleDeleteNote = async (noteId) => {
    const confirmDelete = window.confirm('Bu notu silmek istediğinizden emin misiniz? 🗑️')
    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('love_notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error

      await fetchNotes()
      // Eğer son sayfada tek not varsa ve silinirse bir önceki sayfaya geç
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

  // Rastgele kalpler oluştur
  useEffect(() => {
    const interval = setInterval(() => {
      const newHeart = {
        id: Date.now(),
        left: Math.random() * 100,
        animationDuration: 3 + Math.random() * 2,
        size: 10 + Math.random() * 20
      }
      setHearts(prev => [...prev.slice(-20), newHeart])
    }, 500)

    return () => clearInterval(interval)
  }, [])

  // Tarih güncellemesi
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Klavye kontrolleri (ESC, ok tuşları)
  useEffect(() => {
    const handleKeyDown = (e) => {
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
  }, [lightboxImage, photos])

  // Lightbox açıkken scroll'u engelle
  useEffect(() => {
    if (lightboxImage) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [lightboxImage])

  // Birlikte geçirilen süre hesaplama
  const startDate = new Date('2025-09-08') // Sevgili olma tarihimiz
  const daysTogether = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24))

  // Giriş yapılmadıysa login ekranını göster
  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-box">
          <div className="login-header">
            <div className="login-icon">💕</div>
            <h1>Baha & Ayşenur</h1>
            <p>Özel Aşk Sitesi</p>
          </div>
          <form onSubmit={showRegister ? handleRegister : handleLogin} className="login-form">
            <div className="input-group">
              <label>Kullanıcı Adı</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={showRegister ? "Kullanıcı adı seçin" : "Kullanıcı adınız"}
                required
              />
            </div>
            <div className="input-group">
              <label>Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={showRegister ? "Şifre oluşturun (min 4 karakter)" : "Şifreniz"}
                required
              />
            </div>
            {loginError && <div className="login-error">{loginError}</div>}
            <button type="submit" className="login-button">
              {showRegister ? '📝 Kayıt Ol' : '💖 Giriş Yap'}
            </button>
            <button 
              type="button" 
              className="toggle-auth-button"
              onClick={() => {
                setShowRegister(!showRegister)
                setLoginError('')
                setUsername('')
                setPassword('')
              }}
            >
              {showRegister ? 'Zaten hesabım var, Giriş Yap' : 'Hesabım yok, Kayıt Ol'}
            </button>
          </form>
          {!showRegister && (
            <div className="login-footer-message">
              💌 Bu aşka tanıklık etmek istiyorsanız kayıt olabilirsiniz
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Animasyonlu kalpler */}
      <div className="hearts-container">
        {hearts.map(heart => (
          <div
            key={heart.id}
            className="floating-heart"
            style={{
              left: `${heart.left}%`,
              animationDuration: `${heart.animationDuration}s`,
              fontSize: `${heart.size}px`
            }}
          >
            ❤️
          </div>
        ))}
      </div>

      {/* Ana içerik */}
      <div className="content">
        {/* Başlık bölümü */}
        <header className="hero-section">
          <h1 className="main-title">
            <span className="name">Baha</span>
            <span className="heart-icon">❤️</span>
            <span className="name">Ayşenur</span>
          </h1>
          <p className="family-name">Şenel</p>
          <p className="subtitle">Bizim Hikayemiz</p>
          <div className="days-counter">
            <div className="counter-box">
              <span className="counter-number">{daysTogether}</span>
              <span className="counter-label">Gündür Sevgiliyiz 💕</span>
            </div>
          </div>
        </header>

        {/* Aşk mesajı bölümü */}
        <section className="love-message">
          <div className="message-card">
            <div className="card-decoration">💖</div>
            <h2>Sevgilim Ayşenur'a,</h2>
            <p>
              Seninle geçirdiğim her an hayatımın en güzel anları. 
              Gülüşün benim en sevdiğim melodi, gözlerin benim en sevdiğim manzara.
              Her yeni günde seninle olmak beni dünyanın en şanslı insanı yapıyor.
            </p>
            <p>
              Bu site sadece sana olan aşkımın küçük bir göstergesi. 
              Seninle paylaştığımız tüm anılar kalbimde sonsuza kadar yaşayacak.
            </p>
            <p className="signature">Seni sonsuza dek seven, Baha ❤️</p>
            <button className="love-button" onClick={() => setShowLoveNote(!showLoveNote)}>
              {showLoveNote ? '💝 Mesajı Gizle' : '💌 Özel Mesaj Aç'}
            </button>
            {showLoveNote && (
              <div className="hidden-note">
                <p>Her sabah gözlerimi açtığımda ilk düşündüğüm sensin... 
                Her gece uyumadan önce son düşündüğüm de... 
                Sen benim hayatımın en güzel armağanısın. 
                Seninle her an özel, seninle her gün bayram. 
                Seni çok ama çok seviyorum! 💕</p>
              </div>
            )}
          </div>
        </section>

        {/* Fotoğraf galerisi */}
        <section className="photo-gallery">
          <div className="gallery-header">
            <h2 className="gallery-title">
              <span className="title-decoration">✨</span>
              Anılarımız
            </h2>
            {currentUser?.role === 'admin' && (
              <button 
                className="upload-button"
                onClick={() => setShowUploadModal(true)}
              >
                📸 Fotoğraf Yükle
              </button>
            )}
          </div>
          <div className="gallery-grid">
            {(() => {
              const totalPages = Math.ceil(photos.length / photosPerPage)
              const startIndex = (currentPhotosPage - 1) * photosPerPage
              const endIndex = startIndex + photosPerPage
              const currentPhotos = photos.slice(startIndex, endIndex)
              
              return (
                <>
                  {currentPhotos.map((photo, index) => {
                    const globalIndex = startIndex + index
                    return (
                      <div 
                        key={globalIndex} 
                        className="photo-item"
                        onClick={() => setLightboxImage(photo)}
                      >
                        <img src={photo} alt={`Anımız ${globalIndex + 1}`} />
                        <div className="photo-overlay">
                          <span className="overlay-text">💕</span>
                        </div>
                      </div>
                    )
                  })}
                </>
              )
            })()}
          </div>
          
          {/* Fotoğraf Sayfalama */}
          {photos.length > photosPerPage && (
            <div className="photos-pagination">
              {(() => {
                const totalPages = Math.ceil(photos.length / photosPerPage)
                return (
                  <>
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPhotosPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPhotosPage === 1}
                    >
                      ← Önceki
                    </button>
                    <span className="pagination-info">
                      Sayfa {currentPhotosPage} / {totalPages}
                    </span>
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPhotosPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPhotosPage === totalPages}
                    >
                      Sonraki →
                    </button>
                  </>
                )
              })()}
            </div>
          )}
        </section>

        {/* Lightbox Modal */}
        {lightboxImage && (
          <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
            <button 
              className="lightbox-close" 
              onClick={() => setLightboxImage(null)}
              aria-label="Kapat"
            >
              ✕
            </button>
            
            <div className="lightbox-counter">
              {photos.indexOf(lightboxImage) + 1} / {photos.length}
            </div>

            {currentUser?.role === 'admin' && (
              <button 
                className="lightbox-delete" 
                onClick={(e) => {
                  e.stopPropagation()
                  handlePhotoDelete(lightboxImage)
                }}
                aria-label="Sil"
              >
                🗑️
              </button>
            )}

            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <img src={lightboxImage} alt="Büyük görsel" />
            </div>
            
            <div className="lightbox-nav">
              <button 
                className="lightbox-prev"
                onClick={(e) => {
                  e.stopPropagation()
                  const currentIndex = photos.indexOf(lightboxImage)
                  const prevIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1
                  setLightboxImage(photos[prevIndex])
                }}
                aria-label="Önceki"
              >
                ‹
              </button>
              <button 
                className="lightbox-next"
                onClick={(e) => {
                  e.stopPropagation()
                  const currentIndex = photos.indexOf(lightboxImage)
                  const nextIndex = currentIndex === photos.length - 1 ? 0 : currentIndex + 1
                  setLightboxImage(photos[nextIndex])
                }}
                aria-label="Sonraki"
              >
                ›
              </button>
            </div>
            
            <div className="lightbox-hint">
              ESC ile kapatabilir, ← → ok tuşları ile gezinebilirsiniz
            </div>
          </div>
        )}

        {/* Not Tahtası Bölümü */}
        <section className="notes-section">
          <div className="notes-header">
            <h2 className="notes-title">
              <span style={{ animation: 'none' }}>✍️</span>
              Aşk Notlarımız
            </h2>
            {currentUser?.role === 'admin' && (
              <button 
                className="add-note-button"
                onClick={() => setShowNotesModal(true)}
              >
                ✍️ Not Ekle
              </button>
            )}
          </div>
          
          <div className="notes-container">
            {notes.length === 0 ? (
              <div className="no-notes">
                <p>Henüz not eklenmemiş 💭</p>
                {currentUser?.role === 'admin' && (
                  <p className="note-hint">İlk notu siz ekleyin!</p>
                )}
              </div>
            ) : (
              <>
                {(() => {
                  const totalPages = Math.ceil(notes.length / notesPerPage)
                  const startIndex = (currentNotesPage - 1) * notesPerPage
                  const endIndex = startIndex + notesPerPage
                  const currentNotes = notes.slice(startIndex, endIndex)
                  
                  return (
                    <>
                      {currentNotes.map((note) => (
                        <div 
                          key={note.id} 
                          className={`note-card ${note.author === 'baha' ? 'note-baha' : 'note-aysenur'}`}
                        >
                          <div className="note-header-card">
                            <span className="note-author">
                              {note.author === 'baha' ? '💙 Baha' : '💕 Ayşenur'}
                            </span>
                            <span className="note-date">
                              {new Date(note.created_at).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="note-message">{note.message}</p>
                          {currentUser?.role === 'admin' && (
                            <button 
                              className="note-delete-btn"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {/* Sayfa Navigasyonu */}
                      {totalPages > 1 && (
                        <div className="notes-pagination">
                          <button
                            className="pagination-btn"
                            onClick={() => setCurrentNotesPage(prev => Math.max(1, prev - 1))}
                            disabled={currentNotesPage === 1}
                          >
                            ← Önceki
                          </button>
                          <span className="pagination-info">
                            Sayfa {currentNotesPage} / {totalPages}
                          </span>
                          <button
                            className="pagination-btn"
                            onClick={() => setCurrentNotesPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentNotesPage === totalPages}
                          >
                            Sonraki →
                          </button>
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            )}
          </div>
        </section>

        {/* Not Ekleme Modal */}
        {showNotesModal && currentUser?.role === 'admin' && (
          <div className="upload-modal-overlay" onClick={() => setShowNotesModal(false)}>
            <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
              <button 
                className="upload-modal-close" 
                onClick={() => setShowNotesModal(false)}
              >
                ✕
              </button>
              <h2>Sevgilime Not Yaz 💌</h2>
              <p>Sevgilinize özel bir mesaj bırakın!</p>
              <form onSubmit={handleAddNote} className="note-form">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Sevgilime yazmak istediğim..."
                  className="note-textarea"
                  rows="6"
                  required
                />
                <button type="submit" className="login-button">
                  💕 Not Ekle
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Spotify Playlist Bölümü */}
        <section className="spotify-section">
          <h2 className="spotify-title">
            <span className="title-decoration">🎵</span>
            Bizim Müziklerimiz
          </h2>
          <div className="spotify-container">
            <iframe
              style={{ borderRadius: '12px' }}
              src="https://open.spotify.com/embed/playlist/2vshuINzSOm7vXwdP8eeIR?utm_source=generator&theme=0"
              width="100%"
              height="352"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Bizim Müziklerimiz"
            ></iframe>
          </div>
        </section>

        {/* Günlük Kavanoz Bölümü */}
        <section className="jar-section">
          <h2 className="jar-title">
            <span className="title-decoration">💕</span>
            Aşk Kavanozu
          </h2>
          <div className="jars-container">
            {/* Özeldim Kavanozu */}
            <div className="jar-item">
              <h3 className="jar-item-title">💙 Özeldim</h3>
              <div className="jar">
                <div className="jar-body">
                  <div className="jar-balls-container">
                    {getProportionalBalls(dailyAffections, 'ozeldim', 100)
                      .map((affection, index) => {
                        const cols = 10
                        const row = Math.floor(index / cols)
                        const col = index % cols
                        const position = {
                          left: `${5 + col * 9}%`,
                          bottom: `${3 + row * 8}%`
                        }
                        return (
                          <div
                            key={`ozeldim-${affection.id}`}
                            className={`jar-ball ${affection.color === 'blue' ? 'ball-blue' : 'ball-pink'}`}
                            style={position}
                          >
                            💙
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
              {(currentUser?.username === 'baha' || currentUser?.username === 'aysenur') && (
                <button 
                  className="jar-button jar-button-ozeldim"
                  onClick={() => handleAddAffection('ozeldim')}
                >
                  💙 Özledim
                </button>
              )}
              <div className="jar-stats-container">
                <div className="jar-stat-item">
                  <span className="jar-stat-label">💙 Baha</span>
                  <span className="jar-stat-number">{dailyAffections.filter(a => a.type === 'ozeldim' && a.username === 'baha').length}</span>
                </div>
                <div className="jar-stat-item">
                  <span className="jar-stat-label">💕 Ayşenur</span>
                  <span className="jar-stat-number">{dailyAffections.filter(a => a.type === 'ozeldim' && a.username === 'aysenur').length}</span>
                </div>
              </div>
            </div>

            {/* Öpücük Kavanozu */}
            <div className="jar-item">
              <h3 className="jar-item-title">💋 Öpücük</h3>
              <div className="jar">
                <div className="jar-body">
                  <div className="jar-balls-container">
                    {getProportionalBalls(dailyAffections, 'opucuk', 100)
                      .map((affection, index) => {
                        const cols = 10
                        const row = Math.floor(index / cols)
                        const col = index % cols
                        const position = {
                          left: `${5 + col * 9}%`,
                          bottom: `${3 + row * 8}%`
                        }
                        return (
                          <div
                            key={`opucuk-${affection.id}`}
                            className={`jar-ball ${affection.color === 'blue' ? 'ball-blue' : 'ball-pink'}`}
                            style={position}
                          >
                            💋
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
              {(currentUser?.username === 'baha' || currentUser?.username === 'aysenur') && (
                <button 
                  className="jar-button jar-button-opucuk"
                  onClick={() => handleAddAffection('opucuk')}
                >
                  💋 Öp
                </button>
              )}
              <div className="jar-stats-container">
                <div className="jar-stat-item">
                  <span className="jar-stat-label">💙 Baha</span>
                  <span className="jar-stat-number">{dailyAffections.filter(a => a.type === 'opucuk' && a.username === 'baha').length}</span>
                </div>
                <div className="jar-stat-item">
                  <span className="jar-stat-label">💕 Ayşenur</span>
                  <span className="jar-stat-number">{dailyAffections.filter(a => a.type === 'opucuk' && a.username === 'aysenur').length}</span>
                </div>
              </div>
            </div>

            {/* Sarılma Kavanozu */}
            <div className="jar-item">
              <h3 className="jar-item-title">🤗 Sarılma</h3>
              <div className="jar">
                <div className="jar-body">
                  <div className="jar-balls-container">
                    {getProportionalBalls(dailyAffections, 'sarilma', 100)
                      .map((affection, index) => {
                        const cols = 10
                        const row = Math.floor(index / cols)
                        const col = index % cols
                        const position = {
                          left: `${5 + col * 9}%`,
                          bottom: `${3 + row * 8}%`
                        }
                        return (
                          <div
                            key={`sarilma-${affection.id}`}
                            className={`jar-ball ${affection.color === 'blue' ? 'ball-blue' : 'ball-pink'}`}
                            style={position}
                          >
                            🤗
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
              {(currentUser?.username === 'baha' || currentUser?.username === 'aysenur') && (
                <button 
                  className="jar-button jar-button-sarilma"
                  onClick={() => handleAddAffection('sarilma')}
                >
                  🤗 Sarıl
                </button>
              )}
              <div className="jar-stats-container">
                <div className="jar-stat-item">
                  <span className="jar-stat-label">💙 Baha</span>
                  <span className="jar-stat-number">{dailyAffections.filter(a => a.type === 'sarilma' && a.username === 'baha').length}</span>
                </div>
                <div className="jar-stat-item">
                  <span className="jar-stat-label">💕 Ayşenur</span>
                  <span className="jar-stat-number">{dailyAffections.filter(a => a.type === 'sarilma' && a.username === 'aysenur').length}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Harita Bölümü */}
        <section className="map-section">
          <div className="map-header-section">
            <h2 className="map-title">
              <span className="title-decoration">🗺️</span>
              Birlikte Gittiğimiz Yerler
            </h2>
            {currentUser?.role === 'admin' && (
              <button 
                className="add-map-button"
                onClick={() => setShowMapModal(true)}
              >
                📍 Yer Ekle
              </button>
            )}
          </div>
          <div className="places-list-container">
            {visitedPlaces.length === 0 ? (
              <div className="no-places">
                <p>Henüz yer eklenmemiş 💭</p>
                {currentUser?.role === 'admin' && (
                  <p className="map-hint">İlk yerinizi ekleyin!</p>
                )}
              </div>
            ) : (
              <>
                {(() => {
                  const totalPages = Math.ceil(visitedPlaces.length / placesPerPage)
                  const startIndex = (currentPlacesPage - 1) * placesPerPage
                  const endIndex = startIndex + placesPerPage
                  const currentPlaces = visitedPlaces.slice(startIndex, endIndex)
                  
                  return (
                    <>
                      <div className="places-list">
                        {currentPlaces.map((place) => (
                          <div key={place.id} className="place-card">
                            <div className="place-card-content">
                              <h3 className="place-name">📍 {place.name}</h3>
                              {place.description && (
                                <p className="place-description">{place.description}</p>
                              )}
                              <span className="place-date">
                                {new Date(place.created_at).toLocaleDateString('tr-TR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            {currentUser?.role === 'admin' && (
                              <button 
                                className="place-delete-btn"
                                onClick={() => handleDeletePlace(place.id)}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Sayfa Navigasyonu */}
                      {totalPages > 1 && (
                        <div className="places-pagination">
                          <button
                            className="pagination-btn"
                            onClick={() => setCurrentPlacesPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPlacesPage === 1}
                          >
                            ← Önceki
                          </button>
                          <span className="pagination-info">
                            Sayfa {currentPlacesPage} / {totalPages}
                          </span>
                          <button
                            className="pagination-btn"
                            onClick={() => setCurrentPlacesPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPlacesPage === totalPages}
                          >
                            Sonraki →
                          </button>
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            )}
          </div>
        </section>

        {/* Özel anlar timeline */}
        <section className="timeline">
          <div className="timeline-header-section">
            <h2 className="timeline-title">Özel Anlarımız</h2>
            {currentUser?.role === 'admin' && (
              <button 
                className="add-timeline-button"
                onClick={() => setShowTimelineModal(true)}
              >
                ➕ Olay Ekle
              </button>
            )}
          </div>
          <div className="timeline-container">
            {timelineEvents.length === 0 ? (
              <div className="no-timeline">
                <p>Henüz özel an eklenmemiş 💭</p>
                {currentUser?.role === 'admin' && (
                  <p className="timeline-hint">İlk anınızı ekleyin!</p>
                )}
              </div>
            ) : (
              timelineEvents.map((event) => (
                <div key={event.id} className="timeline-item">
                  <div className="timeline-icon">{event.icon}</div>
                  <div className="timeline-content">
                    <h3>{event.title}</h3>
                    <p className="timeline-date">{event.date}</p>
                    <p>{event.description}</p>
                    {currentUser?.role === 'admin' && (
                      <button 
                        className="timeline-delete-btn"
                        onClick={() => handleDeleteTimeline(event.id)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Timeline Ekleme Modal */}
        {showTimelineModal && currentUser?.role === 'admin' && (
          <div className="upload-modal-overlay" onClick={() => setShowTimelineModal(false)}>
            <div className="upload-modal timeline-modal" onClick={(e) => e.stopPropagation()}>
              <button 
                className="upload-modal-close" 
                onClick={() => setShowTimelineModal(false)}
              >
                ✕
              </button>
              <h2>Özel An Ekle 💫</h2>
              <p>Yeni bir özel anınızı timeline'a ekleyin!</p>
              <form onSubmit={handleAddTimeline} className="timeline-form">
                <div className="input-group">
                  <label>İkon (Emoji)</label>
                  <input
                    type="text"
                    value={timelineForm.icon}
                    onChange={(e) => setTimelineForm({...timelineForm, icon: e.target.value})}
                    placeholder="Örn: 🎉, 💕, ✨"
                    maxLength="2"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Başlık</label>
                  <input
                    type="text"
                    value={timelineForm.title}
                    onChange={(e) => setTimelineForm({...timelineForm, title: e.target.value})}
                    placeholder="Örn: İlk Buluşmamız"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Tarih</label>
                  <input
                    type="text"
                    value={timelineForm.date}
                    onChange={(e) => setTimelineForm({...timelineForm, date: e.target.value})}
                    placeholder="Örn: 14 Şubat 2025"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Açıklama</label>
                  <textarea
                    value={timelineForm.description}
                    onChange={(e) => setTimelineForm({...timelineForm, description: e.target.value})}
                    placeholder="Bu özel anı açıklayın..."
                    className="note-textarea"
                    rows="4"
                    required
                  />
                </div>
                <button type="submit" className="login-button">
                  💕 Ekle
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && currentUser?.role === 'admin' && (
          <div className="upload-modal-overlay" onClick={() => setShowUploadModal(false)}>
            <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
              <button 
                className="upload-modal-close" 
                onClick={() => setShowUploadModal(false)}
              >
                ✕
              </button>
              <h2>Fotoğraf Yükle 📸</h2>
              <p>Sevgilinizle çektiğiniz özel bir fotoğrafı yükleyin!</p>
              <div className="upload-area">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  id="photo-upload"
                  style={{ display: 'none' }}
                />
                <label htmlFor="photo-upload" className={`upload-label ${uploading ? 'uploading' : ''}`}>
                  {uploading ? (
                    <>
                      <div className="upload-spinner"></div>
                      <span>Yükleniyor... 💕</span>
                    </>
                  ) : (
                    <>
                      <span className="upload-icon">📷</span>
                      <span>Fotoğraf Seç</span>
                    </>
                  )}
                </label>
              </div>
              <div className="upload-hint">
                💡 JPG, PNG veya JPEG formatında olmalı
              </div>
            </div>
          </div>
        )}

        {/* Harita Yer Ekleme Modal */}
        {showMapModal && currentUser?.role === 'admin' && (
          <div className="upload-modal-overlay" onClick={() => setShowMapModal(false)}>
            <div className="upload-modal map-modal" onClick={(e) => e.stopPropagation()}>
              <button 
                className="upload-modal-close" 
                onClick={() => setShowMapModal(false)}
              >
                ✕
              </button>
              <h2>Yer Ekle 📍</h2>
              <p>Birlikte gittiğiniz özel bir yeri haritaya ekleyin!</p>
              <form onSubmit={handleAddPlace} className="map-form">
                <div className="input-group">
                  <label>Yer Adı</label>
                  <input
                    type="text"
                    value={mapForm.name}
                    onChange={(e) => setMapForm({...mapForm, name: e.target.value})}
                    placeholder="Örn: İstanbul, Kapadokya"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Açıklama (Opsiyonel)</label>
                  <textarea
                    value={mapForm.description}
                    onChange={(e) => setMapForm({...mapForm, description: e.target.value})}
                    placeholder="Bu yer hakkında bir şeyler yazın..."
                    className="note-textarea"
                    rows="3"
                  />
                </div>
                <button type="submit" className="login-button">
                  💕 Yer Ekle
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="footer">
          <div className="footer-heart">💕</div>
          <p>Sonsuza dek birlikte...</p>
          <p className="footer-date">{currentDate.toLocaleDateString('tr-TR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
          <button onClick={handleLogout} className="logout-button">
            🚪 Çıkış Yap
          </button>
        </footer>
      </div>
    </div>
  )
}

export default App

