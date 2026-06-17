# 🧬 DermaScan AI — Smart Skin Analyzer

An AI-powered web application that analyzes facial skin conditions using client-side image processing. Upload a selfie and get instant insights about your skin health, personalized skincare routines, and ingredient recommendations — all processed locally in your browser for complete privacy.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Canvas API](https://img.shields.io/badge/Canvas_API-FF6384?style=for-the-badge&logo=html5&logoColor=white)

---

## ✨ Features

- 📸 **Image Upload** — Drag & drop or click to upload facial photos (JPG, PNG, WEBP)
- 🔬 **AI Skin Analysis** — Detects 6+ skin concerns using Canvas API pixel analysis
- 🧪 **Skin Type Detection** — Identifies oily, dry, or combination skin
- 📍 **Interactive Face Map** — Highlights affected areas with color-coded markers
- 📊 **Severity Classification** — Rates conditions as mild, moderate, or severe
- 🌅🌙 **Personalized Routines** — Morning & night skincare routines tailored to your skin
- 🧴 **Ingredient Guide** — Recommends ingredients like salicylic acid, niacinamide, vitamin C
- 📥 **Downloadable Report** — Save your analysis as a detailed HTML report
- 🔗 **Share Feature** — Share via WhatsApp, Twitter, LinkedIn, Email, or copy link
- 🔒 **100% Private** — All processing happens client-side; no images are uploaded or stored
- 📱 **Fully Responsive** — Works on desktop, tablet, and mobile devices

---

## 🚀 Live Demo

[**Try DermaScan AI →**](#) *(Add your deployed URL here)*

---

## 🖥️ Screenshots

| Hero Section | Analysis Results |
|---|---|
| Upload your photo | Get detailed skin report |

| Face Map | Skincare Routines |
|---|---|
| Visual condition mapping | Morning & night routines |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **HTML5** | Page structure & semantics |
| **CSS3** | Premium dark UI, glassmorphism, animations |
| **JavaScript (ES6+)** | Application logic & Canvas API image processing |
| **Canvas API** | Pixel-level skin analysis & face map rendering |
| **Google Fonts** | Inter & Outfit typography |

---

## 📁 Project Structure

```
skin-analyzer/
├── index.html      → Main page (hero, upload, results, features, contact, footer)
├── styles.css      → Premium dark theme with glassmorphism & micro-animations
├── analyzer.js     → Skin analysis engine using Canvas API pixel analysis
├── app.js          → UI controller, event handlers, particles background
├── report.js       → Downloadable HTML report generator
└── README.md       → Project documentation
```

---

## 🧪 How the Analysis Works

1. **Image Loading** — User photo is loaded into an HTML5 Canvas element
2. **Pixel Sampling** — RGB values are sampled across the image for color distribution
3. **Region Analysis** — Face is divided into zones (forehead, cheeks, nose, chin, T-zone)
4. **Condition Detection** — Algorithms detect:
   - Acne/pimples (redness variance)
   - Dark spots (brightness contrast)
   - Pigmentation (localized darkness)
   - Uneven skin tone (cross-region brightness difference)
   - Texture issues (brightness variance within regions)
   - Redness/inflammation (red channel dominance)
5. **Skin Type Classification** — Based on brightness, saturation, and variance patterns
6. **Severity Scoring** — Combined weighted scores classify severity level
7. **Face Map Generation** — Affected areas are overlaid on the original image

---

## 🏃 How to Run Locally

### Option 1: Direct Open
```bash
# Simply double-click index.html to open in your browser
open index.html
```

### Option 2: Local Server (Recommended)
```bash
# Navigate to the project folder
cd path/to/skin-analyzer

# Start a local server
python3 -m http.server 8080

# Open in browser: http://localhost:8080
```

---

## ⚠️ Disclaimer

This tool is **not a medical diagnosis tool**. All results are generated using image processing algorithms for **educational and informational purposes only**. Please consult a qualified dermatologist for persistent or severe skin conditions.

---

## 📬 Contact

- **Instagram:** [@s09uuu_](https://instagram.com/s09uuu_)
- **WhatsApp:** [+91 8958649058](https://wa.me/918958649058)
- **Email:** [s09uu118@gmail.com](mailto:s09uu118@gmail.com)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">Built with ❤️ by Sourabh Purohit</p>
