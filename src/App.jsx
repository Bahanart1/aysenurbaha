import { useState, useEffect } from 'react'
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
    }
  }, [isAuthenticated])

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
              notes.map((note) => (
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
              ))
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

