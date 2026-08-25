/**
 * Core Logic Engine for MSB-Triggered ETA-1 Approximate Arithmetic Adder
 * 
 * Logic Specification:
 * - Operands: 8-bit integers [0..255]
 * - Split Point K: 1 <= K <= 7 (default 4).
 *   - Accurate Section: Upper bits 7 .. K (width = 8 - K)
 *   - Inaccurate Section: Lower bits (K-1) .. 0 (width = K)
 * - Inaccurate Logic:
 *   - Scan LSB section from MSB (K-1) down to LSB (0).
 *   - If A_i == 1 and B_i == 1:
 *       Trigger activated! Bit i = 1, and all subsequent lower bits (i-1 .. 0) are forced to 1.
 *       Scanning stops.
 *   - Else (before trigger):
 *       Bit i = A_i ^ B_i (XOR).
 * - Carry-out of inaccurate section is forced to 0 (no carry prop to upper section).
 * - Upper section performs exact binary addition: (A >> K) + (B >> K).
 */

class ETA1Adder {
  /**
   * Computes the 8-bit ETA-1 approximate addition of a and b.
   * @param {number} a - Operand A [0..255]
   * @param {number} b - Operand B [0..255]
   * @param {number} split - Inaccurate bit width K [1..7]
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

    // MSB Exact Addition
    const sumMSB = aMSB + bMSB;
    const resMSB = sumMSB & accMask;
    const overflowMSB = sumMSB > accMask;

    // LSB ETA-1 Approximate Logic
    let inaccR = 0;
    let trigBit = -1; // -1 means no trigger
    const bitTrace = [];

    for (let bit = split - 1; bit >= 0; bit--) {
      const bitA = (aLSB >> bit) & 1;
      const bitB = (bLSB >> bit) & 1;

      if (trigBit >= 0) {
        // Trigger already hit in higher bit -> force this bit to 1
        inaccR |= (1 << bit);
        bitTrace.push({
          bit,
          bitA,
          bitB,
          outBit: 1,
          action: 'forced',
          desc: `Bit ${bit}: Force 1 (Triggered earlier at bit ${trigBit})`
        });
      } else if (bitA === 1 && bitB === 1) {
        // Both bits are 1 -> TRIGGER!
        trigBit = bit;
        // Force bit and all lower bits to 1
        const forceMask = (1 << (bit + 1)) - 1;
        inaccR |= forceMask;
        bitTrace.push({
          bit,
          bitA,
          bitB,
          outBit: 1,
          action: 'trigger',
          desc: `Bit ${bit}: A=1, B=1 → TRIGGER! Set bits ${bit}..0 to 1.`
        });
      } else {
        // Normal XOR
        const xorRes = bitA ^ bitB;
        inaccR |= (xorRes << bit);
        bitTrace.push({
          bit,
          bitA,
          bitB,
          outBit: xorRes,
          action: 'xor',
          desc: `Bit ${bit}: A=${bitA}, B=${bitB} → XOR = ${xorRes}`
        });
      }
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
      trigBit,
      inaccR,
      resMSB,
      overflowMSB,
      bitTrace,
      inaccBits: trigBit >= 0 ? trigBit + 1 : 0
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
   * Fast inline 8-bit hybrid adder for image processing loop
   */
  static fastHybridAdder(a, b, split = 4) {
    const inaccMask = (1 << split) - 1;
    const aLSB = a & inaccMask;
    const bLSB = b & inaccMask;

    let inaccR = 0;
    let forceOne = false;

    for (let bit = split - 1; bit >= 0; bit--) {
      const bitA = (aLSB >> bit) & 1;
      const bitB = (bLSB >> bit) & 1;

      if (forceOne) {
        inaccR |= (1 << bit);
      } else if (bitA === 1 && bitB === 1) {
        forceOne = true;
        inaccR |= (1 << (bit + 1)) - 1;
        break;
      } else {
        inaccR |= ((bitA ^ bitB) << bit);
      }
    }

    const accBits = 8 - split;
    const accMask = (1 << accBits) - 1;
    const sumMSB = ((a >> split) & accMask) + ((b >> split) & accMask);
    
    return (((sumMSB & accMask) << split) | inaccR) & 0xFF;
  }

  /**
   * Vector Embedding Distance computation using 8-bit ETA-1 approximate addition.
   * Matches the Notebook's approx_distance function.
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
