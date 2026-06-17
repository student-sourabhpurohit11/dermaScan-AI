/* =============================================
   DermaScan AI — Report Generator
   Generates downloadable HTML report
   ============================================= */

class ReportGenerator {
    /**
     * Generate and download an HTML report
     * @param {Object} results - Analysis results from SkinAnalyzer
     * @param {string} imageDataUrl - Base64 image data URL
     */
    static downloadReport(results, imageDataUrl) {
        const html = this._buildReportHTML(results, imageDataUrl);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `DermaScan_Report_${this._getTimestamp()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static _getTimestamp() {
        const now = new Date();
        return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    }

    static _buildReportHTML(results, imageDataUrl) {
        const { skinType, conditions, severity, recommendations, confidence, summary } = results;
        const date = new Date().toLocaleDateString('en-IN', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const conditionsHTML = conditions.map(c => `
            <div class="condition-row">
                <span class="condition-icon">${c.icon}</span>
                <span class="condition-name">${c.name}</span>
                <span class="severity-badge severity-${c.severity}">${c.severity.toUpperCase()}</span>
            </div>
        `).join('');

        const morningHTML = recommendations.morningRoutine.map((step, i) => `
            <div class="routine-step">
                <div class="step-num">${i + 1}</div>
                <div class="step-info">
                    <strong>${step.title}</strong>
                    <p>${step.desc}</p>
                </div>
            </div>
        `).join('');

        const nightHTML = recommendations.nightRoutine.map((step, i) => `
            <div class="routine-step">
                <div class="step-num">${i + 1}</div>
                <div class="step-info">
                    <strong>${step.title}</strong>
                    <p>${step.desc}</p>
                </div>
            </div>
        `).join('');

        const ingredientsHTML = recommendations.ingredients.map(ing => `
            <div class="ingredient-item">
                <div class="ing-header">
                    <span class="ing-emoji">${ing.emoji}</span>
                    <strong>${ing.name}</strong>
                </div>
                <p>${ing.benefit}</p>
                <span class="ing-tag">For: ${ing.forCondition}</span>
            </div>
        `).join('');

        const severityPercent = Math.round(severity.score * 100);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DermaScan AI — Skin Analysis Report</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@600;700;800&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Inter', sans-serif;
            background: #0a0a1a;
            color: #e0e0f0;
            line-height: 1.6;
            padding: 40px 20px;
        }

        .report {
            max-width: 800px;
            margin: 0 auto;
            background: #111128;
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.08);
            overflow: hidden;
        }

        .report-header {
            background: linear-gradient(135deg, #1a1a3e, #2d1b54);
            padding: 40px;
            text-align: center;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .report-header h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 2em;
            font-weight: 800;
            margin-bottom: 8px;
        }

        .report-header h1 span {
            background: linear-gradient(135deg, #7c5cff, #ff6b9d);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .report-date {
            color: #8888a8;
            font-size: 0.9em;
        }

        .report-body { padding: 36px; }

        .report-section {
            margin-bottom: 36px;
        }

        .report-section h2 {
            font-family: 'Outfit', sans-serif;
            font-size: 1.3em;
            font-weight: 700;
            margin-bottom: 16px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .report-image {
            text-align: center;
            margin-bottom: 24px;
        }

        .report-image img {
            max-width: 100%;
            max-height: 350px;
            border-radius: 12px;
            border: 2px solid rgba(255,255,255,0.1);
        }

        .confidence-bar {
            background: rgba(255,255,255,0.05);
            border-radius: 20px;
            padding: 16px 20px;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .conf-label { font-size: 0.9em; color: #a0a0c8; }
        .conf-value { font-weight: 700; color: #00d4aa; font-size: 1.2em; }

        .skin-type-box {
            background: rgba(124, 92, 255, 0.1);
            border: 1px solid rgba(124, 92, 255, 0.2);
            border-radius: 16px;
            padding: 24px;
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .skin-type-icon { font-size: 2.5em; }
        .skin-type-name {
            font-family: 'Outfit', sans-serif;
            font-size: 1.3em;
            font-weight: 700;
            color: #fff;
        }
        .skin-type-desc {
            color: #a0a0c8;
            font-size: 0.9em;
            margin-top: 4px;
        }

        .condition-row {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: rgba(255,255,255,0.03);
            border-radius: 10px;
            margin-bottom: 8px;
            border: 1px solid rgba(255,255,255,0.06);
        }

        .condition-icon { font-size: 1.3em; }
        .condition-name { flex: 1; font-weight: 600; }

        .severity-badge {
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 0.72em;
            font-weight: 700;
            letter-spacing: 0.5px;
        }

        .severity-mild { background: rgba(0,212,170,0.15); color: #00d4aa; }
        .severity-moderate { background: rgba(255,167,38,0.15); color: #ffa726; }
        .severity-severe { background: rgba(239,83,80,0.15); color: #ef5350; }

        .severity-overview {
            text-align: center;
            padding: 20px;
            background: rgba(255,255,255,0.03);
            border-radius: 12px;
        }

        .severity-meter-bar {
            height: 8px;
            background: linear-gradient(90deg, #00d4aa, #ffa726, #ef5350);
            border-radius: 20px;
            margin: 12px 0;
            opacity: 0.4;
        }

        .severity-level-text {
            font-weight: 700;
            font-size: 1.1em;
            text-transform: capitalize;
        }

        .summary-text {
            color: #b0b0d0;
            font-size: 0.95em;
            line-height: 1.8;
            padding: 20px;
            background: rgba(255,255,255,0.03);
            border-radius: 12px;
            border-left: 3px solid #7c5cff;
        }

        .routines-wrapper {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        @media (max-width: 600px) {
            .routines-wrapper { grid-template-columns: 1fr; }
        }

        .routine-col h3 {
            font-family: 'Outfit', sans-serif;
            font-size: 1.1em;
            font-weight: 700;
            margin-bottom: 12px;
        }

        .routine-step {
            display: flex;
            gap: 12px;
            padding: 10px 14px;
            margin-bottom: 6px;
            border-left: 3px solid #7c5cff;
            background: rgba(255,255,255,0.02);
            border-radius: 8px;
        }

        .step-num {
            width: 24px; height: 24px;
            display: flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, #7c5cff, #ff6b9d);
            color: #fff;
            font-size: 0.7em;
            font-weight: 700;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .step-info strong { font-size: 0.9em; color: #e0e0f0; }
        .step-info p { font-size: 0.82em; color: #8888a8; margin-top: 2px; }

        .ingredient-item {
            padding: 14px 16px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 10px;
            margin-bottom: 10px;
        }

        .ing-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
        }

        .ing-emoji { font-size: 1.2em; }
        .ing-header strong { color: #f0f0ff; }
        .ingredient-item p { font-size: 0.85em; color: #a0a0c8; }

        .ing-tag {
            display: inline-block;
            margin-top: 8px;
            padding: 3px 10px;
            background: rgba(124,92,255,0.1);
            color: #7c5cff;
            font-size: 0.72em;
            font-weight: 600;
            border-radius: 20px;
        }

        .disclaimer {
            background: rgba(239,83,80,0.06);
            border: 1px solid rgba(239,83,80,0.2);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
        }

        .disclaimer h3 { color: #ef5350; font-size: 1em; margin-bottom: 8px; }
        .disclaimer p { color: #8888a8; font-size: 0.85em; line-height: 1.7; }

        .report-footer {
            text-align: center;
            padding: 24px;
            border-top: 1px solid rgba(255,255,255,0.06);
            color: #555;
            font-size: 0.8em;
        }

        @media print {
            body { background: #fff; color: #222; padding: 0; }
            .report { border: none; box-shadow: none; }
            .report-header { background: #f5f5ff; }
            .report-header h1 span { -webkit-text-fill-color: #7c5cff; }
            .condition-row, .routine-step, .ingredient-item, .summary-text { background: #f9f9ff; }
        }
    </style>
</head>
<body>
    <div class="report">
        <div class="report-header">
            <h1>🧬 Derma<span>Scan</span> AI</h1>
            <p class="report-date">Skin Analysis Report — ${date}</p>
        </div>

        <div class="report-body">
            ${imageDataUrl ? `
            <div class="report-section report-image">
                <img src="${imageDataUrl}" alt="Analyzed facial photo">
            </div>` : ''}

            <div class="confidence-bar">
                <span class="conf-label">Analysis Confidence:</span>
                <span class="conf-value">${confidence}%</span>
            </div>

            <div class="report-section">
                <h2>🧪 Detected Skin Type</h2>
                <div class="skin-type-box">
                    <span class="skin-type-icon">${skinType.icon}</span>
                    <div>
                        <div class="skin-type-name">${skinType.type}</div>
                        <div class="skin-type-desc">${skinType.description}</div>
                    </div>
                </div>
            </div>

            <div class="report-section">
                <h2>🩺 Detected Skin Concerns</h2>
                ${conditionsHTML}
            </div>

            <div class="report-section">
                <h2>📊 Overall Severity</h2>
                <div class="severity-overview">
                    <div class="severity-meter-bar"></div>
                    <p class="severity-level-text">${severity.level}</p>
                    <p style="color: #8888a8; font-size: 0.85em; margin-top: 8px;">${severity.text}</p>
                </div>
            </div>

            <div class="report-section">
                <h2>📝 Summary</h2>
                <div class="summary-text">${summary.replace(/\*\*/g, '')}</div>
            </div>

            <div class="report-section">
                <h2>🌅 Skincare Routines</h2>
                <div class="routines-wrapper">
                    <div class="routine-col">
                        <h3>☀️ Morning</h3>
                        ${morningHTML}
                    </div>
                    <div class="routine-col">
                        <h3>🌙 Night</h3>
                        ${nightHTML}
                    </div>
                </div>
            </div>

            <div class="report-section">
                <h2>🧴 Recommended Ingredients</h2>
                ${ingredientsHTML}
            </div>

            <div class="report-section">
                <div class="disclaimer">
                    <h3>⚠️ Important Disclaimer</h3>
                    <p>This analysis is NOT a medical diagnosis. Results are generated using image processing algorithms for educational and informational purposes only. Please consult a qualified dermatologist for persistent or severe skin conditions. Do not use this as a substitute for professional medical advice.</p>
                </div>
            </div>
        </div>

        <div class="report-footer">
            <p>Generated by DermaScan AI © ${new Date().getFullYear()} — For educational purposes only</p>
        </div>
    </div>
</body>
</html>`;
    }
}

window.ReportGenerator = ReportGenerator;
