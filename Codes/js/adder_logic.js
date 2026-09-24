/**
 * Core Logic Engine for Carry-Predictive ETA-1 Approximate Arithmetic Adder
 * 
 * Logic Specification:
 * - Operands: 8-bit / 16-bit integers
 * - Partitioning:
 *   1. Approximate LSB Block (Bits 0..K-1):
 *      Summation approximated using simplified low-power bitwise OR logic: S_LSB = A_LSB | B_LSB.
 *   2. Carry Prediction Interface:
 *      Evaluates the highest-order bits of the LSB operands (A[K-1] AND B[K-1]).
 *      If carry is mathematically likely (1 AND 1), forwards Carry_pred = 1 into the upper block.
 *   3. Precise MSB Block (Bits K..15 / K..7):
 *      Processed using standard, 100% accurate addition including predicted carry:
 *      S_MSB = A_MSB + B_MSB + Carry_pred.
 */

class ETA1Adder {
  /**
   * Computes the Carry-Predictive Approximate Addition of a and b.
   * @param {number} a - Operand A [0..255]
   * @param {number} b - Operand B [0..255]
   * @param {number} split - Inaccurate LSB bit width K [1..7] (default 4)
   * @returns {Object} Result object containing full details
   */
  static compute(a, b, split = 4) {
    a = Math.max(0, Math.min(255, Math.floor(a)));
    b = Math.max(0, Math.min(255, Math.floor(b)));
    split = Math.max(1, Math.min(7, Math.floor(split)));

    const accBits = 8 - split;
    const accMask = (1 << accBits) - 1;
    const inaccMask = (1 << split) - 1;

    // Separate MSB and LSB
    const aMSB = (a >> split) & accMask;
    const bMSB = (b >> split) & accMask;
    const aLSB = a & inaccMask;
    const bLSB = b & inaccMask;

    // 1. Stage 1: Approximate LSB Block using Bitwise OR Logic
    const inaccR = aLSB | bLSB;

    // 2. Stage 2: Carry Prediction Interface (Evaluates top-bit of LSB block)
    const topBitPos = split - 1;
    const bitA_top = (aLSB >> topBitPos) & 1;
    const bitB_top = (bLSB >> topBitPos) & 1;
    const carryPred = (bitA_top === 1 && bitB_top === 1) ? 1 : 0;

    // 3. Stage 3: Precise MSB Block with Predicted Carry-In
    const sumMSB = aMSB + bMSB + carryPred;
    const resMSB = sumMSB & accMask;
    const overflowMSB = sumMSB > accMask;

    const bitTrace = [];
    for (let bit = split - 1; bit >= 0; bit--) {
      const bitA = (aLSB >> bit) & 1;
      const bitB = (bLSB >> bit) & 1;
      const outBit = bitA | bitB;
      bitTrace.push({
        bit,
        bitA,
        bitB,
        outBit,
        action: 'or',
        desc: `Bit ${bit}: A=${bitA}, B=${bitB} → Bitwise OR = ${outBit}`
      });
    }

    if (carryPred === 1) {
      bitTrace.unshift({
        bit: topBitPos,
        action: 'carry_predict',
        desc: `Carry Predictor: Bit ${topBitPos} A=1 & B=1 → Forwarded Predicted Carry = 1 to MSB Block.`
      });
    } else {
      bitTrace.unshift({
        bit: topBitPos,
        action: 'carry_predict',
        desc: `Carry Predictor: Bit ${topBitPos} A=${bitA_top}, B=${bitB_top} → Forwarded Predicted Carry = 0 to MSB Block.`
      });
    }

    const approxSum = ((resMSB << split) | inaccR) & 0xFF;
    const exactSum = (a + b) & 0xFF;
    const exactUnclamped = a + b;
    const absError = Math.abs(approxSum - exactSum);
    const relError = exactSum > 0 ? absError / exactSum : (absError > 0 ? 1 : 0);

    return {
      a,
      b,
      split,
      approxSum,
      exactSum,
      exactUnclamped,
      absError,
      relError,
      trigBit: carryPred === 1 ? topBitPos : -1,
      carryPred,
      inaccR,
      resMSB,
      overflowMSB,
      bitTrace,
      inaccBits: split
    };
  }

  /**
   * Fast vector addition for typed arrays (Image pixels)
   */
  static addPixelBuffers(arr1, arr2, outApprox, outExact, outDiff, split = 4, alpha = 0.5) {
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

        const ap = ETA1Adder.fastHybridAdder(p1, p2, split);
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
   * Fast inline 8-bit Carry-Predictive hybrid adder for image processing loop
   */
  static fastHybridAdder(a, b, split = 4) {
    const inaccMask = (1 << split) - 1;
    const aLSB = a & inaccMask;
    const bLSB = b & inaccMask;

    // 1. Stage 1: Approximate LSB Block using Bitwise OR Logic
    const inaccR = aLSB | bLSB;

    // 2. Stage 2: Carry Prediction Interface (Evaluates top bit of LSB block)
    const topBitPos = split - 1;
    const carryPred = (((aLSB >> topBitPos) & 1) === 1 && ((bLSB >> topBitPos) & 1) === 1) ? 1 : 0;

    // 3. Stage 3: Precise MSB Block with Predicted Carry-In
    const accBits = 8 - split;
    const accMask = (1 << accBits) - 1;
    const sumMSB = ((a >> split) & accMask) + ((b >> split) & accMask) + carryPred;
    
    return (((sumMSB & accMask) << split) | inaccR) & 0xFF;
  }

  /**
   * Vector Embedding Distance computation using Carry-Predictive approximate addition.
   * @param {Array<number>} v1 - Feature vector 1 [0..255]
   * @param {Array<number>} v2 - Feature vector 2 [0..255]
   * @param {number} split - Inaccurate bit width
   */
  static approxVectorDistance(v1, v2, split = 4) {
    let totalApproxDist = 0;
    let totalExactDist = 0;
    const len = Math.min(v1.length, v2.length);

    for (let i = 0; i < len; i++) {
      const diff = Math.abs(Math.round(v1[i]) - Math.round(v2[i]));
      totalExactDist += diff;
      totalApproxDist = ETA1Adder.fastHybridAdder(totalApproxDist, diff, split);
    }

    return {
      approxDist: totalApproxDist,
      exactDist: totalExactDist,
      error: Math.abs(totalApproxDist - totalExactDist),
      relError: totalExactDist > 0 ? Math.abs(totalApproxDist - totalExactDist) / totalExactDist : 0
    };
  }
}

// Export for browser
window.ETA1Adder = ETA1Adder;
