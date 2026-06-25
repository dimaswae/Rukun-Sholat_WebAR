/**
 * ar-scene.js
 * -----------------------------------------------------------------------
 * Modul inti AR: inisialisasi MindAR image-tracking + Three.js rendering,
 * memuat model 3D (.glb), dan menyediakan navigasi gerakan (goToStep /
 * nextStep / prevStep) yang dipakai oleh js/ui-controller.js.
 *
 * CATATAN PENTING TENTANG ANIMASI:
 * Model .glb yang dipakai hanya punya SATU AnimationClip panjang yang
 * berjalan dari takbir sampai salam tanpa potongan per-gerakan. Karena
 * itu, navigasi antar-gerakan di sini TIDAK memilih clip lain -- kita
 * "menggeser" posisi waktu (action.time) di dalam clip tunggal itu ke
 * rentang startTime/endTime milik gerakan yang dipilih (lihat
 * data-gerakan.js), lalu menahannya di sana (clamp tiap frame) supaya
 * pose tidak lanjut bermain ke gerakan berikutnya dengan sendirinya.
 *
 * Bergantung pada <script type="importmap"> di index.html yang
 * memetakan alias "three", "three/addons/", dan "mindar-image-three".
 * -----------------------------------------------------------------------
 */

import * as THREE from "three";
import { MindARThree } from "mindar-image-three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// -------------------------------------------------------------------------
// KONFIGURASI ASET — sesuaikan path berikut dengan file milikmu.
// -------------------------------------------------------------------------
const CONFIG = {
  targetMindFile: "assets/targets/targets.mind", // hasil compile marker-mu
  modelGlbFile: "assets/models/karakter-sholat.glb", // model (1 clip panjang)
  modelScale: 0.6, // sesuaikan skala model terhadap ukuran marker -- naikkan/turunkan sampai pas
  modelPositionY: 0, // geser model relatif marker (naik/turun)
  scrubTransitionMs: 0, // set >0 (mis. 150) kalau ingin transisi halus saat lompat antar-gerakan
};

let mindarThree = null;
let renderer, scene, camera;
let mixer = null;
let mainAction = null; // satu-satunya AnimationAction untuk clip tunggal
let modelRoot = null;
let anchor = null;

let currentStepIndex = 0;
const steps = window.GERAKAN_SHOLAT || [];

// Batas waktu (detik) gerakan yang sedang aktif. mainAction ditahan
// (clamp) di antara dua nilai ini setiap frame, supaya animasi tidak
// terus berjalan melewati pose gerakan saat ini.
let activeRange = { start: 0, end: 0 };

// Callback opsional yang di-set dari ui-controller.js agar UI ikut update
// setiap kali langkah berganti (misalnya saat marker pertama terdeteksi).
let onStepChangeCallback = null;
let onTargetFoundCallback = null;
let onTargetLostCallback = null;

const clock = new THREE.Clock();

/**
 * Mencetak info clip yang ditemukan di .glb ke console -- berguna untuk
 * memverifikasi durasi total clip cocok dengan endTime gerakan terakhir
 * di data-gerakan.js (saat ini "Salam" berakhir di detik 38).
 */
function logClipInfo(clip) {
  if (!clip) {
    console.warn(
      "[AR Sholat] Tidak ada AnimationClip ditemukan pada model .glb. " +
        "Pastikan model sudah diekspor dengan animasi (lihat README)."
    );
    return;
  }
  console.log(
    `[AR Sholat] Clip ditemukan: "${clip.name}", durasi ${clip.duration.toFixed(2)}s. ` +
      `Pastikan endTime gerakan terakhir di data-gerakan.js tidak melebihi durasi ini.`
  );
}

/**
 * Menggeser posisi waktu animasi ke rentang milik satu gerakan, lalu
 * menahannya (paused) di posisi awal rentang tersebut. Update loop
 * (lihat initARScene) yang bertugas men-clamp tiap frame supaya tidak
 * lanjut bermain melewati `endTime`.
 */
function playStepRange(step) {
  if (!mainAction) return;

  activeRange = { start: step.startTime, end: step.endTime };

  mainAction.paused = false;
  mainAction.enabled = true;
  mainAction.play(); // jaga-jaga: gerakan sebelumnya mungkin sudah di-pause oleh clamp di render loop
  mainAction.time = step.startTime;
  mixer.update(0); // terapkan pose secara instan, tanpa menunggu frame berikutnya
}

/**
 * DEBUG: ubah skala model secara langsung tanpa reload, supaya kamu bisa
 * cari angka modelScale yang pas dengan cepat. Cara pakai:
 *   - Tombol keyboard "+" / "-" saat mode AR aktif (langkah 0.02 per tekan)
 *   - Atau lewat console: window.setModelScale(0.15)
 * Setelah ketemu angka yang pas, salin nilainya ke CONFIG.modelScale di
 * atas supaya jadi default permanen.
 */
function setModelScale(scale) {
  if (!modelRoot) return;
  CONFIG.modelScale = scale;
  modelRoot.scale.setScalar(scale);
  console.log(`[AR Sholat] modelScale = ${scale.toFixed(3)}`);
}
window.setModelScale = setModelScale;

function handleScaleKeydown(e) {
  if (!modelRoot) return;
  if (e.key === "+" || e.key === "=") {
    setModelScale(CONFIG.modelScale + 0.02);
  } else if (e.key === "-" || e.key === "_") {
    setModelScale(Math.max(0.01, CONFIG.modelScale - 0.02));
  }
}

/**
 * Inisialisasi MindAR + Three.js, memuat model glb, lalu memulai render loop.
 * @param {HTMLElement} containerEl - elemen DOM tempat canvas AR ditempel.
 */
export async function initARScene(containerEl) {
  window.addEventListener("keydown", handleScaleKeydown);

  mindarThree = new MindARThree({
    container: containerEl,
    imageTargetSrc: CONFIG.targetMindFile,
    maxTrack: 1,
    filterMinCF: 0.0001,
    filterBeta: 0.001,
    // Matikan UI bawaan MindAR (overlay "scanning", loading, error).
    // Overlay bawaan ini disisipkan dengan z-index tinggi yang menutupi
    // seluruh layar termasuk tombol kita (exit, next/prev, dsb), dan di
    // mobile tampak sebagai balok krem solid. Kita sudah punya UI sendiri
    // (#ar-hint) untuk memberi instruksi ke pengguna, jadi UI bawaan ini
    // tidak diperlukan.
    uiScanning: "no",
    uiLoading: "no",
    uiError: "no",
  });

  ({ renderer, scene, camera } = mindarThree);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  light.position.set(0, 1, 0);
  scene.add(light);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(0.5, 1, 0.3);
  scene.add(dirLight);

  anchor = mindarThree.addAnchor(0);

  anchor.onTargetFound = () => {
    if (typeof onTargetFoundCallback === "function") onTargetFoundCallback();
  };
  anchor.onTargetLost = () => {
    if (typeof onTargetLostCallback === "function") onTargetLostCallback();
  };

  await loadModel();

  await mindarThree.start();

  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();

    if (mixer && mainAction) {
      mixer.update(delta);

      // Tahan animasi di dalam rentang gerakan aktif. Begitu waktu
      // melewati endTime, freeze pose tepat di endTime (pose akhir
      // gerakan ini) -- bukan lanjut ke gerakan berikutnya dengan
      // sendirinya, dan bukan loncat balik ke start (yang akan terlihat
      // seperti "patah" berulang).
      if (mainAction.time >= activeRange.end) {
        mainAction.time = activeRange.end;
        mainAction.paused = true;
        mixer.update(0);
      }
    }

    renderer.render(scene, camera);
  });
}

/**
 * Memuat model .glb, menyiapkan AnimationMixer untuk clip tunggal, lalu
 * langsung menahan pose di langkah pertama (Takbiratul Ihram).
 */
function loadModel() {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      CONFIG.modelGlbFile,
      (gltf) => {
        modelRoot = gltf.scene;
        modelRoot.scale.setScalar(CONFIG.modelScale);
        modelRoot.position.set(0, CONFIG.modelPositionY, 0);
        anchor.group.add(modelRoot);

        mixer = new THREE.AnimationMixer(modelRoot);

        const clip = gltf.animations[0] || null;
        logClipInfo(clip);

        if (clip) {
          mainAction = mixer.clipAction(clip);
          mainAction.setLoop(THREE.LoopOnce, 1);
          mainAction.clampWhenFinished = true;
          mainAction.play();
        }

        if (steps.length > 0 && mainAction) {
          playStepRange(steps[currentStepIndex]);
        }

        resolve();
      },
      undefined,
      (error) => {
        console.error("[AR Sholat] Gagal memuat model .glb:", error);
        reject(error);
      }
    );
  });
}

/** Pindah ke gerakan tertentu berdasarkan index (0-based). */
export function goToStep(index) {
  if (index < 0 || index >= steps.length) return;
  currentStepIndex = index;
  playStepRange(steps[currentStepIndex]);
  if (typeof onStepChangeCallback === "function") {
    onStepChangeCallback(steps[currentStepIndex], currentStepIndex);
  }
}

export function nextStep() {
  goToStep(Math.min(currentStepIndex + 1, steps.length - 1));
}

export function prevStep() {
  goToStep(Math.max(currentStepIndex - 1, 0));
}

export function getCurrentStepIndex() {
  return currentStepIndex;
}

export function getTotalSteps() {
  return steps.length;
}

export function setOnStepChange(callback) {
  onStepChangeCallback = callback;
}

export function setOnTargetFound(callback) {
  onTargetFoundCallback = callback;
}

export function setOnTargetLost(callback) {
  onTargetLostCallback = callback;
}

/** Menghentikan kamera & render loop, dipanggil saat keluar dari mode AR. */
export function stopARScene() {
  window.removeEventListener("keydown", handleScaleKeydown);
  if (mindarThree) {
    renderer.setAnimationLoop(null);
    mindarThree.stop();
    const video = mindarThree.video;
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop());
    }
  }
}