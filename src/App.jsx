import { useState, useEffect } from 'react'
import './App.css'
import { supabase } from './supabaseClient'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [hearts, setHearts] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showLoveNote, setShowLoveNote] = useState(false)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [uploadedPhotos, setUploadedPhotos] = useState([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Tüm görseller (statik + yüklenenler)
  const staticPhotos = [
    '/ab1.jpeg', '/ab2.jpeg', '/ab3.jpeg', '/ab4.jpeg',
    '/ab5.jpeg', '/ab6.jpeg', '/ab7.jpeg', '/ab8.jpeg',
    '/ab9.jpeg', '/ab10.jpeg', '/ab11.jpeg', '/ab12.jpeg',
    '/ab13.jpeg', '/ab14.jpeg', '/ab15.jpeg', '/ab16.jpeg',
    '/ab17.jpeg', '/ab18.jpeg', '/ab19.jpeg', '/ab20.jpeg',
    '/ab21.jpeg', '/ab22.jpeg', '/ab23.jpeg', '/ab24.jpeg'
  ]
  
  const photos = [...staticPhotos, ...uploadedPhotos]

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
      setShowUploadModal(false)
      alert('Fotoğraf başarıyla yüklendi! 💕')
    } catch (error) {
      console.error('Yükleme hatası:', error)
      alert('Fotoğraf yüklenirken hata oluştu 😔')
    } finally {
      setUploading(false)
    }
  }

  // LocalStorage'dan giriş durumunu kontrol et
  useEffect(() => {
    const savedAuth = localStorage.getItem('lovesite_auth')
    if (savedAuth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  // Giriş işlemi
  const handleLogin = (e) => {
    e.preventDefault()
    setLoginError('')

    // Kullanıcı adı ve şifre kontrolü (şifreleri değiştirebilirsiniz)
    if ((username === 'baha' || username === 'aysenur') && password === '080925') {
      setIsAuthenticated(true)
      localStorage.setItem('lovesite_auth', 'true')
    } else {
      setLoginError('Kullanıcı adı veya şifre hatalı! 💔')
    }
  }

  // Çıkış işlemi
  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('lovesite_auth')
    setUsername('')
    setPassword('')
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
        <div className="login-hearts-bg">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="login-heart"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            >
              ❤️
            </div>
          ))}
        </div>
        <div className="login-box">
          <div className="login-header">
            <div className="login-icon">💕</div>
            <h1>Baha & Ayşenur</h1>
            <p>Özel Aşk Sitesi</p>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label>Kullanıcı Adı</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="baha veya aysenur"
                required
              />
            </div>
            <div className="input-group">
              <label>Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrenizi girin"
                required
              />
            </div>
            {loginError && <div className="login-error">{loginError}</div>}
            <button type="submit" className="login-button">
              💖 Giriş Yap
            </button>
          </form>
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
              <span className="title-decoration">✨</span>
            </h2>
            <button 
              className="upload-button"
              onClick={() => setShowUploadModal(true)}
            >
              📸 Fotoğraf Yükle
            </button>
          </div>
          <div className="gallery-grid">
            {photos.map((photo, index) => (
              <div 
                key={index} 
                className="photo-item"
                onClick={() => setLightboxImage(photo)}
              >
                <img src={photo} alt={`Anımız ${index + 1}`} />
                <div className="photo-overlay">
                  <span className="overlay-text">💕</span>
                </div>
              </div>
            ))}
          </div>
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

        {/* Nedenler bölümü */}
        <section className="reasons-section">
          <h2 className="reasons-title">Seni Neden Seviyorum? ❤️</h2>
          <div className="reasons-grid">
            <div className="reason-card">
              <div className="reason-icon">😊</div>
              <h3>Gülüşün</h3>
              <p>Gülümsemen tüm kötü günlerimi güzel yapıyor</p>
            </div>
            <div className="reason-card">
              <div className="reason-icon">✨</div>
              <h3>Enerjin</h3>
              <p>Yanımda olduğunda hayat daha renkli</p>
            </div>
            <div className="reason-card">
              <div className="reason-icon">💖</div>
              <h3>Kalbin</h3>
              <p>İyiliğin ve sevgin sınır tanımıyor</p>
            </div>
            <div className="reason-card">
              <div className="reason-icon">🌟</div>
              <h3>Sen Sensin</h3>
              <p>Olduğun gibisin ve bu seni mükemmel yapıyor</p>
            </div>
          </div>
        </section>

        {/* Özel anlar timeline */}
        <section className="timeline">
          <h2 className="timeline-title">Özel Anlarımız</h2>
          <div className="timeline-container">
            <div className="timeline-item">
              <div className="timeline-icon">🏫</div>
              <div className="timeline-content">
                <h3>İlk Tanışma - İlkokul</h3>
                <p className="timeline-date">Yıllar önce...</p>
                <p>Her şey ilkokulda başladı... Aynı sınıfta tanıştık ama o zamanlar bilmiyorduk kaderin bizi tekrar bir araya getireceğini.</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-icon">✨</div>
              <div className="timeline-content">
                <h3>Kaderin Buluşturması</h3>
                <p className="timeline-date">5 Temmuz 2025</p>
                <p>Yıllar sonra kader bizi tekrar karşılaştırdı... O an anladım ki bazı şeyler tesadüf değil, yazılmış...</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-icon">💝</div>
              <div className="timeline-content">
                <h3>Sevgili Olduk</h3>
                <p className="timeline-date">8 Eylül 2025</p>
                <p>Hayatımın en güzel gününde "Evet" dedin... İlkokul arkadaşlığından büyük bir aşka dönüşen hikayemiz başladı.</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-icon">🎉</div>
              <div className="timeline-content">
                <h3>Özel Anılarımız</h3>
                <p className="timeline-date">Devam ediyor...</p>
                <p>Seninle yaşadığımız her an özel. Birlikte yarattığımız anılar paha biçilemez.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Upload Modal */}
        {showUploadModal && (
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

