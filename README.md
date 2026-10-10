# SLS Finder - Kabupaten Kepulauan Selayar

WebGIS modern, cepat, dan ringan berbasis static HTML/JS untuk mendeteksi posisi Satuan Lingkungan Setempat (SLS), Desa/Kelurahan, dan Kecamatan di Kabupaten Kepulauan Selayar. Aplikasi ini dirancang khusus untuk dapat di-deploy 100% gratis di **GitHub Pages**.

---

## 🌟 Fitur Utama

1. **Deteksi Lokasi Saya (GPS Real-Time)**:
   - Satu klik tombol **"Lokasi Saya"** untuk mengidentifikasi Anda sedang berdiri di SLS apa, Desa apa, dan Kecamatan apa.
   - Dilengkapi radius akurasi GPS dan penanda visual berdenyut (*pulse marker*).
2. **Pencarian Cepat (Unified Instant Search)**:
   - Ketik nama SLS (misal: `Dusun Bunging`, `RT 02`), nama Desa (misal: `Appatanah`, `Benteng`), nama Kecamatan (misal: `Bontosikuyu`), atau 14 digit ID SLS.
   - Peta langsung otomatis meluncur (*fly-to*) dan menyorot poligon wilayah yang dipilih.
3. **Cek Koordinat Manual & Format Cepat**:
   - Tempel (*paste*) koordinat langsung dari Google Maps atau instrumen survei CAPI (contoh: `-6.49178, 120.48547`).
   - Sistem otomatis memeriksa poligon SLS yang menaungi titik tersebut.
4. **Klik Langsung di Peta (Tap Anywhere)**:
   - Sentuh/klik sembarang posisi di peta untuk mengetahui nama SLS, Desa, dan Kecamatan di titik tersebut.
5. **Tombol Home (Reset Tampilan Peta)**:
   - Mengembalikan sudut pandang (*extent*) peta ke seluruh wilayah Kabupaten Kepulauan Selayar dengan satu klik.
6. **Pemilih Basemap (Peta Dasar)**:
   - **OpenStreetMap**: Peta jalan dan toponimi standar.
   - **Citra Satelit Esri**: Foto udara resolusi tinggi untuk melihat fisik atap rumah dan vegetasi di lapangan.
   - **Satelit Hybrid**: Citra satelit lengkap dengan label jalan dan tempat.
   - **Carto Positron**: Tampilan terang minimalis agar garis batas SLS kontras dan jelas.
7. **Filter Wilayah Bertingkat**:
   - Menu dropdown berjenjang: Pilih Kecamatan (11 pilihan) ➔ Pilih Desa ➔ Pilih SLS.
8. **Dukungan PWA & Offline-Ready**:
   - Dilengkapi `manifest.json` dan `sw.js` (Service Worker) agar aset peta dan data GeoJSON tersimpan di cache lokal saat berada di area tanpa sinyal seluler (*blank spot*).

---

## 📂 Struktur Proyek

```
SLSelayar/
├── Final_SLS_202517301.geojson    # Dataset resmi 721 batas SLS Kep. Selayar (BPS 2025.1)
├── index.html                     # Antarmuka utama aplikasi
├── app.js                         # Logika peta, spatial engine (PIP), pencarian, & GPS
├── style.css                      # Styling kustom, animasi drawer, & marker
├── manifest.json                  # PWA Manifest (Add to Home Screen)
├── sw.js                          # Service Worker untuk caching offline
├── PRD_SLS_Selayar.md             # Dokumen Product Requirement Document (PRD)
├── README.md                      # Dokumentasi & panduan deployment
└── .github/
    └── workflows/
        └── deploy.yml             # Otomasi deployment GitHub Pages via GitHub Actions
```

---

## 🚀 Cara Menjalankan di Lokal (Local Testing)

Anda dapat menguji aplikasi di komputer lokal menggunakan server statis sederhana:

### Menggunakan Python:
```bash
python3 -m http.server 8000
```
Lalu buka browser Anda di: `http://localhost:8000`

### Menggunakan Node.js / npx:
```bash
npx serve .
```

---

## 🌐 Cara Deploy ke GitHub Pages

Aplikasi ini dapat di-deploy ke GitHub Pages dengan 2 cara mudah:

### Cara 1: Menggunakan GitHub Actions (Otomatis & Direkomendasikan)
1. Inisialisasi git dan buat commit:
   ```bash
   git init
   git add .
   git commit -m "feat: inisialisasi aplikasi SLS Finder Selayar"
   ```
2. Buat repository baru di GitHub (misal: `SLSelayar`), lalu hubungkan remote:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<username-anda>/SLSelayar.git
   git push -u origin main
   ```
3. Buka repository Anda di GitHub:
   - Masuk ke tab **Settings** ➔ **Pages**.
   - Pada bagian **Build and deployment** ➔ **Source**, pilih **GitHub Actions**.
4. GitHub Actions yang sudah ada di `.github/workflows/deploy.yml` akan otomatis berjalan dan website Anda akan aktif di:
   `https://<username-anda>.github.io/SLSelayar/`

### Cara 2: Deploy Langsung dari Branch
1. Buka tab **Settings** ➔ **Pages** di repository GitHub Anda.
2. Pada bagian **Build and deployment** ➔ **Source**, pilih **Deploy from a branch**.
3. Pilih branch `main` dan folder `/ (root)`, lalu klik **Save**.
4. Tunggu 1–2 menit, web Anda siap diakses!

---

## 📊 Spesifikasi Dataset
- **Sumber**: Wilayah Kerja Statistik (Wilkerstat) BPS Semester 1 2025
- **Jumlah SLS**: 721 SLS
- **Jumlah Kecamatan**: 11 Kecamatan
- **Jumlah Desa/Kelurahan**: 88 Desa/Kelurahan
- **Sistem Koordinat**: WGS84 (EPSG:4326)

---

## 📄 Lisensi
Dibuat untuk mempermudah operasional kegiatan statistik geospasial di Kabupaten Kepulauan Selayar.
