/**
 * Real-Time Image Processing Engine using Canvas API & ETA-1 Approximate Arithmetic
 */

class ImageProcessor {
  constructor() {
    this.img1 = null;
    this.img2 = null;
    this.blendAlpha = 0.5;
    this.splitPoint = 4;
    this.brightnessShift = 30;
    this.noiseLevel = 0.1;
    this.activeMode = 'blend'; // 'blend', 'brightness', 'noise'
    this.isCameraActive = false;
    this.webcamStream = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.loadDefaultImages();
  }

  bindEvents() {
    // Sliders
    const slAlpha = document.getElementById('sl-blend-alpha');
    const slSplit = document.getElementById('sl-img-split');
    const slBright = document.getElementById('sl-bright-val');
    const selectPreset = document.getElementById('select-img-preset');
    const uploadInput1 = document.getElementById('upload-img-1');
    const uploadInput2 = document.getElementById('upload-img-2');
    const btnCam = document.getElementById('btn-cam-capture');

    if (slAlpha) slAlpha.addEventListener('input', (e) => {
      this.blendAlpha = parseFloat(e.target.value);
      document.getElementById('lbl-alpha-val').textContent = `${Math.round(this.blendAlpha * 100)}% / ${Math.round((1 - this.blendAlpha) * 100)}%`;
      this.process();
    });

    if (slSplit) slSplit.addEventListener('input', (e) => {
      this.splitPoint = parseInt(e.target.value);
      document.getElementById('lbl-img-split').textContent = `${this.splitPoint} Bits`;
      this.process();
    });

    if (slBright) slBright.addEventListener('input', (e) => {
      this.brightnessShift = parseInt(e.target.value);
      document.getElementById('lbl-bright-val').textContent = `+${this.brightnessShift}`;
      this.process();
    });

    if (selectPreset) selectPreset.addEventListener('change', (e) => {
      this.loadPreset(e.target.value);
    });

    if (uploadInput1) uploadInput1.addEventListener('change', (e) => this.handleUpload(e, 1));
    if (uploadInput2) uploadInput2.addEventListener('change', (e) => this.handleUpload(e, 2));

    if (btnCam) btnCam.addEventListener('click', () => this.toggleWebcam());

    // Processing mode buttons
    const btnModeBlend = document.getElementById('btn-mode-blend');
    const btnModeBright = document.getElementById('btn-mode-bright');

    if (btnModeBlend) btnModeBlend.addEventListener('click', () => {
      this.activeMode = 'blend';
      btnModeBlend.classList.add('active');
      if (btnModeBright) btnModeBright.classList.remove('active');
      this.process();
    });

    if (btnModeBright) btnModeBright.addEventListener('click', () => {
      this.activeMode = 'brightness';
      btnModeBright.classList.add('active');
      if (btnModeBlend) btnModeBlend.classList.remove('active');
      this.process();
    });
  }

  loadDefaultImages() {
    // Generate high quality procedural synthetic benchmark images for Lenna & Cameraman patterns
    this.img1 = this.generateSyntheticImage('portrait');
    this.img2 = this.generateSyntheticImage('landscape');
    this.process();
  }

  loadPreset(presetName) {
    this.img1 = this.generateSyntheticImage(presetName);
    this.img2 = this.generateSyntheticImage(presetName === 'portrait' ? 'landscape' : 'gradient');
    this.process();
  }

  generateSyntheticImage(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const w = canvas.width;
    const h = canvas.height;

    if (type === 'portrait') {
      // Synthetic face portrait pattern (Lenna style colors)
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#e65c00');
      grad.addColorStop(1, '#F9D423');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Draw skin/face shapes
      ctx.fillStyle = '#ffccaa';
      ctx.beginPath();
      ctx.ellipse(128, 128, 70, 90, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = '#4a2c11';
      ctx.beginPath();
      ctx.arc(128, 90, 75, Math.PI, 0);
      ctx.fill();

      // Eyes & Detail
      ctx.fillStyle = '#1a1005';
      ctx.fillRect(100, 110, 16, 8);
      ctx.fillRect(140, 110, 16, 8);
    } else if (type === 'landscape') {
      // Cameraman style high-frequency edges
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1e3c72');
      grad.addColorStop(1, '#2a5298');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Grid/Buildings
      ctx.fillStyle = '#111';
      for (let x = 20; x < w; x += 40) {
        const height = 60 + Math.sin(x) * 40;
        ctx.fillRect(x, h - height, 30, height);
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(200, 50, 30, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Gradient test pattern
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const r = x & 0xFF;
          const g = y & 0xFF;
          const b = (x ^ y) & 0xFF;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    return ctx.getImageData(0, 0, w, h);
  }

  handleUpload(e, imgNum) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 256, 256);
        const imgData = ctx.getImageData(0, 0, 256, 256);

        if (imgNum === 1) this.img1 = imgData;
        else this.img2 = imgData;

        this.process();
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  async toggleWebcam() {
    const video = document.getElementById('webcam-video');
    const btnCam = document.getElementById('btn-cam-capture');

    if (this.isCameraActive) {
      if (this.webcamStream) {
        this.webcamStream.getTracks().forEach((track) => track.stop());
      }
      this.isCameraActive = false;
      if (btnCam) btnCam.textContent = '📸 Live Camera Stream';
      if (video) video.style.display = 'none';
      return;
    }

    try {
      this.webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 256, height: 256 } });
      if (video) {
        video.srcObject = this.webcamStream;
        video.play();
        video.style.display = 'block';
      }
      this.isCameraActive = true;
      if (btnCam) btnCam.textContent = '🛑 Stop Camera';

      // Continuously capture webcam frame
      const updateWebcamFrame = () => {
        if (!this.isCameraActive) return;
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, 256, 256);
        this.img1 = ctx.getImageData(0, 0, 256, 256);
        this.process();
        requestAnimationFrame(updateWebcamFrame);
      };
      requestAnimationFrame(updateWebcamFrame);
    } catch (err) {
      alert('Camera access denied or unavailable: ' + err.message);
    }
  }

  process() {
    if (!this.img1) return;

    const cvsInput1 = document.getElementById('cvs-img-input1');
    const cvsInput2 = document.getElementById('cvs-img-input2');
    const cvsExact = document.getElementById('cvs-img-exact');
    const cvsApprox = document.getElementById('cvs-img-approx');
    const cvsDiff = document.getElementById('cvs-img-diff');

    if (!cvsExact || !cvsApprox || !cvsDiff) return;

    const width = 256;
    const height = 256;

    // Render inputs
    if (cvsInput1) {
      cvsInput1.width = width;
      cvsInput1.height = height;
      cvsInput1.getContext('2d').putImageData(this.img1, 0, 0);
    }

    let SECOND_IMG = this.img2;
    if (this.activeMode === 'brightness' || !SECOND_IMG) {
      // Create scalar brightness shift image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = `rgb(${this.brightnessShift},${this.brightnessShift},${this.brightnessShift})`;
      ctx.fillRect(0, 0, width, height);
      SECOND_IMG = ctx.getImageData(0, 0, width, height);
    }

    if (cvsInput2) {
      cvsInput2.width = width;
      cvsInput2.height = height;
      cvsInput2.getContext('2d').putImageData(SECOND_IMG, 0, 0);
    }

    // Prepare Output Image Buffers
    const ctxExact = cvsExact.getContext('2d');
    const ctxApprox = cvsApprox.getContext('2d');
    const ctxDiff = cvsDiff.getContext('2d');

    const exactData = ctxExact.createImageData(width, height);
    const approxData = ctxApprox.createImageData(width, height);
    const diffData = ctxDiff.createImageData(width, height);

    const buf1 = this.img1.data;
    const buf2 = SECOND_IMG.data;
    const outEx = exactData.data;
    const outAp = approxData.data;
    const outDf = diffData.data;

    // Execute fast array pixel addition using ETA-1 adder
    const metrics = ETA1Adder.addPixelBuffers(
      buf1,
      buf2,
      outAp,
      outEx,
      outDf,
      this.splitPoint,
      this.activeMode === 'brightness' ? 1.0 : this.blendAlpha
    );

    ctxExact.putImageData(exactData, 0, 0);
    ctxApprox.putImageData(approxData, 0, 0);
    ctxDiff.putImageData(diffData, 0, 0);

    this.renderImgMetrics(metrics);
  }

  renderImgMetrics(metrics) {
    const { psnr, mse, med, nmed } = metrics;

    const elPsnr = document.getElementById('img-metric-psnr');
    const elMse = document.getElementById('img-metric-mse');
    const elMed = document.getElementById('img-metric-med');
    const elNmed = document.getElementById('img-metric-nmed');
    const elQualityBadge = document.getElementById('img-quality-badge');

    if (elPsnr) elPsnr.textContent = isFinite(psnr) ? `${psnr.toFixed(2)} dB` : '∞ (Exact)';
    if (elMse) elMse.textContent = mse.toFixed(4);
    if (elMed) elMed.textContent = med.toFixed(4);
    if (elNmed) elNmed.textContent = nmed.toFixed(6);

    if (elQualityBadge) {
      if (psnr > 35) {
        elQualityBadge.textContent = '✨ Visually Imperceptible (High Fidelity > 35 dB)';
        elQualityBadge.className = 'quality-badge high';
      } else if (psnr > 28) {
        elQualityBadge.textContent = '👍 Visually Acceptable (> 28 dB)';
        elQualityBadge.className = 'quality-badge medium';
      } else {
        elQualityBadge.textContent = '⚠️ Noticeable Pixel Noise (< 28 dB)';
        elQualityBadge.className = 'quality-badge low';
      }
    }
  }
}

// Instantiate globally
window.addEventListener('DOMContentLoaded', () => {
  window.imgProc = new ImageProcessor();
});
