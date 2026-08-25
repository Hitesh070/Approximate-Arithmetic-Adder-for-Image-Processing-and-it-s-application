/**
 * Error Space & 256x256 ED Matrix Analytics Module
 */

class ErrorAnalytics {
  constructor() {
    this.canvasHeatmap = null;
    this.canvasHist = null;
    this.splitPoint = 4;
    this.edMatrix = null;
    this.stats = null;

    this.init();
  }

  init() {
    this.canvasHeatmap = document.getElementById('cvs-heatmap-256');
    this.canvasHist = document.getElementById('cvs-histogram');
    
    const rangeSplit = document.getElementById('sl-analytics-split');
    if (rangeSplit) {
      rangeSplit.addEventListener('input', (e) => {
        this.splitPoint = parseInt(e.target.value);
        document.getElementById('lbl-analytics-split').textContent = `${this.splitPoint} Bits`;
        this.computeAndRender();
      });
    }

    if (this.canvasHeatmap) {
      this.canvasHeatmap.addEventListener('mousemove', (e) => this.handleHeatmapHover(e));
      this.canvasHeatmap.addEventListener('mouseleave', () => this.hideTooltip());
    }

    this.computeAndRender();
  }

  computeAndRender() {
    const size = 256;
    this.edMatrix = new Uint8Array(size * size);
    let totalED = 0;
    let nonZeroErrors = 0;
    let maxED = 0;

    const histBuckets = new Array(16).fill(0);

    for (let a = 0; a < size; a++) {
      for (let b = 0; b < size; b++) {
        const exact = (a + b) & 0xFF;
        const approx = ETA1Adder.fastHybridAdder(a, b, this.splitPoint);
        const ed = Math.abs(exact - approx);

        const idx = a * size + b;
        this.edMatrix[idx] = ed;

        totalED += ed;
        if (ed > 0) nonZeroErrors++;
        if (ed > maxED) maxED = ed;

        // Histogram binning
        const bucket = Math.min(15, Math.floor((ed / 32)));
        histBuckets[bucket]++;
      }
    }

    const totalElements = size * size;
    const errorRate = (nonZeroErrors / totalElements) * 100;
    const med = totalED / totalElements;
    const nmed = med / 510; // Normalized by max possible addition sum 510

    this.stats = { errorRate, med, nmed, maxED, nonZeroErrors, totalElements, histBuckets };

    this.renderHeatmap();
    this.renderHistogram();
    this.renderStatsCards();
  }

  renderHeatmap() {
    if (!this.canvasHeatmap) return;

    const ctx = this.canvasHeatmap.getContext('2d');
    const imgData = ctx.createImageData(256, 256);
    const data = imgData.data;

    const maxED = this.stats.maxED || 1;

    for (let i = 0; i < 256 * 256; i++) {
      const ed = this.edMatrix[i];
      const norm = ed / maxED; // 0 to 1

      // Coolwarm / Jet gradient color mapping
      let r = 0, g = 0, b = 0;
      if (ed === 0) {
        // Deep purple/blue for zero error
        r = 15; g = 20; b = 45;
      } else {
        r = Math.min(255, Math.floor(norm * 255 * 1.5));
        g = Math.min(255, Math.floor((1 - Math.abs(norm - 0.5) * 2) * 200));
        b = Math.min(255, Math.floor((1 - norm) * 255));
      }

      const pixelIdx = i * 4;
      data[pixelIdx] = r;
      data[pixelIdx + 1] = g;
      data[pixelIdx + 2] = b;
      data[pixelIdx + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
  }

  renderHistogram() {
    if (!this.canvasHist) return;

    const ctx = this.canvasHist.getContext('2d');
    const w = this.canvasHist.width;
    const h = this.canvasHist.height;

    ctx.clearRect(0, 0, w, h);

    const buckets = this.stats.histBuckets;
    const maxVal = Math.max(...buckets, 1);
    const barWidth = (w - 40) / buckets.length;

    // Draw bars
    buckets.forEach((count, i) => {
      const barHeight = (count / maxVal) * (h - 40);
      const x = 30 + i * barWidth;
      const y = h - 25 - barHeight;

      // Gradient fill
      const grad = ctx.createLinearGradient(0, y, 0, h - 25);
      grad.addColorStop(0, '#4f8ef7');
      grad.addColorStop(1, '#7c5cfc');

      ctx.fillStyle = grad;
      ctx.fillRect(x + 2, y, barWidth - 4, barHeight);

      // Label below bar
      ctx.fillStyle = '#7a7f8e';
      ctx.font = '9px monospace';
      if (i % 3 === 0) {
        ctx.fillText(i * 2, x + 2, h - 8);
      }
    });

    // Axis
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(30, 10);
    ctx.lineTo(30, h - 25);
    ctx.lineTo(w - 10, h - 25);
    ctx.stroke();
  }

  renderStatsCards() {
    const { errorRate, med, nmed, maxED } = this.stats;

    const elEr = document.getElementById('stat-er');
    const elMed = document.getElementById('stat-med');
    const elNmed = document.getElementById('stat-nmed');
    const elMaxEd = document.getElementById('stat-max-ed');

    if (elEr) elEr.textContent = `${errorRate.toFixed(2)}%`;
    if (elMed) elMed.textContent = med.toFixed(4);
    if (elNmed) elNmed.textContent = nmed.toFixed(6);
    if (elMaxEd) elMaxEd.textContent = maxED;
  }

  handleHeatmapHover(e) {
    const rect = this.canvasHeatmap.getBoundingClientRect();
    const scaleX = 256 / rect.width;
    const scaleY = 256 / rect.height;

    const b = Math.floor((e.clientX - rect.left) * scaleX); // X axis = Input B
    const a = Math.floor((e.clientY - rect.top) * scaleY);  // Y axis = Input A

    if (a < 0 || a >= 256 || b < 0 || b >= 256) return;

    const exact = (a + b) & 0xFF;
    const approx = ETA1Adder.fastHybridAdder(a, b, this.splitPoint);
    const ed = Math.abs(exact - approx);

    const tooltip = document.getElementById('heatmap-tooltip');
    if (tooltip) {
      tooltip.style.display = 'block';
      tooltip.style.left = `${e.clientX + 15}px`;
      tooltip.style.top = `${e.clientY + 15}px`;
      tooltip.innerHTML = `
        <div class="tt-title">Input Pair (A: ${a}, B: ${b})</div>
        <div class="tt-row"><span>Exact Sum:</span> <strong>${exact}</strong></div>
        <div class="tt-row"><span>ETA-1 Approx:</span> <strong>${approx}</strong></div>
        <div class="tt-row"><span>Error Distance:</span> <strong style="color: ${ed > 0 ? '#ffb703' : '#4fd68a'}">${ed}</strong></div>
      `;
    }
  }

  hideTooltip() {
    const tooltip = document.getElementById('heatmap-tooltip');
    if (tooltip) tooltip.style.display = 'none';
  }
}

// Global instance
window.addEventListener('DOMContentLoaded', () => {
  window.errorAnalytics = new ErrorAnalytics();
});
