/**
 * data-gerakan.js
 * -----------------------------------------------------------------------
 * Single source of truth untuk rangkaian gerakan (rukun) sholat.
 * Sumber teks: rukun-shalat.txt (Deskripsi Gerakan + Doa Gerakan digabung
 * ke `deskripsi`; Panduan Gerakan dipecah ke `panduan` sebagai list langkah).
 *
 * PENTING UNTUK DIISI SESUAI ASET-MU:
 *   - clipName  -> HARUS sama persis dengan nama AnimationClip di file .glb
 *                  (cek nama clip lewat console log saat model dimuat,
 *                   lihat js/ar-scene.js -> logAvailableClips()).
 *   - audioSrc  -> path file audio narasi (mp3/ogg). Boleh dikosongkan
 *                  (null) dulu jika belum punya, aplikasi tetap berjalan.
 *
 * Urutan array = urutan navigasi Next/Previous pada UI.
 * -----------------------------------------------------------------------
 */

const GERAKAN_SHOLAT = [
  {
    id: 1,
    nama: "Takbiratul Ihram",
    deskripsi:
      "Gerakan pembuka sholat yang menandai dimulainya ibadah sholat. " +
      "Doa: \u0627\u0644\u0644\u0651\u064e\u0647\u064f \u0623\u064e\u0643\u0652\u0628\u064e\u0631\u064f (Allahu Akbar) \u2014 artinya: Allah Maha Besar.",
    panduan: [
      "Berdiri tegak menghadap kiblat.",
      "Pandangan diarahkan ke tempat sujud.",
      "Angkat kedua tangan sejajar telinga (laki-laki) atau bahu.",
      "Telapak tangan menghadap kiblat.",
      "Ucapkan takbir sambil mengangkat tangan.",
      "Setelah tangan turun, letakkan tangan kanan di atas tangan kiri di dada.",
    ],
    clipName: "Takbiratul_Ihram",
    audioSrc: null, // contoh nanti: "assets/audio/01-takbiratul-ihram.mp3"
  },
  {
    id: 2,
    nama: "Berdiri (Qiyam)",
    deskripsi:
      "Posisi berdiri tegak untuk membaca Al-Fatihah dan surat Al-Qur'an. " +
      "Doa: \u0628ِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيْمِ ... (Surah Al-Fatihah) \u2014 membaca Surah Al-Fatihah secara lengkap.",
    panduan: [
      "Berdiri tegak dengan tubuh rileks.",
      "Kaki terbuka secukupnya.",
      "Tangan kanan berada di atas tangan kiri.",
      "Pandangan tertuju ke tempat sujud.",
      "Membaca Al-Fatihah.",
    ],
    clipName: "Qiyam",
    audioSrc: null,
  },
  {
    id: 3,
    nama: "Rukuk",
    deskripsi:
      "Gerakan membungkukkan badan sebagai bentuk pengagungan kepada Allah. " +
      "Doa: \u0633ُبْحَانَ رَبِّيَ الْعَظِيمِ وَبِحَمْدِهِ (Subhaana Rabbiyal 'Azhiimi wa bihamdih) \u2014 " +
      "artinya: Maha Suci Tuhanku Yang Maha Agung dan segala puji bagi-Nya.",
    panduan: [
      "Membungkukkan badan hingga punggung lurus.",
      "Kepala sejajar dengan punggung.",
      "Kedua tangan memegang lutut.",
      "Siku direnggangkan dari badan.",
      "Pandangan ke tempat sujud.",
    ],
    clipName: "Rukuk",
    audioSrc: null,
  },
  {
    id: 4,
    nama: "I'tidal",
    deskripsi:
      "Gerakan bangkit dari rukuk hingga berdiri tegak kembali. " +
      "Doa: \u0633َمِعَ اللَّهُ لِمَنْ حَمِدَهُ (Sami'allahu liman hamidah) \u2014 artinya: Allah mendengar orang yang memuji-Nya. " +
      "Dilanjutkan: \u0631َبَّنَا وَلَكَ الْحَمْدُ (Rabbanaa wa lakal hamd) \u2014 artinya: Ya Tuhan kami, bagi-Mu segala puji.",
    panduan: [
      "Bangkit dari posisi rukuk.",
      "Angkat kedua tangan seperti saat takbir.",
      "Berdiri tegak sempurna.",
      "Tangan kembali lurus di samping badan.",
    ],
    clipName: "Itidal",
    audioSrc: null,
  },
  {
    id: 5,
    nama: "Sujud",
    deskripsi:
      "Gerakan meletakkan anggota tubuh tertentu ke lantai sebagai bentuk ketundukan tertinggi kepada Allah, " +
      "dengan tujuh anggota sujud menyentuh lantai: dahi, hidung, dua telapak tangan, dua lutut, dan dua ujung kaki. " +
      "Doa: \u0633ُبْحَانَ رَبِّيَ الأَعْلَى وَبِحَمْدِهِ (Subhaana Rabbiyal A'laa wa bihamdih) \u2014 " +
      "artinya: Maha Suci Tuhanku Yang Maha Tinggi dan segala puji bagi-Nya.",
    panduan: [
      "Turun dari posisi berdiri.",
      "Letakkan lutut terlebih dahulu.",
      "Letakkan kedua telapak tangan.",
      "Tempelkan dahi dan hidung ke tempat sujud.",
      "Ujung jari kaki menghadap kiblat.",
      "Tujuh anggota sujud menyentuh lantai: dahi, hidung, dua telapak tangan, dua lutut, dua ujung kaki.",
    ],
    clipName: "Sujud",
    audioSrc: null,
  },
  {
    id: 6,
    nama: "Duduk di Antara Dua Sujud",
    deskripsi:
      "Posisi duduk setelah sujud pertama sebelum melakukan sujud kedua. " +
      "Doa: \u0631َبِّ اغْفِرْ لِي وَارْحَمْنِي وَاجْبُرْنِي وَارْفَعْنِي وَارْزُقْنِي وَاهْدِنِي وَعَافِنِي وَاعْفُ عَنِّي " +
      "(Rabbi-ghfir lii warhamnii wajburnii warfa'nii warzuqnii wahdinii wa 'aafinii wa'fu 'annii) \u2014 " +
      "artinya: Ya Allah, ampunilah aku, rahmatilah aku, cukupkanlah kekuranganku, angkatlah derajatku, " +
      "berilah aku rezeki, tunjukilah aku, sehatkanlah aku, dan maafkanlah aku.",
    panduan: [
      "Bangkit dari sujud.",
      "Duduk di atas kaki kiri.",
      "Kaki kanan ditegakkan.",
      "Kedua tangan diletakkan di atas paha.",
      "Pandangan ke arah tempat sujud.",
    ],
    clipName: "Duduk_Iftirasy",
    audioSrc: null,
  },
  {
    id: 7,
    nama: "Tasyahud Akhir",
    deskripsi:
      "Posisi duduk pada rakaat terakhir untuk membaca tasyahud dan shalawat. " +
      "Doa: \u0627َلتَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ ... (bacaan tasyahud akhir lengkap), " +
      "dilanjutkan \u0627َللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ ... (Shalawat Ibrahimiyah).",
    panduan: [
      "Duduk tawarruk (menurut mayoritas mazhab).",
      "Kaki kiri berada di bawah kaki kanan.",
      "Tangan kiri di atas paha kiri.",
      "Tangan kanan di atas paha kanan.",
      "Telunjuk kanan diangkat saat membaca syahadat.",
    ],
    clipName: "Tasyahud_Akhir",
    audioSrc: null,
  },
];

// Diekspos secara global agar mudah dipakai modul lain tanpa bundler.
window.GERAKAN_SHOLAT = GERAKAN_SHOLAT;
