/**
 * ar-scene.js
 * -----------------------------------------------------------------------
 * Modul inti AR: inisialisasi MindAR image-tracking + Three.js rendering,
 * memuat model 3D (.glb) dengan banyak AnimationClip, dan menyediakan
 * fungsi navigasi gerakan (goToStep / nextStep / prevStep) yang dipakai
 * oleh js/ui-controller.js.
 *
 * Diimpor sebagai ES module dari mindar-image-three.prod.js (lihat index.html).
 * -----------------------------------------------------------------------
 */

import { THREE, MindARThree } from "https://cdn.jsdelivr.net/npm/mindar-image-three@1.2.5/dist/mindar-image-three.prod.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

// -------------------------------------------------------------------------
// KONFIGURASI ASET — sesuaikan path berikut dengan file milikmu.
// -------------------------------------------------------------------------
const CONFIG = {
  targetMindFile: "assets/targets/targets.mind", // hasil compile marker-mu
  modelGlbFile: "assets/models/karakter-sholat.glb", // model + animation clips
  modelScale: 0.05, // sesuaikan skala model terhadap ukuran marker
  modelPositionY: 0, // geser model relatif marker (naik/turun)
  crossfadeDuration: 0.4, // durasi transisi halus antar-animasi (detik)
};

let mindarThree = null;
let renderer, scene, camera;
let mixer = null;
let currentAction = null;
let clipsByName = {};
let modelRoot = null;
let anchor = null;

let currentStepIndex = 0;
const steps = window.GERAKAN_SHOLAT || [];

// Callback opsional yang di-set dari ui-controller.js agar UI ikut update
// setiap kali langkah berganti (misalnya saat marker pertama terdeteksi).
let onStepChangeCallback = null;
let onTargetFoundCallback = null;
let onTargetLostCallback = null;

/**
 * Mencetak daftar nama AnimationClip yang benar-benar ada di file .glb
 * ke console. Pakai ini untuk mencocokkan `clipName` di data-gerakan.js
 * dengan nama asli pada model-mu.
 */
function logAvailableClips(clips) {
  console.log(
    `[AR Sholat] ${clips.length} animation clip ditemukan pada model:`,
    clips.map((c) => c.name)
  );
}

/**
 * Mencari AnimationClip berdasarkan nama, dengan fallback pencarian
 * case-insensitive / partial-match supaya sedikit lebih toleran terhadap
 * perbedaan penamaan kecil dari hasil export Blender/Mixamo.
 */
function findClip(clipName) {
  if (clipsByName[clipName]) return clipsByName[clipName];

  const lower = clipName.toLowerCase();
  const fallbackKey = Object.keys(clipsByName).find(
    (key) => key.toLowerCase() === lower || key.toLowerCase().includes(lower)
  );
  return fallbackKey ? clipsByName[fallbackKey] : null;
}

/**
 * Memainkan animasi untuk satu tahap gerakan, dengan crossfade halus
 * dari animasi sebelumnya (jika ada).
 */
function playStepAnimation(step) {
  if (!mixer) return;

  const clip = findClip(step.clipName);
  if (!clip) {
    console.warn(
      `[AR Sholat] Clip "${step.clipName}" tidak ditemukan pada model. ` +
        `Cek nama clip yang tersedia di console (logAvailableClips).`
    );
    return;
  }

  const nextAction = mixer.clipAction(clip);
  nextAction.reset();
  nextAction.setLoop(THREE.LoopOnce, 1);
  nextAction.clampWhenFinished = true;

  if (currentAction && currentAction !== nextAction) {
    nextAction.play();
    currentAction.crossFadeTo(nextAction, CONFIG.crossfadeDuration, false);
  } else {
    nextAction.play();
  }

  currentAction = nextAction;
}

/**
 * Inisialisasi MindAR + Three.js, memuat model glb, lalu memulai render loop.
 * @param {HTMLElement} containerEl - elemen DOM tempat canvas AR ditempel.
 */
export async function initARScene(containerEl) {
  mindarThree = new MindARThree({
    container: containerEl,
    imageTargetSrc: CONFIG.targetMindFile,
    maxTrack: 1,
    filterMinCF: 0.0001,
    filterBeta: 0.001,
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
    if (mixer) mixer.update(delta);
    renderer.render(scene, camera);
  });
}

const clock = new THREE.Clock();

/**
 * Memuat model .glb, menyiapkan AnimationMixer, lalu langsung memainkan
 * animasi untuk langkah pertama (Takbiratul Ihram).
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
        clipsByName = {};
        gltf.animations.forEach((clip) => {
          clipsByName[clip.name] = clip;
        });
        logAvailableClips(gltf.animations);

        if (steps.length > 0) {
          playStepAnimation(steps[currentStepIndex]);
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
  playStepAnimation(steps[currentStepIndex]);
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
  if (mindarThree) {
    renderer.setAnimationLoop(null);
    mindarThree.stop();
    const video = mindarThree.video;
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop());
    }
  }
}
