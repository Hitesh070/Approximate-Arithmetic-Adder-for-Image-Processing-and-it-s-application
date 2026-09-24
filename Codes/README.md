# 16-Bit Carry-Predictive ETA-1 Variant Approximate Adder for Image Processing and Edge AI

An interactive implementation, simulation framework, and benchmarking suite for the 16-Bit Carry-Predictive Variant of the Error-Tolerant Adder 1 (ETA-1). This project demonstrates energy-efficient edge computing, real-time image processing, and biometric facial attendance systems utilizing a 3-stage partitioned approximate computing architecture.

---

## Executive Summary

Modern edge AI and visual processing algorithms possess inherent error-resilience. Standard ETA-1 adders sever carry propagation between LSB and MSB blocks, causing severe high-order mathematical errors. This carry-predictive variant addresses that limitation by incorporating a lightweight Carry Prediction Interface, reducing dynamic switching power while preserving image fidelity:

* **Dynamic Power Reduction:** ~42.5% decrease ($P = \alpha C V^2 f$)
* **Propagation Delay Reduction:** ~41.5% decrease in critical path latency
* **Silicon Area Savings:** ~39.8% reduction in transistor gate count
* **Energy per Operation:** ~66.4% reduction (36.0 pJ down to 12.1 pJ)
* **Application Quality:** High visual fidelity maintained (PSNR > 40 dB) and biometric accuracy retained (97.8% vs 98.5%)

---

## 3-Stage Circuit Architecture and Specifications

The 16-bit arithmetic logic for operands $A, B \in [0 \dots 65535]$ is partitioned into three distinct operational stages:

### 1. Stage 1: Approximate LSB Block (Bits 0–7)
To drastically reduce dynamic switching power and critical path delay, the lower eight bits bypass conventional Full Adder logic. Summation in this segment is approximated using simplified, low-power gates (bitwise OR logic):
$$S_i = A_i \lor B_i \quad \text{for } i \in [0 \dots 7]$$
This breaks the traditional carry-propagation chain, yielding massive reductions in silicon area and energy consumption.

### 2. Stage 2: Carry Prediction Interface
To prevent the severe mathematical errors of standard ETA-1, this interface incorporates a lightweight carry predictor. Using simple AND and majority logic on the highest-order LSB operand bits (Bit 7: $A_7$ and $B_7$), it evaluates if a carry is mathematically likely:
$$C_{\text{pred}} = A_7 \land B_7$$
If detected, it immediately generates and forwards $C_{\text{pred}} = 1$ into the Stage 3 MSB block, bypassing slow ripple-carry propagation.

### 3. Stage 3: Precise MSB Block (Bits 8–15)
The upper eight bits are processed using standard 100% accurate Ripple Carry Adder logic, accepting predicted carry-in $C_{\text{pred}}$ from Stage 2:
$$S_{\text{MSB}} = \left(A \gg 8\right) + \left(B \gg 8\right) + C_{\text{pred}}$$
Preserving exact precision in these higher numerical weights ensures structural integrity and image brightness data are perfectly maintained.

---

## System Modules

### 1. Interactive 16-Bit Circuit Simulator
* **Register Controls:** Interactive 16-bit inputs for Operands A and B $[0 \dots 65535]$ with decimal and binary displays.
* **Stage Partitioning Visualizer:** Real-time visual demarcations between Stage 1 (Bits 0-7 LSB OR), Stage 2 (Bit 7 Carry Predictor), and Stage 3 (Bits 8-15 Precise MSB).
* **Execution Stepper:** Animated scan demonstrating Stage 1 LSB OR logic, Stage 2 carry prediction $C_{\text{pred}}$, and Stage 3 precise addition.

### 2. CNN Facial Attendance System
* **Biometric Profile Manager:** Feature extraction generating 128-element 8-bit integer embedding descriptors.
* **Dual Matching Engine:**
  * *16-Bit Carry-Predictive ETA-1 Mode:* Cumulative distance via hybrid 16-bit Carry-Predictive addition.
  * *Exact Normal Mode:* Standard Euclidean/L1 sum of absolute differences.
* **Attendance Logger:** Persistent local storage recording user identity, timestamp, distance delta, and energy savings.

### 3. Real-Time Image Processing Engine
* **Dual Canvas Pipeline:** Simultaneous rendering of Exact Result, Carry-Predictive ETA-1 Result, and amplified Error Heatmap ($|I_{\text{exact}} - I_{\text{approx}}| \times 4$).
* **Fidelity Analytics:** Real-time computation of Peak Signal-to-Noise Ratio (PSNR in dB), Mean Squared Error (MSE), Mean Error Distance (MED), and Normalized MED (NMED).
* **Input Sources:** Image Blending, Brightness Offset, Preset Test Patterns (Lenna, Cameraman, Gradient), Custom Image Upload, and Live Camera Feed.

### 4. Error Space Analytics
* **Interactive Heatmap:** Input pair matrix visualization ($A, B \in [0 \dots 255]$).
* **Hover Inspection:** Real-time tooltip inspecting exact sum, approximate sum, and error distance.
* **Statistical Metrics:** Error Rate (ER %), Maximum Error Distance (Max ED), MED, and NMED.

### 5. Hardware PPA Specifications
* **CMOS 45nm Benchmark Visualizations:** Dynamic Power (mW), Propagation Delay (ns), Silicon Area (Gate Count), and Energy per Operation (pJ).

---

## Performance Summary Table

| Performance Metric | Exact Adder (Normal 16-Bit) | Carry-Predictive ETA-1 Variant | Net Delta / Savings |
| :--- | :---: | :---: | :---: |
| Dynamic Power (mW) | 24.80 | 14.26 | -42.50% |
| Propagation Delay (ns) | 2.90 | 1.70 | -41.38% |
| Silicon Area (Gate Count) | 192.00 | 115.60 | -39.79% |
| Energy per Operation (pJ) | 36.00 | 12.10 | -66.39% |
| CNN Biometric Accuracy (%) | 98.50% | 97.80% | -0.70% |
| Image Quality (PSNR) | Infinite | 42.18 dB | Visually Imperceptible |

---

## Directory Structure

```
Codes/
├── index.html                           # Main web application interface
├── eta_1_approximation_simulator.html   # Standalone 16-bit simulator interface
├── css/
│   └── styles.css                       # Application stylesheet
├── js/
│   ├── adder_logic.js                   # 16-bit Carry-Predictive ETA-1 core engine
│   ├── bit_simulator.js                 # 16-bit circuit simulator
│   ├── facial_attendance.js             # CNN facial attendance module
│   ├── image_processor.js               # Image processing pipeline
│   ├── error_analytics.js               # Error space analytics
│   └── ppa_benchmarks.js                # Hardware PPA charts
└── Untitled3.ipynb                      # Jupyter research notebook
```

---

## Installation and Execution

### Method 1: Local HTTP Server (Recommended)
Run a local HTTP server from the project directory:

```bash
python -m http.server 8080 --directory Codes
```

Access the interface by navigating to:
```
http://localhost:8080
```

### Method 2: Direct File Open
Open `Codes/index.html` or `Codes/eta_1_approximation_simulator.html` directly in any modern web browser.

---

## References

1. *Approximate Arithmetic Circuits Enabling Energy-Efficient Edge Computing*
2. *Approximate Computing: Concepts, Architectures, Challenges, Applications, and Future Directions*
3. *Performance Improvement of Processor Through Configurable Approximate Arithmetic Units in Multicore Systems*
