/**
 * Core Logic Engine for 16-Bit Carry-Predictive ETA-1 Variant Approximate Adder
 * 
 * Architecture Specifications:
 * 1. Stage 1 - Approximate LSB Block (Bits 0-7):
 *    - Lower 8 bits bypass conventional Full Adder logic.
 *    - Summation approximated using simplified low-power gates (Bitwise OR logic: S_i = A_i | B_i).
 *    - Eliminates traditional LSB carry propagation chain.
 * 
 * 2. Stage 2 - Carry Prediction Interface:
 *    - Evaluates highest-order bits of LSB operands (Bit 7 & Bit 6).
 *    - Generates predicted carry C_pred = 1 if (A_7 AND B_7) or Majority logic is satisfied.
 *    - Forwards C_pred directly into the Stage 3 MSB block, preventing standard ETA-1 MSB errors.
 * 
 * 3. Stage 3 - Precise MSB Block (Bits 8-15):
 *    - Upper 8 bits processed via 100% accurate Ripple Carry addition.
 *    - Accepts C_pred from Stage 2: S_MSB = A_MSB + B_MSB + C_pred.
 */

class ETA1Adder {
  /**
   * Computes the 16-bit Carry-Predictive ETA-1 Approximate Addition of A and B.
   * @param {number} a - Operand A [0..65535]
   * @param {number} b - Operand B [0..65535]
   * @param {number} lsbWidth - LSB block width (default 8)
   * @returns {Object} Result details with 3-stage trace breakdown
   */
  static compute(a, b, lsbWidth = 8) {
    a = Math.max(0, Math.min(65535, Math.floor(a)));
    b = Math.max(0, Math.min(65535, Math.floor(b)));
    lsbWidth = Math.max(1, Math.min(15, Math.floor(lsbWidth)));

    const msbWidth = 16 - lsbWidth;
    const lsbMask = (1 << lsbWidth) - 1;
    const msbMask = (1 << msbWidth) - 1;

    // Stage 1: Approximate LSB Block (Bits 0..7) using Bitwise OR Logic
    const aLSB = a & lsbMask;
    const bLSB = b & lsbMask;
    const sLSB = aLSB | bLSB;

    // Stage 2: Carry Prediction Interface (Evaluating highest bits of LSB)
    const topBitIdx = lsbWidth - 1;
    const aTopBit = (aLSB >> topBitIdx) & 1;
    const bTopBit = (bLSB >> topBitIdx) & 1;
    
    // Evaluate second highest LSB bit if available for majority logic
    const secondBitIdx = lsbWidth - 2;
    const aSecBit = secondBitIdx >= 0 ? (aLSB >> secondBitIdx) & 1 : 0;
    const bSecBit = secondBitIdx >= 0 ? (bLSB >> secondBitIdx) & 1 : 0;

    // Prediction condition: (A_top AND B_top) OR ((A_top OR B_top) AND (A_sec AND B_sec))
    const isAndCarry = (aTopBit === 1 && bTopBit === 1);
    const isMajCarry = isAndCarry || ((aTopBit === 1 || bTopBit === 1) && (aSecBit === 1 && bSecBit === 1));
    const cPred = isMajCarry ? 1 : 0;

    // Stage 3: Precise MSB Block (Bits 8..15) with Predicted Carry-In
    const aMSB = (a >> lsbWidth) & msbMask;
    const bMSB = (b >> lsbWidth) & msbMask;
    const sumMSBUnclamped = aMSB + bMSB + cPred;
    const sMSB = sumMSBUnclamped & msbMask;
    const overflowMSB = sumMSBUnclamped > msbMask;

    // Assemble 16-bit Approximate Sum
    const approxSum = ((sMSB << lsbWidth) | sLSB) & 0xFFFF;
    const exactSum = (a + b) & 0xFFFF;
    const exactUnclamped = a + b;
    const absError = Math.abs(approxSum - exactSum);
    const relError = exactSum > 0 ? absError / exactSum : (absError > 0 ? 1 : 0);

    // Build step trace for animated execution UI
    const bitTrace = [];

    // Stage 1 LSB trace (Bits 0..7)
    for (let bit = lsbWidth - 1; bit >= 0; bit--) {
      const bitA = (aLSB >> bit) & 1;
      const bitB = (bLSB >> bit) & 1;
      const bitOut = (sLSB >> bit) & 1;
      bitTrace.push({
        bit,
        stage: 1,
        bitA,
        bitB,
        outBit: bitOut,
        action: 'or_approx',
        desc: `Bit ${bit} [Stage 1 LSB]: A=${bitA}, B=${bitB} → OR = ${bitOut}`
      });
    }

    // Stage 2 Predictor trace
    bitTrace.push({
      stage: 2,
      bitA: aTopBit,
      bitB: bTopBit,
      cPred,
      action: cPred ? 'predict_carry_one' : 'predict_carry_zero',
      desc: `Stage 2 Predictor: Evaluated Top LSB Bit ${topBitIdx} (A=${aTopBit}, B=${bTopBit}) → Predicted Carry-In C_pred = ${cPred}`
    });

    // Stage 3 MSB trace (Bits 8..15)
    for (let bit = 15; bit >= lsbWidth; bit--) {
      const bitIdxInMSB = bit - lsbWidth;
      const bitA = (aMSB >> bitIdxInMSB) & 1;
      const bitB = (bMSB >> bitIdxInMSB) & 1;
      const bitOut = (sMSB >> bitIdxInMSB) & 1;
      bitTrace.push({
        bit,
        stage: 3,
        bitA,
        bitB,
        outBit: bitOut,
        action: 'exact_msb',
        desc: `Bit ${bit} [Stage 3 MSB]: Precise Ripple Carry Addition (A=${bitA}, B=${bitB}) → Sum = ${bitOut}`
      });
    }

    return {
      a,
      b,
      lsbWidth,
      msbWidth,
      approxSum,
      exactSum,
      exactUnclamped,
      absError,
      relError,
      sLSB,
      sMSB,
      cPred,
      isAndCarry,
      isMajCarry,
      overflowMSB,
      bitTrace
    };
  }

  /**
   * Fast inline 16-bit Carry-Predictive adder for image processing loops
   * Operates on 8-bit or 16-bit pixel values
   */
  static fastHybridAdder(a, b, lsbWidth = 8) {
    const lsbMask = (1 << lsbWidth) - 1;
    const msbMask = (1 << (16 - lsbWidth)) - 1;

    const sLSB = (a & lsbMask) | (b & lsbMask);

    // Carry Predictor from bit (lsbWidth - 1)
    const topShift = lsbWidth - 1;
    const cPred = (((a >> topShift) & 1) && ((b >> topShift) & 1)) ? 1 : 0;

    const sMSB = (((a >> lsbWidth) & msbMask) + ((b >> lsbWidth) & msbMask) + cPred) & msbMask;

    return ((sMSB << lsbWidth) | sLSB) & 0xFFFF;
  }

  /**
   * Fast 8-bit Carry-Predictive pixel adder (4-bit LSB OR + 1-bit Predictor + 4-bit MSB Exact)
   */
  static fastPixelAdder8bit(a, b) {
    const sLSB = (a & 0x0F) | (b & 0x0F);
    const cPred = ((a & 0x08) && (b & 0x08)) ? 1 : 0;
    const sMSB = (((a >> 4) & 0x0F) + ((b >> 4) & 0x0F) + cPred) & 0x0F;
    return (sMSB << 4) | sLSB;
  }

  /**
   * Fast vector addition for image canvas buffers
   */
  static addPixelBuffers(arr1, arr2, outApprox, outExact, outDiff, lsbWidth = 4, alpha = 0.5) {
    const len = arr1.length;
    let totalED = 0;
    let totalSquareErr = 0;
    const maxVal = 255;

    for (let i = 0; i < len; i += 4) {
      for (let c = 0; c < 3; c++) {
        const p1 = Math.round(arr1[i + c] * alpha);
        const p2 = Math.round(arr2[i + c] * (1 - alpha));

        const ex = Math.min(255, p1 + p2);
        outExact[i + c] = ex;

        const ap = ETA1Adder.fastPixelAdder8bit(p1, p2);
        outApprox[i + c] = ap;

        const diff = Math.abs(ex - ap);
        outDiff[i + c] = Math.min(255, diff * 4);
        
        totalED += diff;
        totalSquareErr += diff * diff;
      }
      outExact[i + 3] = 255;
      outApprox[i + 3] = 255;
      outDiff[i + 3] = 255;
    }

    const totalPixels = (len / 4) * 3;
    const mse = totalSquareErr / totalPixels;
    const psnr = mse === 0 ? Infinity : 10 * Math.log10((maxVal * maxVal) / mse);
    const med = totalED / totalPixels;
    const nmed = med / 255;

    return { mse, psnr, med, nmed };
  }

  /**
   * Cumulative Vector Embedding Distance computation using 16-Bit Carry-Predictive Adder
   */
  static approxVectorDistance(v1, v2, lsbWidth = 8) {
    let totalApproxDist = 0;
    let totalExactDist = 0;
    const len = Math.min(v1.length, v2.length);

    for (let i = 0; i < len; i++) {
      const diff = Math.abs(Math.round(v1[i]) - Math.round(v2[i]));
      totalExactDist += diff;
      totalApproxDist = ETA1Adder.fastHybridAdder(totalApproxDist, diff, lsbWidth);
    }

    return {
      approxDist: totalApproxDist,
      exactDist: totalExactDist,
      error: Math.abs(totalApproxDist - totalExactDist),
      relError: totalExactDist > 0 ? Math.abs(totalApproxDist - totalExactDist) / totalExactDist : 0
    };
  }
}

// Export for browser environment
window.ETA1Adder = ETA1Adder;
