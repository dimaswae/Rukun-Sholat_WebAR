/**
 * ui-controller.js
 * -----------------------------------------------------------------------
 * Mengatur navigasi antar-screen (Menu Utama, Panduan, Tentang, AR View)
 * serta interaksi UI di dalam mode AR: panel info gerakan, tombol
 * Next/Previous, kontrol audio narasi, dan progress indicator.
 * -----------------------------------------------------------------------
 */

import {
  initARScene,
  stopARScene,
  goToStep,
  nextStep,
  prevStep,
  getCurrentStepIndex,
  getTotalSteps,
  setOnStepChange,
  setOnTargetFound,
  setOnTargetLost,
} from "./ar-scene.js";

const steps = window.GERAKAN_SHOLAT || [];

const screens = {
  menu: document.getElementById("screen-menu"),
  panduan: document.getElementById("screen-panduan"),
  tentang: document.getElementById("screen-tentang"),
  ar: document.getElementById("screen-ar"),
};

const els = {
  arContainer: document.getElementById("ar-container"),
  stepLabel: document.getElementById("step-label"),
  stepName: document.getElementById("step-name"),
  stepDesc: document.getElementById("step-desc"),
  stepPanduan: document.getElementById("step-panduan"),
  btnTogglePanduan: document.getElementById("btn-toggle-panduan"),
  btnNext: document.getElementById("btn-next"),
  btnPrev: document.getElementById("btn-prev"),
  btnExitAR: document.getElementById("btn-exit-ar"),
  btnPlayAudio: document.getElementById("btn-play-audio"),
  arHint: document.getElementById("ar-hint"),
  progressArch: document.getElementById("progress-arch"),
  audioEl: document.getElementById("narrator-audio"),
};

let arInitialized = false;
let isInitializing = false; // guard sinkron: cegah klik ganda memicu initARScene() paralel

function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle("screen--active", key === name);
  });
}

/** Membangun titik-titik progress indicator (mihrab arch) sebanyak jumlah gerakan. */
function buildProgressArch() {
  if (!els.progressArch) return;
  els.progressArch.innerHTML = "";
  steps.forEach((step, i) => {
    const dot = document.createElement("span");
    dot.className = "arch-dot";
    dot.title = step.nama;
    dot.dataset.index = String(i);
    dot.addEventListener("click", () => goToStep(i));
    els.progressArch.appendChild(dot);
  });
}

function updateProgressArch(activeIndex) {
  if (!els.progressArch) return;
  const dots = els.progressArch.querySelectorAll(".arch-dot");
  dots.forEach((dot, i) => {
    dot.classList.toggle("arch-dot--active", i === activeIndex);
    dot.classList.toggle("arch-dot--done", i < activeIndex);
  });
}

/** Mengisi <ol> panduan langkah dari array step.panduan. */
function renderPanduanList(panduan) {
  if (!els.stepPanduan) return;
  els.stepPanduan.innerHTML = "";
  (panduan || []).forEach((langkah) => {
    const li = document.createElement("li");
    li.textContent = langkah;
    els.stepPanduan.appendChild(li);
  });
}

/** Memperbarui panel info teks + audio sesuai gerakan yang sedang aktif. */
function renderStepInfo(step, index) {
  if (!step) return;
  els.stepLabel.textContent = `Gerakan ${index + 1} dari ${steps.length}`;
  els.stepName.textContent = step.nama;
  els.stepDesc.textContent = step.deskripsi;
  renderPanduanList(step.panduan);

  // Tutup panel panduan setiap kali pindah gerakan, supaya pengguna
  // tidak kehilangan konteks animasi di balik panel yang terlalu panjang.
  els.stepPanduan.classList.remove("panduan-list--open");
  els.btnTogglePanduan.setAttribute("aria-expanded", "false");
  els.btnTogglePanduan.textContent = "Lihat Panduan Gerakan";

  updateProgressArch(index);

  els.btnPrev.disabled = index === 0;
  els.btnNext.disabled = index === steps.length - 1;

  if (step.audioSrc) {
    els.audioEl.src = step.audioSrc;
    els.btnPlayAudio.disabled = false;
    els.btnPlayAudio.textContent = "Dengarkan Narasi";
  } else {
    els.audioEl.removeAttribute("src");
    els.btnPlayAudio.disabled = true;
    els.btnPlayAudio.textContent = "Narasi belum tersedia";
  }
}

async function enterARMode() {
  // Cegah klik berulang (mis. double-click tak sengaja) memicu lebih dari
  // satu inisialisasi MindAR/Three.js secara paralel, yang sebelumnya
  // menyebabkan beberapa <canvas>/<video> menumpuk di DOM.
  if (isInitializing) return;

  showScreen("ar");
  buildProgressArch();

  setOnStepChange((step, index) => renderStepInfo(step, index));
  setOnTargetFound(() => {
    els.arHint.classList.add("ar-hint--hidden");
  });
  setOnTargetLost(() => {
    els.arHint.classList.remove("ar-hint--hidden");
  });

  if (!arInitialized) {
    isInitializing = true;
    try {
      await initARScene(els.arContainer);
      arInitialized = true;
      renderStepInfo(steps[getCurrentStepIndex()], getCurrentStepIndex());
    } catch (err) {
      console.error(err);
      els.arHint.textContent =
        "Gagal memuat kamera atau model 3D. Pastikan izin kamera diberikan dan periksa console untuk detail.";
      els.arHint.classList.remove("ar-hint--hidden");
    } finally {
      isInitializing = false;
    }
  } else {
    renderStepInfo(steps[getCurrentStepIndex()], getCurrentStepIndex());
  }
}

function exitARMode() {
  stopARScene();
  arInitialized = false;
  els.audioEl.pause();
  showScreen("menu");
}

function bindEvents() {
  document.getElementById("btn-mulai-ar").addEventListener("click", enterARMode);
  document.getElementById("btn-panduan").addEventListener("click", () => showScreen("panduan"));
  document.getElementById("btn-tentang").addEventListener("click", () => showScreen("tentang"));

  document.querySelectorAll("[data-back-to-menu]").forEach((btn) => {
    btn.addEventListener("click", () => showScreen("menu"));
  });

  els.btnNext.addEventListener("click", nextStep);
  els.btnPrev.addEventListener("click", prevStep);
  els.btnExitAR.addEventListener("click", exitARMode);

  els.btnTogglePanduan.addEventListener("click", () => {
    const isOpen = els.stepPanduan.classList.toggle("panduan-list--open");
    els.btnTogglePanduan.setAttribute("aria-expanded", String(isOpen));
    els.btnTogglePanduan.textContent = isOpen
      ? "Tutup Panduan Gerakan"
      : "Lihat Panduan Gerakan";
  });

  els.btnPlayAudio.addEventListener("click", () => {
    if (els.audioEl.paused) {
      els.audioEl.play();
      els.btnPlayAudio.textContent = "Hentikan Narasi";
    } else {
      els.audioEl.pause();
      els.btnPlayAudio.textContent = "Dengarkan Narasi";
    }
  });

  els.audioEl.addEventListener("ended", () => {
    els.btnPlayAudio.textContent = "Dengarkan Narasi";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  showScreen("menu");
});