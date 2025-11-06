# 💕 Baha & Ayşenur - Aşk Sitemiz

Sevgilim Ayşenur için hazırladığım özel romantik web sitesi.

## 🎨 Özellikler

- ✨ Animasyonlu kalp efektleri
- 💝 Birlikte geçirilen gün sayacı
- 📸 Fotoğraf galerisi
- 📅 Özel anlar zaman çizelgesi
- 💌 Romantik mesajlar
- 📱 Mobil uyumlu tasarım

## 🚀 Kurulum

1. **Bağımlılıkları yükleyin:**
```bash
npm install
```

2. **Geliştirme sunucusunu başlatın:**
```bash
npm run dev
```

3. **Tarayıcınızda açın:**
Otomatik olarak `http://localhost:5173` adresinde açılacaktır.

## 📸 Fotoğraf Ekleme

Fotoğraflarınızı eklemek için:

1. `public` klasörü içinde `photos` adında bir klasör oluşturun:
```bash
mkdir public/photos
```

2. Fotoğraflarınızı `public/photos` klasörüne ekleyin:
   - `photo1.jpg`
   - `photo2.jpg`
   - `photo3.jpg`
   - `photo4.jpg`
   - `photo5.jpg`
   - `photo6.jpg`

3. `src/App.jsx` dosyasında fotoğraf placeholder'larını güncelleyin:
```jsx
// Örnek:
<div className="photo-placeholder">
  <img src="/photos/photo1.jpg" alt="Bizim anımız" />
</div>
```

## 🎯 Özelleştirme

### Tarihleri Güncelleme

`src/App.jsx` dosyasında:

```jsx
// İlk buluşma tarihinizi ekleyin (satır 21)
const startDate = new Date('2023-01-01') // Kendi tarihinizi yazın
```

### Mesajları Değiştirme

`src/App.jsx` dosyasında `.love-message` bölümündeki metinleri istediğiniz gibi düzenleyin.

### Timeline (Zaman Çizelgesi) Güncelleme

`src/App.jsx` dosyasında `.timeline-item` bölümlerini özel anılarınızla değiştirin:

```jsx
<div className="timeline-item">
  <div className="timeline-icon">💕</div>
  <div className="timeline-content">
    <h3>Özel Anınızın Başlığı</h3>
    <p className="timeline-date">14 Şubat 2023</p>
    <p>Anınızın açıklaması...</p>
  </div>
</div>
```

## 🎨 Renkleri Değiştirme

`src/index.css` dosyasında gradient renklerini değiştirebilirsiniz:

```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

## 📦 Production Build

Siteyi yayınlamak için:

```bash
npm run build
```

Build dosyaları `dist` klasöründe oluşturulacaktır.

## 🌐 Yayınlama

Siteyi ücretsiz yayınlamak için:

- **Vercel**: [vercel.com](https://vercel.com)
- **Netlify**: [netlify.com](https://netlify.com)
- **GitHub Pages**: [pages.github.com](https://pages.github.com)

## 💝 Notlar

- Özel anılarınızı timeline bölümüne ekleyin
- Mesajları kalben yazın
- Fotoğraflarınızı kaliteli seçin
- Tarihleri unutmayın! 😊

---

**Seni çok seviyorum Ayşenur! ❤️**

*- Baha*

