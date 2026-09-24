/**
 * Interactive Bit-Level Circuit Simulator Module
 * Handles bit toggling, animations, scan stepper, and formula updates.
 * Updated to support 3-Stage Carry-Predictive Approximate Adder logic.
 */

class BitSimulator {
  constructor() {
    this.operandA = 154;
    this.operandB = 19;
    this.splitPoint = 4;
    this.isAnimRunning = false;
    this.animTimer = null;
    this.currentStep = -1;

    this.init();
  }

  init() {
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    // Inputs & Sliders
    const inputA = document.getElementById('inp-a');
    const inputB = document.getElementById('inp-b');
    const rangeA = document.getElementById('sl-a');
    const rangeB = document.getElementById('sl-b');
    const rangeSplit = document.getElementById('sl-split');

    if (inputA) inputA.addEventListener('input', (e) => this.setA(e.target.value));
    if (inputB) inputB.addEventListener('input', (e) => this.setB(e.target.value));
    if (rangeA) rangeA.addEventListener('input', (e) => this.setA(e.target.value));
    if (rangeB) rangeB.addEventListener('input', (e) => this.setB(e.target.value));
    if (rangeSplit) rangeSplit.addEventListener('input', (e) => this.setSplit(e.target.value));

    // Animation Controls
    const btnPlay = document.getElementById('btn-anim-play');
    const btnPause = document.getElementById('btn-anim-pause');
    const btnStep = document.getElementById('btn-anim-step');
    const btnReset = document.getElementById('btn-anim-reset');

    if (btnPlay) btnPlay.addEventListener('click', () => this.startAnimation());
    if (btnPause) btnPause.addEventListener('click', () => this.pauseAnimation());
    if (btnStep) btnStep.addEventListener('click', () => this.stepNext());
    if (btnReset) btnReset.addEventListener('click', () => this.resetAnimation());
  }

  setA(val) {
    this.operandA = Math.max(0, Math.min(255, parseInt(val) || 0));
    this.updateControls();
    this.render();
  }

  setB(val) {
    this.operandB = Math.max(0, Math.min(255, parseInt(val) || 0));
    this.updateControls();
    this.render();
  }

  setSplit(val) {
    this.splitPoint = Math.max(1, Math.min(7, parseInt(val) || 4));
    this.updateControls();
    this.render();
  }

  toggleBit(op, bitIndex) {
    if (op === 'a') {
      this.operandA ^= (1 << bitIndex);
    } else {
      this.operandB ^= (1 << bitIndex);
    }
    this.updateControls();
    this.render();
  }

  updateControls() {
    const inpA = document.getElementById('inp-a');
    const inpB = document.getElementById('inp-b');
    const slA = document.getElementById('sl-a');
    const slB = document.getElementById('sl-b');
    const slSplit = document.getElementById('sl-split');
    const lblSplit = document.getElementById('lbl-split');
    const hintSplit = document.getElementById('hint-split');

    if (inpA) inpA.value = this.operandA;
    if (inpB) inpB.value = this.operandB;
    if (slA) slA.value = this.operandA;
    if (slB) slB.value = this.operandB;
    if (slSplit) slSplit.value = this.splitPoint;

    if (lblSplit) {
      lblSplit.textContent = `Bits ${this.splitPoint - 1}..0 (${this.splitPoint} Inaccurate Bits)`;
    }
    if (hintSplit) {
      hintSplit.textContent = `Precise MSB: bits 7..${this.splitPoint} | Approximate OR LSB: bits ${this.splitPoint - 1}..0`;
    }
  }

  render() {
    const res = ETA1Adder.compute(this.operandA, this.operandB, this.splitPoint);
    this.renderBitGrid(res);
    this.renderMetricsCards(res);
    this.renderTraceSteps(res);
  }

  renderBitGrid(res) {
    const container = document.getElementById('bit-visualization-container');
    if (!container) return;

    const { a, b, split, approxSum, exactSum, carryPred } = res;

    const toBits = (num) => Array.from({ length: 8 }, (_, i) => (num >> (7 - i)) & 1);
    const bitsA = toBits(a);
    const bitsB = toBits(b);
    const bitsAp = toBits(approxSum);
    const bitsEx = toBits(exactSum);

    let html = `
      <div class="bit-circuit-grid">
        <!-- Position labels -->
        <div class="bit-row bit-header-row">
          <span class="row-label">BIT</span>
          <div class="bit-cells">
    `;

    for (let i = 0; i < 8; i++) {
      const bitPos = 7 - i;
      if (bitPos === split - 1 && i > 0) {
        html += `<div class="bit-divider-label">SPLIT</div>`;
      }
      const isAcc = bitPos >= split;
      html += `<div class="bit-box header-bit ${isAcc ? 'acc-hdr' : 'inacc-hdr'}">${bitPos}</div>`;
    }

    html += `
          </div>
        </div>

        <!-- Operand A -->
        <div class="bit-row">
          <span class="row-label">A (${a})</span>
          <div class="bit-cells">
    `;

    for (let i = 0; i < 8; i++) {
      const bitPos = 7 - i;
      if (bitPos === split - 1 && i > 0) html += `<div class="bit-divider"></div>`;
      const isAcc = bitPos >= split;
      const isTopLSB = bitPos === split - 1;
      html += `
        <div class="bit-box ${isAcc ? 'acc-zone' : 'inacc-zone'} ${bitsA[i] ? 'is-one' : 'is-zero'} ${isTopLSB && carryPred ? 'is-trig' : ''}"
             onclick="window.bitSim.toggleBit('a', ${bitPos})" title="Click to toggle Operand A bit ${bitPos}">
          ${bitsA[i]}
        </div>`;
    }

    html += `
          </div>
        </div>

        <!-- Operand B -->
        <div class="bit-row">
          <span class="row-label">B (${b})</span>
          <div class="bit-cells">
    `;

    for (let i = 0; i < 8; i++) {
      const bitPos = 7 - i;
      if (bitPos === split - 1 && i > 0) html += `<div class="bit-divider"></div>`;
      const isAcc = bitPos >= split;
      const isTopLSB = bitPos === split - 1;
      html += `
        <div class="bit-box ${isAcc ? 'acc-zone' : 'inacc-zone'} ${bitsB[i] ? 'is-one' : 'is-zero'} ${isTopLSB && carryPred ? 'is-trig' : ''}"
             onclick="window.bitSim.toggleBit('b', ${bitPos})" title="Click to toggle Operand B bit ${bitPos}">
          ${bitsB[i]}
        </div>`;
    }

    html += `
          </div>
        </div>

        <!-- Divider line -->
        <div class="bit-sep-line">
          <span class="sep-text">Carry-Predictive ETA-1 Hybrid Addition Result</span>
        </div>

        <!-- Approx Sum Output -->
        <div class="bit-row result-row">
          <span class="row-label">≈ ETA-1</span>
          <div class="bit-cells">
    `;

    for (let i = 0; i < 8; i++) {
      const bitPos = 7 - i;
      if (bitPos === split - 1 && i > 0) html += `<div class="bit-divider"></div>`;
      const isAcc = bitPos >= split;

      let cls = 'res-exact-bit';
      if (!isAcc) {
        cls = 'res-xor-bit';
      }

      html += `
        <div class="bit-box ${cls}">
          ${bitsAp[i]}
        </div>`;
    }

    html += `
          </div>
        </div>

        <!-- Exact Sum Output -->
        <div class="bit-row exact-row">
          <span class="row-label">= Exact</span>
          <div class="bit-cells">
    `;

    for (let i = 0; i < 8; i++) {
      const bitPos = 7 - i;
      if (bitPos === split - 1 && i > 0) html += `<div class="bit-divider"></div>`;
      html += `<div class="bit-box res-true-exact">${bitsEx[i]}</div>`;
    }

    html += `
          </div>
        </div>
      </div>

      <!-- Carry Status Bar -->
      <div class="carry-status-bar">
        <div class="status-badge ${carryPred ? 'green' : 'amber'}">
          Carry Predictor Interface: ${carryPred ? 'Predicted Carry = 1 (A=1 & B=1 at Bit ' + (split-1) + ')' : 'Predicted Carry = 0'}
        </div>
        <div class="status-badge ${res.overflowMSB ? 'red' : 'blue'}">
          Precise MSB Overflow: ${res.overflowMSB ? 'YES (Sum > 255)' : 'NO'}
        </div>
        <div class="status-badge purple">
          LSB Stage: Bitwise OR Gate Logic
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  renderMetricsCards(res) {
    const { approxSum, exactSum, absError, relError, split } = res;

    const elApprox = document.getElementById('metric-approx');
    const elExact = document.getElementById('metric-exact');
    const elError = document.getElementById('metric-abs-err');
    const elRelErr = document.getElementById('metric-rel-err');
    const elPsnr = document.getElementById('metric-psnr');
    const elPower = document.getElementById('metric-power');

    if (elApprox) elApprox.textContent = approxSum;
    if (elExact) elExact.textContent = exactSum;
    if (elError) elError.textContent = absError;
    if (elRelErr) elRelErr.textContent = `${(relError * 100).toFixed(2)}%`;

    const psnr = absError === 0 ? '∞ (Exact)' : `${(10 * Math.log10((255 * 255) / (absError * absError))).toFixed(2)} dB`;
    if (elPsnr) elPsnr.textContent = psnr;

    const powerSaved = (split * 10.5).toFixed(1);
    if (elPower) elPower.textContent = `-${powerSaved}% mW`;
  }

  renderTraceSteps(res) {
    const container = document.getElementById('algo-trace-steps');
    if (!container) return;

    const { a, b, split, approxSum, exactSum, carryPred, bitTrace } = res;

    let html = `
      <ol class="trace-list">
        <li><strong>Stage 1 — Architecture Partition:</strong> 8-bit operands partitioned into <strong>Precise MSB Block</strong> (Bits 7..${split}) and <strong>Approximate LSB Block</strong> (Bits ${split - 1}..0).</li>
        <li><strong>Stage 1 — LSB Block (Bitwise OR Logic):</strong> Summation approximated via simplified OR gates ($A_i \\mid B_i$).</li>
        <li><strong>Stage 2 — Carry Prediction Interface:</strong> Evaluated top LSB bit ${split - 1}: A=${(a >> (split - 1)) & 1}, B=${(b >> (split - 1)) & 1} → Predicted Carry = <strong>${carryPred}</strong> forwarded directly to MSB block.</li>
        <li><strong>Stage 3 — Precise MSB Block:</strong> A_MSB (${a >> split}) + B_MSB (${b >> split}) + Carry_pred (${carryPred}) = ${((a >> split) + (b >> split) + carryPred)} (100% Accurate Addition).</li>
    `;

    bitTrace.forEach((step) => {
      let icon = '🔹';
      if (step.action === 'carry_predict') icon = '⚡';
      html += `<li class="step-${step.action}">${icon} ${step.desc}</li>`;
    });

    html += `
        <li>🎯 <strong>Final Result:</strong> Carry-Predictive ETA-1 Approx Sum = <strong>${approxSum}</strong> (0b${approxSum.toString(2).padStart(8, '0')}), Exact Sum = <strong>${exactSum}</strong> (0b${exactSum.toString(2).padStart(8, '0')}), Error Distance = <strong>${Math.abs(approxSum - exactSum)}</strong>.</li>
      </ol>
    `;

    container.innerHTML = html;
  }

  startAnimation() {
    this.isAnimRunning = true;
    this.currentStep = 0;
    this.runStepAnim();
  }

  pauseAnimation() {
    this.isAnimRunning = false;
    if (this.animTimer) clearInterval(this.animTimer);
  }

  stepNext() {
    this.currentStep++;
    this.highlightCurrentStep();
  }

  resetAnimation() {
    this.pauseAnimation();
    this.currentStep = -1;
    this.render();
  }

  runStepAnim() {
    if (this.animTimer) clearInterval(this.animTimer);
    this.animTimer = setInterval(() => {
      if (!this.isAnimRunning) return;
      this.currentStep++;
      const traceItems = document.querySelectorAll('#algo-trace-steps li');
      if (this.currentStep >= traceItems.length) {
        this.pauseAnimation();
      } else {
        this.highlightCurrentStep();
      }
    }, 800);
  }

  highlightCurrentStep() {
    const traceItems = document.querySelectorAll('#algo-trace-steps li');
    traceItems.forEach((item, index) => {
      if (index === this.currentStep) {
        item.classList.add('active-step');
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        item.classList.remove('active-step');
      }
    });
  }
}

// Instantiate and expose globally
window.addEventListener('DOMContentLoaded', () => {
  window.bitSim = new BitSimulator();
});
