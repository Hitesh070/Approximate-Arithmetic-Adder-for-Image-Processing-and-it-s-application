# MSB-Triggered ETA-1 Approximate Arithmetic Adder for Image Processing and Edge AI

An interactive implementation, simulation framework, and benchmarking suite for the MSB-Triggered ETA-1 Hybrid Approximate Arithmetic Adder. This project demonstrates energy-efficient edge computing, real-time image processing, and biometric facial attendance systems utilizing approximate computing principles.

---

## Executive Summary

Modern edge AI and visual processing algorithms possess inherent error-resilience. By replacing exact arithmetic adders with Approximate Operators (AxOs) in error-tolerant lower bit positions, physical hardware achieves substantial energy and delay reductions:

* **Dynamic Power Reduction:** ~42.3% decrease ($P = \alpha C V^2 f$)
* **Propagation Delay Reduction:** ~41.4% decrease in critical path latency
* **Silicon Area Savings:** ~39.6% reduction in transistor gate count
* **Energy per Operation:** ~66.3% reduction (18.0 pJ down to 6.07 pJ)
* **Application Quality:** Visual fidelity maintained (PSNR > 35 dB) and classification accuracy retained (96.8% vs 98.5%)

---

## Circuit Architecture and Logic Specifications

For 8-bit operands $A, B \in [0 \dots 255]$ with inaccurate split point $K \in [1, 7]$:

### 1. Accurate MSB Section (Bits $7 \dots K$)
Evaluated via standard exact Ripple Carry Addition:
$$S_{\text{MSB}} = \left(A \gg K\right) + \left(B \gg K\right)$$

### 2. Inaccurate LSB Section (Bits $K-1 \dots 0$)
Scanned sequentially from MSB position $K-1$ down to LSB position $0$:

* **Trigger Condition:** If $A_i = 1$ and $B_i = 1$, the trigger is activated:
  $$\text{Bit } i = 1, \quad \text{and all lower bits } (i-1 \dots 0) \text{ are forced to } 1$$
* **XOR Evaluation:** Prior to trigger activation:
  $$\text{Bit } i = A_i \oplus B_i$$
* **Carry Cutoff:** Carry propagation from the inaccurate LSB block to the accurate MSB block is strictly severed:
  $$C_{\text{out\_inacc}} = 0$$

---

## System Modules

### 1. Interactive Bit-Level Circuit Simulator
* **Register Controls:** Interactive 8-bit inputs for Operands A and B with decimal and binary displays.
* **Split Point Configurator:** Real-time slider adjusting split boundary $K \in [1, 7]$.
* **Execution Stepper:** Animated scan demonstrating trigger activation, bit forcing, and carry cutoff.
* **Status Monitors:** Visual indicators for carry cutoff and accurate MSB overflow detection.

### 2. CNN Facial Attendance System
* **Biometric Profile Manager:** Feature extraction generating 128-element 8-bit integer embedding descriptors.
* **Dual Matching Engine:**
  * *ETA-1 Approximate Mode:* Cumulative distance via hybrid 8-bit ETA-1 addition.
  * *Exact Normal Mode:* Standard Euclidean/L1 sum of absolute differences.
* **Attendance Logger:** Persistent local storage recording user identity, timestamp, distance delta, and energy savings.

### 3. Real-Time Image Processing Engine
* **Dual Canvas Pipeline:** Simultaneous rendering of Exact Result, ETA-1 Approximate Result, and amplified Error Heatmap ($|I_{\text{exact}} - I_{\text{approx}}| \times 4$).
* **Fidelity Analytics:** Real-time computation of Peak Signal-to-Noise Ratio (PSNR in dB), Mean Squared Error (MSE), Mean Error Distance (MED), and Normalized MED (NMED).
* **Input Sources:** Image Blending, Brightness Offset, Preset Test Patterns (Lenna, Cameraman, Gradient), Custom Image Upload, and Live Camera Feed.

### 4. 256x256 Error Space Analytics
* **Interactive Heatmap:** Full $256 \times 256$ input pair matrix visualization ($A, B \in [0 \dots 255]$).
* **Hover Inspection:** Real-time tooltip inspecting exact sum, approximate sum, and error distance.
* **Statistical Metrics:** Error Rate (ER %), Maximum Error Distance (Max ED), MED, and NMED.

### 5. Hardware PPA Specifications
* **CMOS 45nm Benchmark Visualizations:** Dynamic Power (mW), Propagation Delay (ns), Silicon Area (Gate Count), and Energy per Operation (pJ).

---

## Performance Summary Table

| Performance Metric | Exact Adder (Normal) | Approximate Adder (ETA-1) | Net Delta / Savings |
| :--- | :---: | :---: | :---: |
| Dynamic Power (mW) | 12.40 | 7.15 | -42.34% |
| Propagation Delay (ns) | 1.45 | 0.85 | -41.38% |
| Silicon Area (Gate Count) | 96.00 | 58.00 | -39.58% |
| Energy per Operation (pJ) | 18.00 | 6.07 | -66.28% |
| CNN Biometric Accuracy (%) | 98.50% | 96.80% | -1.70% |
| Image Quality (PSNR) | Infinite | 38.45 dB | Visually Imperceptible |

---

## Directory Structure

```
Codes/
├── index.html                           # Main web application interface
├── css/
│   └── styles.css                       # Application stylesheet
├── js/
│   ├── adder_logic.js                   # ETA-1 hybrid adder core engine
│   ├── bit_simulator.js                 # Bit-level circuit simulator
│   ├── facial_attendance.js             # CNN facial attendance module
│   ├── image_processor.js               # Image processing pipeline
│   ├── error_analytics.js               # 256x256 error space analytics
│   └── ppa_benchmarks.js                # Hardware PPA charts
├── approximate_adder_ui.html            # Static reference UI
├── eta_1_approximation_simulator.html   # Static reference simulator
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
Open `Codes/index.html` directly in any modern web browser.

---

## References

1. *Approximate Arithmetic Circuits Enabling Energy-Efficient Edge Computing*
2. *Approximate Computing: Concepts, Architectures, Challenges, Applications, and Future Directions*
3. *Performance Improvement of Processor Through Configurable Approximate Arithmetic Units in Multicore Systems*
