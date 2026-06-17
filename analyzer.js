/* =============================================
   DermaScan AI — Skin Analysis Engine
   Uses Canvas API for image-based skin analysis
   ============================================= */

class SkinAnalyzer {
    constructor() {
        this.canvas = document.getElementById('analysis-canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.modelsLoaded = false;
        this.modelsUrl = 'https://justadudewhohacks.github.io/face-api.js/models/';
    }

    /**
     * Load face-api.js models
     */
    async _loadModels() {
        if (this.modelsLoaded) return;
        
        try {
            // Load tinyFaceDetector for performance
            await faceapi.nets.tinyFaceDetector.loadFromUri(this.modelsUrl);
            await faceapi.nets.faceLandmark68Net.loadFromUri(this.modelsUrl);
            this.modelsLoaded = true;
            console.log('Face-api models loaded successfully');
        } catch (error) {
            console.error('Failed to load face detection models:', error);
            // Fallback: we'll still try to analyze but face detection will be skipped
        }
    }

    /**
     * Main analysis entry point
     * @param {HTMLImageElement} image - The uploaded face image
     * @param {Function} onProgress - Callback for progress updates
     * @returns {Object} Complete analysis results
     */
    async analyze(image, onProgress) {
        // Step 0: Face Detection Pre-check
        onProgress('Initializing face detection...', 2);
        await this._loadModels();

        // Detect faces
        onProgress('Identifying face in image...', 10);
        let detection = null;
        if (this.modelsLoaded) {
            detection = await faceapi.detectSingleFace(image, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
        }

        // If no face is detected, we stop analysis
        if (!detection) {
            if (!this.modelsLoaded) {
                throw new Error('FACE_DETECTION_INITIALIZATION_FAILED');
            }
            throw new Error('NO_FACE_DETECTED');
        }

        // Step 1: Load image into canvas
        onProgress('Processing image data...', 15);
        await this._sleep(300);

        this.canvas.width = image.naturalWidth;
        this.canvas.height = image.naturalHeight;
        this.ctx.drawImage(image, 0, 0);

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;

        // Step 2: Analyze skin tone & color distribution
        onProgress('Analyzing skin tones...', 25);
        await this._sleep(400);
        const colorAnalysis = this._analyzeColors(pixels, this.canvas.width, this.canvas.height);

        // Step 3: Analyze skin type
        onProgress('Detecting skin type...', 40);
        await this._sleep(500);
        const skinType = this._detectSkinType(colorAnalysis);

        // Step 4: Detect concerns by region (using face detection if available)
        onProgress('Scanning for skin concerns...', 55);
        await this._sleep(600);
        const regionAnalysis = this._analyzeRegions(pixels, this.canvas.width, this.canvas.height, detection);

        // Step 5: Detect specific conditions
        onProgress('Identifying conditions...', 60);
        await this._sleep(500);
        const conditions = this._detectConditions(colorAnalysis, regionAnalysis);

        // Step 6: Calculate severity
        onProgress('Calculating severity...', 75);
        await this._sleep(400);
        const severity = this._calculateSeverity(conditions);

        // Step 7: Generate recommendations
        onProgress('Building recommendations...', 85);
        await this._sleep(400);
        const recommendations = this._generateRecommendations(skinType, conditions, severity);

        // Step 8: Generate face map data
        onProgress('Creating face map...', 92);
        await this._sleep(300);
        const faceMapData = this._generateFaceMapData(regionAnalysis, conditions, this.canvas.width, this.canvas.height);

        // Step 9: Calculate confidence
        onProgress('Finalizing analysis...', 98);
        await this._sleep(300);
        const confidence = this._calculateConfidence(colorAnalysis, regionAnalysis);

        // Generate summary
        const summary = this._generateSummary(skinType, conditions, severity);

        return {
            skinType,
            conditions,
            severity,
            recommendations,
            faceMapData,
            confidence,
            summary,
            colorAnalysis,
            imageWidth: this.canvas.width,
            imageHeight: this.canvas.height
        };
    }

    /**
     * Analyze color distribution across the image
     */
    _analyzeColors(pixels, width, height) {
        let totalR = 0, totalG = 0, totalB = 0;
        let brightnessSum = 0;
        let rednessValues = [];
        let saturationValues = [];
        let brightnessValues = [];
        let pixelCount = 0;

        // Sample pixels (every 4th pixel for performance)
        for (let i = 0; i < pixels.length; i += 16) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            totalR += r;
            totalG += g;
            totalB += b;

            const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
            brightnessSum += brightness;
            brightnessValues.push(brightness);

            // Redness ratio
            const redness = r / (g + b + 1);
            rednessValues.push(redness);

            // HSL saturation approximation
            const max = Math.max(r, g, b) / 255;
            const min = Math.min(r, g, b) / 255;
            const l = (max + min) / 2;
            let s = 0;
            if (max !== min) {
                s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
            }
            saturationValues.push(s);

            pixelCount++;
        }

        const avgR = totalR / pixelCount;
        const avgG = totalG / pixelCount;
        const avgB = totalB / pixelCount;
        const avgBrightness = brightnessSum / pixelCount;

        // Calculate variance for uneven skin tone detection
        const brightnessVariance = this._calculateVariance(brightnessValues);
        const rednessVariance = this._calculateVariance(rednessValues);
        const avgSaturation = saturationValues.reduce((a, b) => a + b, 0) / saturationValues.length;
        const avgRedness = rednessValues.reduce((a, b) => a + b, 0) / rednessValues.length;

        // Detect dark spots (high brightness variance in localized areas)
        const darkSpotScore = this._detectDarkSpots(brightnessValues, width, height);

        return {
            avgR, avgG, avgB,
            avgBrightness,
            brightnessVariance,
            avgRedness,
            rednessVariance,
            avgSaturation,
            darkSpotScore,
            pixelCount
        };
    }

    /**
     * Detect skin type based on visual characteristics
     */
    _detectSkinType(colorAnalysis) {
        const { avgBrightness, avgSaturation, avgRedness, brightnessVariance } = colorAnalysis;

        // Scoring system for skin type
        let oilyScore = 0;
        let dryScore = 0;
        let comboScore = 0;

        // High brightness can indicate shine (oily)
        if (avgBrightness > 150) oilyScore += 3;
        else if (avgBrightness > 120) oilyScore += 1;
        else dryScore += 2;

        // Low brightness often indicates dryness
        if (avgBrightness < 100) dryScore += 3;

        // High saturation may suggest oiliness (shine reflects more color)
        if (avgSaturation > 0.35) oilyScore += 2;
        else if (avgSaturation < 0.2) dryScore += 2;

        // High variance can indicate combination skin
        if (brightnessVariance > 1500) comboScore += 3;
        else if (brightnessVariance > 800) comboScore += 1;

        // Redness often correlates with sensitivity (common in dry skin)
        if (avgRedness > 0.8) dryScore += 1;

        // Moderate values suggest combination
        if (avgBrightness >= 100 && avgBrightness <= 150) comboScore += 2;

        const maxScore = Math.max(oilyScore, dryScore, comboScore);
        let type, icon, description;

        if (maxScore === oilyScore && oilyScore > comboScore) {
            type = 'Oily Skin';
            icon = '💧';
            description = 'Your skin appears to have higher shine levels and visible pore activity. Oily skin tends to produce excess sebum, making it prone to acne and enlarged pores, but it also ages more slowly.';
        } else if (maxScore === dryScore && dryScore > comboScore) {
            type = 'Dry Skin';
            icon = '🏜️';
            description = 'Your skin shows signs of lower moisture levels with potential for flakiness. Dry skin can feel tight and may show fine lines more easily. It benefits greatly from hydrating ingredients.';
        } else {
            type = 'Combination Skin';
            icon = '⚖️';
            description = 'Your skin exhibits characteristics of both oily and dry skin across different zones. Typically oilier in the T-zone (forehead, nose, chin) and drier on the cheeks.';
        }

        return { type, icon, description, scores: { oily: oilyScore, dry: dryScore, combination: comboScore } };
    }

    /**
     * Analyze image in regions (forehead, cheeks, nose, chin, etc.)
     */
    _analyzeRegions(pixels, width, height, detection = null) {
        let regions = {};

        if (detection && detection.landmarks) {
            // Use face landmarks for precise region detection
            const landmarks = detection.landmarks.positions;
            const box = detection.detection.box;

            // Simple map of landmarks to regions
            regions = {
                // Forehead: derived from box top and eyebrows
                forehead: { 
                    x: box.x + box.width * 0.25, 
                    y: box.y - (box.height * 0.1), 
                    w: box.width * 0.5, 
                    h: box.height * 0.2 
                },
                // Cheeks: around the side landmarks
                leftCheek: { 
                    x: landmarks[1].x, 
                    y: landmarks[29].y, 
                    w: box.width * 0.2, 
                    h: box.height * 0.2 
                },
                rightCheek: { 
                    x: landmarks[15].x - (box.width * 0.2), 
                    y: landmarks[29].y, 
                    w: box.width * 0.2, 
                    h: box.height * 0.2 
                },
                // Nose: tip landmarks
                nose: { 
                    x: landmarks[30].x - (box.width * 0.1), 
                    y: landmarks[30].y - (box.height * 0.1), 
                    w: box.width * 0.2, 
                    h: box.height * 0.2 
                },
                // Chin: bottom landmark
                chin: { 
                    x: landmarks[8].x - (box.width * 0.15), 
                    y: landmarks[8].y - (box.height * 0.15), 
                    w: box.width * 0.3, 
                    h: box.height * 0.15 
                },
                // T-Zone: forehead + nose
                tZone: { 
                    x: landmarks[27].x - (box.width * 0.1), 
                    y: box.y, 
                    w: box.width * 0.2, 
                    h: box.height * 0.5 
                }
            };
        } else {
            // Fallback to percentage-based if no detection (legacy or failure)
            regions = {
                forehead: { x: width * 0.25, y: height * 0.05, w: width * 0.5, h: height * 0.2 },
                leftCheek: { x: width * 0.05, y: height * 0.35, w: width * 0.3, h: height * 0.3 },
                rightCheek: { x: width * 0.65, y: height * 0.35, w: width * 0.3, h: height * 0.3 },
                nose: { x: width * 0.35, y: height * 0.3, w: width * 0.3, h: height * 0.3 },
                chin: { x: width * 0.3, y: height * 0.7, w: width * 0.4, h: height * 0.2 },
                tZone: { x: width * 0.35, y: height * 0.05, w: width * 0.3, h: height * 0.75 }
            };
        }

        const regionData = {};

        for (const [name, bounds] of Object.entries(regions)) {
            // Ensure bounds are within image limits
            const safeBounds = {
                x: Math.max(0, bounds.x),
                y: Math.max(0, bounds.y),
                w: Math.min(bounds.w, width - Math.max(0, bounds.x)),
                h: Math.min(bounds.h, height - Math.max(0, bounds.y))
            };
            regionData[name] = this._analyzeRegion(pixels, width, height, safeBounds);
        }

        return regionData;
    }

    /**
     * Analyze a specific region of the image
     */
    _analyzeRegion(pixels, imgWidth, imgHeight, bounds) {
        const startX = Math.floor(bounds.x);
        const startY = Math.floor(bounds.y);
        const endX = Math.min(Math.floor(bounds.x + bounds.w), imgWidth);
        const endY = Math.min(Math.floor(bounds.y + bounds.h), imgHeight);

        let totalR = 0, totalG = 0, totalB = 0;
        let rednessValues = [];
        let brightnessValues = [];
        let count = 0;

        for (let y = startY; y < endY; y += 3) {
            for (let x = startX; x < endX; x += 3) {
                const idx = (y * imgWidth + x) * 4;
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];

                totalR += r;
                totalG += g;
                totalB += b;

                const brightness = r * 0.299 + g * 0.587 + b * 0.114;
                brightnessValues.push(brightness);

                const redness = r / (g + b + 1);
                rednessValues.push(redness);

                count++;
            }
        }

        if (count === 0) {
            return { avgR: 0, avgG: 0, avgB: 0, avgBrightness: 0, rednessScore: 0, brightnessVar: 0, textureScore: 0 };
        }

        const avgBrightness = brightnessValues.reduce((a, b) => a + b, 0) / count;
        const brightnessVar = this._calculateVariance(brightnessValues);
        const avgRedness = rednessValues.reduce((a, b) => a + b, 0) / count;

        // Texture irregularity score (high variance = more texture variation)
        const textureScore = Math.min(brightnessVar / 500, 1);

        return {
            avgR: totalR / count,
            avgG: totalG / count,
            avgB: totalB / count,
            avgBrightness,
            rednessScore: avgRedness,
            brightnessVar,
            textureScore,
            bounds
        };
    }

    /**
     * Detect specific skin conditions
     */
    _detectConditions(colorAnalysis, regionAnalysis) {
        const conditions = [];

        // 1. Acne / Pimples Detection
        const acneScore = this._detectAcne(colorAnalysis, regionAnalysis);
        if (acneScore > 0.15) {
            conditions.push({
                name: 'Acne / Pimples',
                icon: '🔴',
                severity: acneScore > 0.6 ? 'severe' : acneScore > 0.35 ? 'moderate' : 'mild',
                score: acneScore,
                regions: this._getAffectedRegions(regionAnalysis, 'redness')
            });
        }

        // 2. Dark Spots / Hyperpigmentation
        const darkSpotScore = colorAnalysis.darkSpotScore;
        if (darkSpotScore > 0.15) {
            conditions.push({
                name: 'Dark Spots',
                icon: '⚫',
                severity: darkSpotScore > 0.6 ? 'severe' : darkSpotScore > 0.35 ? 'moderate' : 'mild',
                score: darkSpotScore,
                regions: this._getAffectedRegions(regionAnalysis, 'darkness')
            });
        }

        // 3. Uneven Skin Tone
        const unevenScore = this._detectUnevenTone(colorAnalysis, regionAnalysis);
        if (unevenScore > 0.2) {
            conditions.push({
                name: 'Uneven Skin Tone',
                icon: '🎨',
                severity: unevenScore > 0.65 ? 'severe' : unevenScore > 0.4 ? 'moderate' : 'mild',
                score: unevenScore,
                regions: ['Cheeks', 'Forehead']
            });
        }

        // 4. Pigmentation
        const pigmentScore = this._detectPigmentation(colorAnalysis, regionAnalysis);
        if (pigmentScore > 0.15) {
            conditions.push({
                name: 'Pigmentation',
                icon: '🟤',
                severity: pigmentScore > 0.6 ? 'severe' : pigmentScore > 0.35 ? 'moderate' : 'mild',
                score: pigmentScore,
                regions: ['Cheeks', 'Under-eyes']
            });
        }

        // 5. Skin Texture Issues
        const textureScore = this._detectTextureIssues(regionAnalysis);
        if (textureScore > 0.2) {
            conditions.push({
                name: 'Rough Texture',
                icon: '🔲',
                severity: textureScore > 0.6 ? 'severe' : textureScore > 0.35 ? 'moderate' : 'mild',
                score: textureScore,
                regions: this._getAffectedRegions(regionAnalysis, 'texture')
            });
        }

        // 6. Redness / Inflammation
        const inflammationScore = this._detectInflammation(colorAnalysis, regionAnalysis);
        if (inflammationScore > 0.2) {
            conditions.push({
                name: 'Redness / Inflammation',
                icon: '🌡️',
                severity: inflammationScore > 0.6 ? 'severe' : inflammationScore > 0.35 ? 'moderate' : 'mild',
                score: inflammationScore,
                regions: this._getAffectedRegions(regionAnalysis, 'redness')
            });
        }

        // Ensure at least one condition is reported
        if (conditions.length === 0) {
            conditions.push({
                name: 'Generally Healthy Skin',
                icon: '✅',
                severity: 'mild',
                score: 0.1,
                regions: ['Overall']
            });
        }

        return conditions.sort((a, b) => b.score - a.score);
    }

    _detectAcne(colorAnalysis, regionAnalysis) {
        let score = 0;
        const { avgRedness, rednessVariance } = colorAnalysis;

        // High redness with variance indicates acne spots
        if (avgRedness > 0.6) score += 0.3;
        if (rednessVariance > 0.02) score += 0.2;

        // Check specific regions
        for (const region of Object.values(regionAnalysis)) {
            if (region.rednessScore > 0.7 && region.textureScore > 0.3) {
                score += 0.15;
            }
        }

        return Math.min(score, 1);
    }

    _detectUnevenTone(colorAnalysis, regionAnalysis) {
        const regions = Object.values(regionAnalysis);
        if (regions.length < 2) return 0;

        // Compare brightness across regions
        const brightnesses = regions.map(r => r.avgBrightness);
        const maxDiff = Math.max(...brightnesses) - Math.min(...brightnesses);

        // Normalize: a difference of 60+ is significant
        return Math.min(maxDiff / 80, 1);
    }

    _detectPigmentation(colorAnalysis, regionAnalysis) {
        let score = 0;
        const { brightnessVariance, darkSpotScore } = colorAnalysis;

        score += darkSpotScore * 0.5;
        if (brightnessVariance > 1200) score += 0.3;

        // Check cheek regions for darker patches
        if (regionAnalysis.leftCheek && regionAnalysis.rightCheek) {
            const diff = Math.abs(regionAnalysis.leftCheek.avgBrightness - regionAnalysis.rightCheek.avgBrightness);
            if (diff > 15) score += 0.2;
        }

        return Math.min(score, 1);
    }

    _detectTextureIssues(regionAnalysis) {
        const textures = Object.values(regionAnalysis).map(r => r.textureScore);
        const avgTexture = textures.reduce((a, b) => a + b, 0) / textures.length;
        return Math.min(avgTexture * 1.5, 1);
    }

    _detectInflammation(colorAnalysis, regionAnalysis) {
        let score = 0;
        const { avgRedness } = colorAnalysis;

        if (avgRedness > 0.65) score += 0.4;
        if (avgRedness > 0.75) score += 0.2;

        // Check for high redness in specific regions
        for (const region of Object.values(regionAnalysis)) {
            if (region.rednessScore > 0.8) score += 0.1;
        }

        return Math.min(score, 1);
    }

    _getAffectedRegions(regionAnalysis, type) {
        const regionNames = {
            forehead: 'Forehead',
            leftCheek: 'Left Cheek',
            rightCheek: 'Right Cheek',
            nose: 'Nose',
            chin: 'Chin',
            tZone: 'T-Zone'
        };

        const affected = [];

        for (const [name, data] of Object.entries(regionAnalysis)) {
            if (type === 'redness' && data.rednessScore > 0.6) {
                affected.push(regionNames[name] || name);
            } else if (type === 'darkness' && data.avgBrightness < 100) {
                affected.push(regionNames[name] || name);
            } else if (type === 'texture' && data.textureScore > 0.3) {
                affected.push(regionNames[name] || name);
            }
        }

        return affected.length > 0 ? affected : ['General Areas'];
    }

    /**
     * Calculate overall severity
     */
    _calculateSeverity(conditions) {
        if (conditions.length === 0) return { level: 'mild', score: 0, text: 'No significant concerns detected.' };

        const avgScore = conditions.reduce((sum, c) => sum + c.score, 0) / conditions.length;
        const maxScore = Math.max(...conditions.map(c => c.score));
        const combinedScore = (avgScore * 0.4 + maxScore * 0.6);

        let level, text;

        if (combinedScore > 0.6) {
            level = 'severe';
            text = 'Multiple noticeable skin concerns detected. We recommend consulting a dermatologist for a professional assessment and personalized treatment plan.';
        } else if (combinedScore > 0.3) {
            level = 'moderate';
            text = 'Some skin concerns were identified. A consistent skincare routine with targeted ingredients may help improve these conditions over time.';
        } else {
            level = 'mild';
            text = 'Your skin shows minor concerns that are common and manageable. A good basic skincare routine should help maintain and improve your skin health.';
        }

        return { level, score: combinedScore, text };
    }

    /**
     * Generate personalized skincare recommendations
     */
    _generateRecommendations(skinType, conditions, severity) {
        const conditionNames = conditions.map(c => c.name.toLowerCase());
        const hasAcne = conditionNames.some(n => n.includes('acne') || n.includes('pimple'));
        const hasDarkSpots = conditionNames.some(n => n.includes('dark spot'));
        const hasPigmentation = conditionNames.some(n => n.includes('pigment'));
        const hasRedness = conditionNames.some(n => n.includes('redness') || n.includes('inflammation'));
        const hasTexture = conditionNames.some(n => n.includes('texture'));
        const hasUnevenTone = conditionNames.some(n => n.includes('uneven'));

        const isOily = skinType.type.toLowerCase().includes('oily');
        const isDry = skinType.type.toLowerCase().includes('dry');

        // Morning Routine
        const morningRoutine = [
            {
                step: 'Cleanser',
                title: isOily ? 'Gentle Foaming Cleanser' : isDry ? 'Cream/Milk Cleanser' : 'Gel-based Cleanser',
                desc: isOily
                    ? 'Use a gentle foaming or gel cleanser to remove overnight oil without stripping the skin.'
                    : isDry
                    ? 'Use a hydrating cream or milk cleanser that cleanses without drying out your skin.'
                    : 'Use a pH-balanced gel cleanser for a fresh yet gentle clean.'
            },
            {
                step: 'Toner',
                title: hasAcne ? 'Salicylic Acid Toner' : 'Hydrating Toner',
                desc: hasAcne
                    ? 'A toner with 0.5-2% salicylic acid helps keep pores clear and reduces breakouts.'
                    : 'A hydrating toner helps balance pH and prep skin for serums.'
            },
            {
                step: 'Serum',
                title: (hasDarkSpots || hasPigmentation || hasUnevenTone) ? 'Vitamin C Serum (10-20%)' : hasAcne ? 'Niacinamide Serum (5%)' : 'Hyaluronic Acid Serum',
                desc: (hasDarkSpots || hasPigmentation || hasUnevenTone)
                    ? 'Vitamin C is a powerful antioxidant that brightens skin, fades dark spots, and evens out skin tone.'
                    : hasAcne
                    ? 'Niacinamide reduces inflammation, controls oil, and minimizes the appearance of pores.'
                    : 'Hyaluronic acid attracts moisture to the skin, keeping it plump and hydrated throughout the day.'
            },
            {
                step: 'Moisturizer',
                title: isOily ? 'Lightweight Gel Moisturizer' : 'Rich Cream Moisturizer',
                desc: isOily
                    ? 'A lightweight, oil-free gel moisturizer hydrates without adding excess shine.'
                    : 'A rich, nourishing cream moisturizer locks in hydration and strengthens the skin barrier.'
            },
            {
                step: 'Sunscreen',
                title: 'Broad-Spectrum SPF 30-50',
                desc: 'Sunscreen is the most important step! It prevents UV damage, dark spots, and premature aging. Apply even on cloudy days.'
            }
        ];

        // Night Routine
        const nightRoutine = [
            {
                step: 'Cleanser',
                title: 'Double Cleanse',
                desc: 'Start with an oil-based cleanser to remove sunscreen/makeup, followed by a water-based cleanser for a deep clean.'
            },
            {
                step: 'Exfoliant',
                title: hasAcne ? 'BHA (Salicylic Acid) Exfoliant' : 'AHA (Glycolic/Lactic Acid) Exfoliant',
                desc: hasAcne
                    ? 'Use a BHA exfoliant 2-3 times per week to unclog pores and prevent breakouts. Start with lower concentrations.'
                    : 'Use an AHA exfoliant 2-3 times per week to gently remove dead skin cells and improve skin texture and brightness.'
            },
            {
                step: 'Treatment',
                title: hasAcne ? 'Spot Treatment' : (hasDarkSpots || hasPigmentation) ? 'Brightening Serum' : 'Repair Serum',
                desc: hasAcne
                    ? 'Apply benzoyl peroxide (2.5%) or tea tree oil spot treatment on active breakouts.'
                    : (hasDarkSpots || hasPigmentation)
                    ? 'Apply alpha arbutin or azelaic acid serum to target hyperpigmentation and dark spots.'
                    : 'Use a peptide or ceramide serum to repair and strengthen the skin barrier overnight.'
            },
            {
                step: 'Eye Cream',
                title: 'Nourishing Eye Cream',
                desc: 'Apply a gentle eye cream with peptides or caffeine to the under-eye area to reduce puffiness and dark circles.'
            },
            {
                step: 'Night Cream',
                title: isDry ? 'Rich Night Cream / Sleeping Mask' : 'Lightweight Night Moisturizer',
                desc: isDry
                    ? 'Lock in all your treatments with a rich night cream or overnight sleeping mask for deep hydration.'
                    : 'A lightweight, non-comedogenic night moisturizer ensures your skin stays hydrated without clogging pores.'
            }
        ];

        // Ingredient Recommendations
        const ingredients = [];

        if (hasAcne) {
            ingredients.push({
                name: 'Salicylic Acid',
                emoji: '🧪',
                benefit: 'A BHA that penetrates pores to dissolve oil and dead skin cells. Excellent for preventing and treating acne breakouts.',
                forCondition: 'Acne / Pimples'
            });
        }

        ingredients.push({
            name: 'Niacinamide (Vitamin B3)',
            emoji: '✨',
            benefit: 'Reduces inflammation, controls sebum production, minimizes pores, and improves skin barrier function.',
            forCondition: hasAcne ? 'Acne & Oil Control' : 'Overall Skin Health'
        });

        if (hasDarkSpots || hasPigmentation || hasUnevenTone) {
            ingredients.push({
                name: 'Vitamin C (L-Ascorbic Acid)',
                emoji: '🍊',
                benefit: 'Powerful antioxidant that brightens skin, fades dark spots, boosts collagen, and provides UV protection.',
                forCondition: 'Dark Spots & Pigmentation'
            });

            ingredients.push({
                name: 'Alpha Arbutin',
                emoji: '🌿',
                benefit: 'Gently inhibits melanin production to fade hyperpigmentation and dark spots without irritation.',
                forCondition: 'Pigmentation & Dark Spots'
            });
        }

        if (hasRedness) {
            ingredients.push({
                name: 'Centella Asiatica (Cica)',
                emoji: '🌱',
                benefit: 'Soothes irritated skin, reduces redness, and promotes skin healing. Great for sensitive or inflamed skin.',
                forCondition: 'Redness & Inflammation'
            });
        }

        ingredients.push({
            name: 'Hyaluronic Acid',
            emoji: '💧',
            benefit: 'A humectant that attracts up to 1000x its weight in water. Hydrates all skin types and plumps fine lines.',
            forCondition: 'Hydration & Plumping'
        });

        if (hasTexture) {
            ingredients.push({
                name: 'Glycolic Acid (AHA)',
                emoji: '⚗️',
                benefit: 'Exfoliates the skin surface to smooth texture, reduce dullness, and promote cell turnover.',
                forCondition: 'Rough Texture'
            });
        }

        ingredients.push({
            name: 'SPF (Sunscreen)',
            emoji: '☀️',
            benefit: 'Protects against UVA/UVB rays that cause dark spots, premature aging, and skin damage. Non-negotiable daily step.',
            forCondition: 'Prevention & Protection'
        });

        if (!hasAcne) {
            ingredients.push({
                name: 'Retinol (Vitamin A)',
                emoji: '🔬',
                benefit: 'Accelerates cell turnover, reduces fine lines, improves texture, and boosts collagen production. Start low (0.25%).',
                forCondition: 'Anti-Aging & Texture'
            });
        }

        return { morningRoutine, nightRoutine, ingredients };
    }

    /**
     * Generate face map overlay data
     */
    _generateFaceMapData(regionAnalysis, conditions, imgWidth, imgHeight) {
        const markers = [];
        const colorMap = {
            'Acne / Pimples': 'rgba(255, 80, 80, 0.6)',
            'Dark Spots': 'rgba(100, 60, 20, 0.6)',
            'Uneven Skin Tone': 'rgba(255, 200, 50, 0.5)',
            'Pigmentation': 'rgba(180, 120, 60, 0.6)',
            'Rough Texture': 'rgba(200, 200, 255, 0.4)',
            'Redness / Inflammation': 'rgba(255, 100, 100, 0.5)',
            'Generally Healthy Skin': 'rgba(0, 212, 170, 0.3)'
        };

        // Create markers based on detected conditions and affected regions
        for (const condition of conditions) {
            const color = colorMap[condition.name] || 'rgba(124, 92, 255, 0.4)';

            // Map affected regions to approximate face positions
            const regionPositions = {
                'Forehead': { cx: 0.5, cy: 0.15, r: 0.12 },
                'Left Cheek': { cx: 0.25, cy: 0.5, r: 0.1 },
                'Right Cheek': { cx: 0.75, cy: 0.5, r: 0.1 },
                'Nose': { cx: 0.5, cy: 0.45, r: 0.06 },
                'Chin': { cx: 0.5, cy: 0.8, r: 0.08 },
                'T-Zone': { cx: 0.5, cy: 0.35, r: 0.08 },
                'Cheeks': { cx: 0.5, cy: 0.5, r: 0.18 },
                'Under-eyes': { cx: 0.5, cy: 0.38, r: 0.1 },
                'General Areas': { cx: 0.5, cy: 0.5, r: 0.2 },
                'Overall': { cx: 0.5, cy: 0.5, r: 0.25 }
            };

            for (const region of condition.regions) {
                const pos = regionPositions[region] || regionPositions['General Areas'];
                markers.push({
                    condition: condition.name,
                    severity: condition.severity,
                    color,
                    cx: pos.cx * imgWidth,
                    cy: pos.cy * imgHeight,
                    r: pos.r * Math.min(imgWidth, imgHeight),
                    region
                });
            }
        }

        return { markers, colorMap };
    }

    /**
     * Calculate confidence score
     */
    _calculateConfidence(colorAnalysis, regionAnalysis) {
        let confidence = 55; // Base confidence

        // Better image quality = higher confidence
        const { avgBrightness, pixelCount } = colorAnalysis;

        // Good brightness range
        if (avgBrightness > 80 && avgBrightness < 200) confidence += 15;
        else if (avgBrightness > 40 && avgBrightness < 220) confidence += 8;

        // Sufficient resolution (more pixels = better analysis)
        if (pixelCount > 50000) confidence += 10;
        else if (pixelCount > 20000) confidence += 5;

        // Multiple regions analyzed successfully
        const validRegions = Object.values(regionAnalysis).filter(r => r.avgBrightness > 0).length;
        if (validRegions >= 5) confidence += 8;
        else if (validRegions >= 3) confidence += 4;

        // Cap at 92% (never claim 100% confidence)
        confidence = Math.min(confidence, 92);
        confidence = Math.max(confidence, 45);

        return Math.round(confidence);
    }

    /**
     * Generate readable summary
     */
    _generateSummary(skinType, conditions, severity) {
        const conditionsList = conditions.map(c => c.name).join(', ');
        const topConcern = conditions[0]?.name || 'no major issues';

        let summary = `Based on our image analysis, your skin appears to be **${skinType.type}**. `;

        if (conditions.length === 1 && conditions[0].name === 'Generally Healthy Skin') {
            summary += 'Your skin looks generally healthy with no major visible concerns detected. ' +
                'Continue maintaining a good skincare routine with sun protection to keep your skin in great shape.';
        } else {
            summary += `We detected ${conditions.length} potential skin concern${conditions.length > 1 ? 's' : ''}: ${conditionsList}. `;
            summary += `The primary concern appears to be **${topConcern}** with an overall severity classified as **${severity.level}**. `;
            summary += severity.text;
        }

        return summary;
    }

    // ===== UTILITY METHODS =====

    _calculateVariance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    }

    _detectDarkSpots(brightnessValues, width, height) {
        if (brightnessValues.length < 10) return 0;

        const mean = brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;
        const darkThreshold = mean * 0.65;

        let darkCount = 0;
        for (const val of brightnessValues) {
            if (val < darkThreshold) darkCount++;
        }

        const darkRatio = darkCount / brightnessValues.length;
        return Math.min(darkRatio * 5, 1); // Scale up for sensitivity
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in app.js
window.SkinAnalyzer = SkinAnalyzer;
