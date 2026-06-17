/* =============================================
   DermaScan AI — Main Application Controller
   Handles UI interactions, state management
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

    // ===== DOM ELEMENTS =====
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const previewArea = document.getElementById('preview-area');
    const previewImage = document.getElementById('preview-image');
    const analyzeBtn = document.getElementById('analyze-btn');
    const reuploadBtn = document.getElementById('reupload-btn');
    const loadingState = document.getElementById('loading-state');
    const loadingStep = document.getElementById('loading-step');
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    const scanOverlay = document.getElementById('scan-overlay');
    const resultsSection = document.getElementById('results-section');
    const downloadReportBtn = document.getElementById('download-report-btn');
    const newScanBtn = document.getElementById('new-scan-btn');
    const startScanBtn = document.getElementById('start-scan-btn');
    const particlesCanvas = document.getElementById('particles-canvas');

    let currentImageDataUrl = null;
    let analysisResults = null;

    // ===== PARTICLES BACKGROUND =====
    initParticles();

    // ===== EVENT LISTENERS =====

    // Upload zone click
    uploadZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            loadImage(file);
        }
    });

    // Analyze button
    analyzeBtn.addEventListener('click', startAnalysis);

    // Re-upload button
    reuploadBtn.addEventListener('click', resetUpload);

    // Download report
    downloadReportBtn.addEventListener('click', () => {
        if (analysisResults && currentImageDataUrl) {
            ReportGenerator.downloadReport(analysisResults, currentImageDataUrl);
        }
    });

    // New scan
    newScanBtn.addEventListener('click', () => {
        resetUpload();
        resultsSection.style.display = 'none';
        document.getElementById('upload-section').scrollIntoView({ behavior: 'smooth' });
    });

    // Smooth scroll for nav links
    document.querySelectorAll('.nav-link, .hero-actions a').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // ===== FUNCTIONS =====

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPG, PNG, WEBP).');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File size exceeds 10MB. Please use a smaller image.');
            return;
        }

        loadImage(file);
    }

    function loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentImageDataUrl = e.target.result;
            previewImage.src = currentImageDataUrl;
            uploadZone.style.display = 'none';
            previewArea.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    function resetUpload() {
        uploadZone.style.display = 'block';
        previewArea.style.display = 'none';
        loadingState.style.display = 'none';
        scanOverlay.classList.remove('active');
        fileInput.value = '';
        currentImageDataUrl = null;
        analysisResults = null;
    }

    async function startAnalysis() {
        if (!currentImageDataUrl) return;

        // Show loading state
        previewArea.style.display = 'none';
        loadingState.style.display = 'block';
        scanOverlay.classList.add('active');

        const analyzer = new SkinAnalyzer();

        const onProgress = (step, percent) => {
            loadingStep.textContent = step;
            progressFill.style.width = percent + '%';
            progressPercent.textContent = percent + '%';
        };

        try {
            // Wait for image to be fully loaded
            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = currentImageDataUrl;
            });

            // Run analysis
            analysisResults = await analyzer.analyze(img, onProgress);

            // Finish loading
            onProgress('Analysis complete!', 100);
            await sleep(500);

            // Hide loading, show results
            loadingState.style.display = 'none';
            displayResults(analysisResults);

        } catch (error) {
            console.error('Analysis failed:', error);
            loadingState.style.display = 'none';
            previewArea.style.display = 'block';
            
            if (error.message === 'NO_FACE_DETECTED') {
                alert('No face detected! Please upload a clear photo of your face. Make sure it is well-lit and not obstructed by other objects.');
            } else if (error.message === 'FACE_DETECTION_INITIALIZATION_FAILED') {
                alert('Face detection initialization failed. Please check your internet connection or try a different browser.');
            } else {
                alert('Analysis failed. Please try again with a different image.');
            }
        }
    }

    function displayResults(results) {
        resultsSection.style.display = 'block';

        // Scroll to results
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        // Animate confidence score
        const confidenceValue = document.getElementById('confidence-value');
        const confidenceFill = document.getElementById('confidence-fill');
        animateCounter(0, results.confidence, 1500, (val) => {
            confidenceValue.textContent = val + '%';
            confidenceFill.style.width = val + '%';
        });

        // Skin Type
        document.getElementById('skin-type-icon').textContent = results.skinType.icon;
        document.getElementById('skin-type-name').textContent = results.skinType.type;
        document.getElementById('skin-type-desc').textContent = results.skinType.description;

        // Conditions
        const conditionsList = document.getElementById('conditions-list');
        conditionsList.innerHTML = '';
        results.conditions.forEach((condition, index) => {
            const item = document.createElement('div');
            item.className = 'condition-item';
            item.style.animationDelay = `${index * 0.1}s`;
            item.classList.add('fade-in-up');
            item.innerHTML = `
                <div class="condition-info">
                    <span class="condition-icon">${condition.icon}</span>
                    <span class="condition-name">${condition.name}</span>
                </div>
                <span class="condition-severity severity-${condition.severity}">${condition.severity}</span>
            `;
            conditionsList.appendChild(item);
        });

        // Severity
        const severityFill = document.getElementById('severity-fill');
        const severityText = document.getElementById('severity-text');
        const severityPercent = results.severity.score * 100;
        setTimeout(() => {
            severityFill.style.left = `calc(${Math.min(severityPercent, 95)}% - 9px)`;
        }, 500);
        severityText.textContent = `${results.severity.level.charAt(0).toUpperCase() + results.severity.level.slice(1)} — ${results.severity.text}`;

        // Summary
        const summaryText = document.getElementById('summary-text');
        summaryText.innerHTML = results.summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Face Map
        drawFaceMap(results);

        // Morning Routine
        const morningRoutine = document.getElementById('morning-routine');
        morningRoutine.innerHTML = '';
        results.recommendations.morningRoutine.forEach((step, i) => {
            morningRoutine.innerHTML += `
                <div class="routine-step fade-in-up" style="animation-delay: ${i * 0.08}s">
                    <div class="step-num">${i + 1}</div>
                    <div class="step-content">
                        <h4>${step.title}</h4>
                        <p>${step.desc}</p>
                    </div>
                </div>
            `;
        });

        // Night Routine
        const nightRoutine = document.getElementById('night-routine');
        nightRoutine.innerHTML = '';
        results.recommendations.nightRoutine.forEach((step, i) => {
            nightRoutine.innerHTML += `
                <div class="routine-step fade-in-up" style="animation-delay: ${i * 0.08}s">
                    <div class="step-num">${i + 1}</div>
                    <div class="step-content">
                        <h4>${step.title}</h4>
                        <p>${step.desc}</p>
                    </div>
                </div>
            `;
        });

        // Ingredients
        const ingredientsGrid = document.getElementById('ingredients-grid');
        ingredientsGrid.innerHTML = '';
        results.recommendations.ingredients.forEach((ing, i) => {
            ingredientsGrid.innerHTML += `
                <div class="ingredient-card fade-in-up" style="animation-delay: ${i * 0.08}s">
                    <span class="ingredient-emoji">${ing.emoji}</span>
                    <div class="ingredient-name">${ing.name}</div>
                    <div class="ingredient-benefit">${ing.benefit}</div>
                    <span class="ingredient-for">For: ${ing.forCondition}</span>
                </div>
            `;
        });

        // Face map legend
        const legend = document.getElementById('face-map-legend');
        legend.innerHTML = '';
        const shownColors = new Set();
        results.faceMapData.markers.forEach(m => {
            if (!shownColors.has(m.condition)) {
                shownColors.add(m.condition);
                legend.innerHTML += `
                    <div class="legend-item">
                        <span class="legend-dot" style="background: ${m.color}"></span>
                        <span>${m.condition}</span>
                    </div>
                `;
            }
        });
    }

    function drawFaceMap(results) {
        const canvas = document.getElementById('face-map-canvas');
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.onload = () => {
            // Scale image for face map display
            const maxWidth = 450;
            const scale = Math.min(maxWidth / img.naturalWidth, 1);
            canvas.width = img.naturalWidth * scale;
            canvas.height = img.naturalHeight * scale;

            // Draw image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Slight darken overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw markers for detected conditions
            const scaleX = canvas.width / results.imageWidth;
            const scaleY = canvas.height / results.imageHeight;

            results.faceMapData.markers.forEach(marker => {
                const cx = marker.cx * scaleX;
                const cy = marker.cy * scaleY;
                const r = marker.r * Math.min(scaleX, scaleY);

                // Draw glowing circle
                const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                gradient.addColorStop(0, marker.color);
                gradient.addColorStop(0.7, marker.color.replace(/[\d.]+\)$/, '0.2)'));
                gradient.addColorStop(1, 'transparent');

                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Draw border
                ctx.beginPath();
                ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
                ctx.strokeStyle = marker.color.replace(/[\d.]+\)$/, '0.8)');
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);

                // Label
                ctx.font = `bold ${Math.max(10, r * 0.25)}px Inter, sans-serif`;
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Draw label background
                const labelText = marker.region;
                const textMetrics = ctx.measureText(labelText);
                const labelX = cx;
                const labelY = cy + r * 0.5;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                const padding = 4;
                ctx.fillRect(
                    labelX - textMetrics.width / 2 - padding,
                    labelY - 7 - padding,
                    textMetrics.width + padding * 2,
                    14 + padding * 2
                );

                ctx.fillStyle = '#ffffff';
                ctx.fillText(labelText, labelX, labelY);
            });

            // Add "DermaScan AI" watermark
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.fillStyle = 'rgba(124, 92, 255, 0.5)';
            ctx.textAlign = 'right';
            ctx.fillText('DermaScan AI', canvas.width - 10, canvas.height - 10);
        };
        img.src = currentImageDataUrl;
    }

    // ===== UTILITY FUNCTIONS =====

    function animateCounter(start, end, duration, callback) {
        const startTime = performance.now();
        const tick = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const current = Math.round(start + (end - start) * eased);
            callback(current);
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ===== PARTICLES ANIMATION =====
    function initParticles() {
        const ctx = particlesCanvas.getContext('2d');
        let w, h;
        let particles = [];
        const PARTICLE_COUNT = 60;

        function resize() {
            w = particlesCanvas.width = window.innerWidth;
            h = particlesCanvas.height = window.innerHeight;
        }

        function createParticle() {
            return {
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.3 + 0.1,
                color: ['#7c5cff', '#ff6b9d', '#00d4aa'][Math.floor(Math.random() * 3)]
            };
        }

        function init() {
            resize();
            particles = [];
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push(createParticle());
            }
        }

        function draw() {
            ctx.clearRect(0, 0, w, h);

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.fill();
                ctx.globalAlpha = 1;
            });

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(124, 92, 255, ${0.06 * (1 - dist / 150)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(draw);
        }

        window.addEventListener('resize', resize);
        init();
        draw();
    }

    // ===== NAVBAR SCROLL EFFECT =====
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        const currentScroll = window.scrollY;

        if (currentScroll > 100) {
            navbar.style.background = 'rgba(10, 10, 26, 0.95)';
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        } else {
            navbar.style.background = 'rgba(10, 10, 26, 0.8)';
            navbar.style.boxShadow = 'none';
        }

        lastScroll = currentScroll;
    });

    // ===== INTERSECTION OBSERVER FOR ANIMATIONS =====
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.step-card, .feature-card, .result-card, .contact-card').forEach(el => {
        observer.observe(el);
    });

    // ===== SHARE MODAL FUNCTIONALITY =====
    const shareModalOverlay = document.getElementById('share-modal-overlay');
    const shareModalClose = document.getElementById('share-modal-close');
    const floatingShareBtn = document.getElementById('floating-share-btn');
    const shareResultsBtn = document.getElementById('share-results-btn');
    const shareCopyFeedback = document.getElementById('share-copy-feedback');

    const shareUrl = window.location.href;
    const shareTitle = 'DermaScan AI — Smart Skin Analyzer';
    const shareText = 'Check out DermaScan AI! An AI-powered skin analysis tool that detects skin concerns and provides personalized skincare recommendations. Try it now!';

    function openShareModal() {
        shareModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeShareModal() {
        shareModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        shareCopyFeedback.classList.remove('visible');
    }

    // Open share modal from floating button
    floatingShareBtn.addEventListener('click', openShareModal);

    // Open share modal from results share button
    shareResultsBtn.addEventListener('click', openShareModal);

    // Close share modal
    shareModalClose.addEventListener('click', closeShareModal);

    // Close on overlay click
    shareModalOverlay.addEventListener('click', (e) => {
        if (e.target === shareModalOverlay) closeShareModal();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && shareModalOverlay.classList.contains('active')) {
            closeShareModal();
        }
    });

    // Share via WhatsApp
    document.getElementById('share-whatsapp').addEventListener('click', () => {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
        window.open(waUrl, '_blank');
    });

    // Share via Twitter / X
    document.getElementById('share-twitter').addEventListener('click', () => {
        const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twUrl, '_blank');
    });

    // Share via LinkedIn
    document.getElementById('share-linkedin').addEventListener('click', () => {
        const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        window.open(liUrl, '_blank');
    });

    // Share via Email
    document.getElementById('share-email').addEventListener('click', () => {
        const mailUrl = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
        window.location.href = mailUrl;
    });

    // Copy Link
    document.getElementById('share-copy').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            shareCopyFeedback.classList.add('visible');
            setTimeout(() => shareCopyFeedback.classList.remove('visible'), 2500);
        } catch (err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = shareUrl;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            shareCopyFeedback.classList.add('visible');
            setTimeout(() => shareCopyFeedback.classList.remove('visible'), 2500);
        }
    });

    // ===== FEEDBACK FUNCTIONALITY =====
    const stars = document.querySelectorAll('.star');
    const ratingInput = document.getElementById('rating-input');
    const feedbackForm = document.getElementById('feedback-form');
    const feedbackSuccess = document.getElementById('feedback-success');
    const newFeedbackBtn = document.getElementById('new-feedback-btn');

    let currentRating = 0;

    // Star rating interaction
    stars.forEach(star => {
        // Click to select rating
        star.addEventListener('click', () => {
            currentRating = parseInt(star.getAttribute('data-value'));
            ratingInput.value = currentRating;
            updateStars(currentRating);
        });

        // Hover effect
        star.addEventListener('mouseover', () => {
            const val = parseInt(star.getAttribute('data-value'));
            highlightStars(val);
        });

        // Reset hover on mouse out
        star.addEventListener('mouseout', () => {
            updateStars(currentRating);
        });
    });

    function highlightStars(val) {
        stars.forEach(s => {
            const sVal = parseInt(s.getAttribute('data-value'));
            if (sVal <= val) {
                s.classList.add('hovered');
            } else {
                s.classList.remove('hovered');
            }
        });
    }

    function updateStars(val) {
        stars.forEach(s => {
            const sVal = parseInt(s.getAttribute('data-value'));
            s.classList.remove('hovered');
            if (sVal <= val) {
                s.classList.add('selected');
            } else {
                s.classList.remove('selected');
            }
        });
    }

    // Form submission
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (currentRating === 0) {
            alert('Please select a star rating.');
            return;
        }

        const comments = document.getElementById('feedback-comments').value.trim();
        if (!comments) {
            alert('Please write a comment.');
            return;
        }

        // Show loading state
        const submitBtn = document.getElementById('submit-feedback-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Sending...';

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: currentRating, comments: comments })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                feedbackForm.style.display = 'none';
                feedbackSuccess.style.display = 'block';
            } else {
                alert(result.error || 'Failed to submit feedback. Please try again.');
            }
        } catch (err) {
            // Fallback: still show success if server is not running (demo mode)
            console.warn('Server not available, running in demo mode:', err);
            feedbackForm.style.display = 'none';
            feedbackSuccess.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-icon">💬</span> Submit Feedback';
        }
    });

    // Send Another button
    newFeedbackBtn.addEventListener('click', () => {
        currentRating = 0;
        ratingInput.value = 0;
        updateStars(0);
        document.getElementById('feedback-comments').value = '';
        feedbackForm.style.display = 'block';
        feedbackSuccess.style.display = 'none';
    });

});
