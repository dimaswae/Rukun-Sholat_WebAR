# AR Gerakan Sholat — Marker Based (MindAR + Three.js)

Media pembelajaran gerakan sholat berbasis Augmented Reality dengan
*marker-based tracking*, sesuai rancangan pada artikel "Media Pembelajaran
Gerakan Sholat Berbasis Augmented Reality Menggunakan MindAR dan Three.js".

## Struktur Project

```
ar-sholat/
├── index.html              # semua screen: Menu, Panduan, Tentang, AR View
├── css/
│   └── style.css           # tema visual (zaitun-krem-emas)
├── js/
│   ├── data-gerakan.js     # data 13 gerakan sholat (nama, deskripsi, clip, audio)
│   ├── ar-scene.js         # inisialisasi MindAR + Three.js, animation mixer
│   └── ui-controller.js    # navigasi screen & interaksi UI
└── assets/
    ├── targets/
    │   └── targets.mind    # << GANTI dengan file .mind hasil compile markermu
    ├── models/
    │   └── karakter-sholat.glb  # << GANTI dengan model 3D-mu
    ├── audio/               # taruh file narasi audio di sini (opsional)
    └── icons/
```

## Langkah Setup (WAJIB sebelum dijalankan)

### 1. Pasang marker kamu
Salin file `.mind` hasil compile dari *MindAR Image Target Compiler* ke:
```
assets/targets/targets.mind
```
Jika nama filenya berbeda, ubah path-nya di `js/ar-scene.js`:
```js
const CONFIG = {
  targetMindFile: "assets/targets/targets.mind", // <-- sesuaikan di sini
  ...
};
```

### 2. Pasang model 3D kamu
Salin file `.glb` ke:
```
assets/models/karakter-sholat.glb
```
Atau ubah path-nya di `js/ar-scene.js` pada `CONFIG.modelGlbFile`.

Sesuaikan juga `modelScale` dan `modelPositionY` di file yang sama agar
ukuran & posisi model pas di atas marker — nilai awal (`0.05`) adalah
estimasi umum, kemungkinan besar perlu disesuaikan ke modelmu.

### 3. **PENTING** — Cocokkan rentang waktu (startTime / endTime)
Model `.glb` yang dipakai hanya punya **SATU AnimationClip panjang**
(takbir → salam berurutan, tanpa potongan per-gerakan). Karena itu,
navigasi antar-gerakan tidak memilih clip lain, melainkan menggeser
posisi waktu (`startTime`/`endTime`, dalam detik) di dalam clip tunggal
itu — lihat `js/ar-scene.js` fungsi `playStepRange()`.

`js/data-gerakan.js` berisi 9 entri rukun shalat (Takbiratul Ihram,
Qiyam, Rukuk, I'tidal, Sujud, Duduk di Antara Dua Sujud, Sujud Kedua,
Tasyahud Akhir, Salam), masing-masing dengan `startTime`/`endTime` yang
HARUS cocok dengan timing asli di model-mu. Cek durasi total clip lewat
console log saat model dimuat:
```
[AR Sholat] Clip ditemukan: "Animation", durasi 38.00s.
```
Kalau kamu re-export model dengan timing berbeda, cukup ubah angka
`startTime`/`endTime` di `data-gerakan.js` — tidak perlu ubah `ar-scene.js`.
Setiap gerakan juga punya field `panduan` (array langkah-langkah) yang
ditampilkan sebagai daftar di UI lewat tombol "Lihat Panduan Gerakan".

Cara mengecek nama clip yang sebenarnya:
1. Jalankan aplikasi, masuk ke mode AR, arahkan ke marker.
2. Buka **Console** browser (klik kanan → Inspect → Console).
3. Cari log seperti:
   ```
   [AR Sholat] 13 animation clip ditemukan pada model: ["Takbir", "Berdiri", ...]
   ```
4. Salin nama-nama tersebut, lalu sesuaikan nilai `clipName` di
   `js/data-gerakan.js` agar sama persis (termasuk huruf besar/kecil).

> Kode sudah punya fallback pencarian *case-insensitive* / partial-match,
> tapi paling aman tetap menyamakan nama secara eksplisit.

### 4. (Opsional) Tambahkan audio narasi
Untuk tiap gerakan yang ingin diberi narasi, taruh file mp3/ogg di
`assets/audio/`, lalu isi field `audioSrc` di `js/data-gerakan.js`, contoh:
```js
audioSrc: "assets/audio/01-takbiratul-ihram.mp3",
```
Gerakan tanpa audio akan otomatis menampilkan tombol "Narasi belum tersedia"
(dinonaktifkan) tanpa mengganggu fitur lain.

## Menjalankan secara lokal

Browser memblokir akses kamera (`getUserMedia`) pada halaman yang dibuka
langsung via `file://`, jadi harus dijalankan lewat server lokal:

```bash
# Pilih salah satu:
npx serve .
# atau
python3 -m http.server 8080
```

Lalu buka `http://localhost:<port>` di Chrome/Firefox/Edge versi terbaru
**melalui HTTPS atau localhost** (kamera hanya diizinkan pada *secure
context*). Untuk uji coba di HP, gunakan tunnel seperti `ngrok` agar
mendapat URL HTTPS, atau deploy ke hosting statis (Netlify, Vercel, GitHub
Pages) sesuai tahap *Distribution* pada MDLC di artikel.

## Catatan Implementasi

- **Marker tunggal, navigasi via UI** — sesuai artikel, satu marker
  menampilkan satu karakter; pengguna berpindah gerakan lewat tombol
  Sebelumnya/Selanjutnya, bukan dengan mengganti marker.
- **Crossfade animasi** — pergantian gerakan menggunakan
  `crossFadeTo()` dari Three.js `AnimationMixer` agar transisi antarpose
  terlihat halus, bukan patah/instan.
- **Progress indicator "mihrab arch"** — titik-titik di bagian bawah
  overlay AR menunjukkan posisi gerakan ke-N dari 9 sekaligus bisa diklik
  untuk lompat langsung ke gerakan tertentu.
- **Tidak ada build step** — seluruh dependency (MindAR, Three.js,
  GLTFLoader) diimpor langsung dari CDN via ES module, sesuai prinsip
  "berjalan langsung di browser tanpa proses build" pada artikel.

## Pengujian yang Disarankan (sesuai artikel)

1. **Black Box Testing** — buka menu, masuk AR, deteksi marker, navigasi
   Next/Previous, putar/hentikan audio, keluar AR. Pastikan semua sesuai
   hasil yang diharapkan.
2. **Pengujian jarak marker** — uji deteksi pada jarak 20/40/60/80/100 cm.
3. **Pengujian sudut marker** — uji deteksi pada sudut 0°/15°/30°/45°/60°/75°.

Catat hasilnya untuk mengisi Tabel Pengujian Jarak dan Tabel Pengujian Sudut
pada laporan, menggunakan kondisi pencahayaan dan perangkat yang konsisten.