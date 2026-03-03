/* ═══════════════════════════════════════════════════════════════
   SOVEREIGN — Landing Page & Particle System
   Ambient floating particles + landing page transition logic
   ═══════════════════════════════════════════════════════════════ */

(function () {
    // ─── Particle Canvas ───
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.5 + 0.1;
            this.hue = Math.random() > 0.5 ? 210 : 190; // Blue-cyan range
            this.pulseSpeed = Math.random() * 0.02 + 0.005;
            this.pulsePhase = Math.random() * Math.PI * 2;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.pulsePhase += this.pulseSpeed;
            const pulsedOpacity = this.opacity + Math.sin(this.pulsePhase) * 0.15;

            if (this.x < -10) this.x = canvas.width + 10;
            if (this.x > canvas.width + 10) this.x = -10;
            if (this.y < -10) this.y = canvas.height + 10;
            if (this.y > canvas.height + 10) this.y = -10;

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 70%, 60%, ${Math.max(0, pulsedOpacity)})`;
            ctx.fill();
        }
    }

    // Create particles
    const count = Math.min(80, Math.floor(window.innerWidth * window.innerHeight / 15000));
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }

    // Draw lines between nearby particles
    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    const opacity = (1 - dist / 120) * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(99, 179, 237, ${opacity})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => p.update());
        drawConnections();
        animId = requestAnimationFrame(animate);
    }

    animate();

    // ─── Landing Page Logic ───
    const landingPage = document.getElementById('landing-page');
    const playBtn = document.getElementById('landing-play-btn');
    const aboutBtn = document.getElementById('landing-about-btn');

    // If user already has a token, skip landing page
    if (localStorage.getItem('sovereign_token')) {
        if (landingPage) landingPage.classList.add('hidden');
        cancelAnimationFrame(animId);
    }

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            landingPage.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            landingPage.style.opacity = '0';
            landingPage.style.transform = 'scale(1.05)';
            setTimeout(() => {
                landingPage.classList.add('hidden');
                cancelAnimationFrame(animId);
            }, 500);
        });
    }

    if (aboutBtn) {
        aboutBtn.addEventListener('click', () => {
            // Smooth scroll to features or show info
            const features = document.querySelector('.landing-features');
            if (features) {
                features.scrollIntoView({ behavior: 'smooth' });
                features.querySelectorAll('.landing-feature').forEach((f, i) => {
                    f.style.animation = 'none';
                    f.offsetHeight; // trigger reflow
                    f.style.animation = `pulse 0.6s ease ${i * 0.15}s`;
                });
            }
        });
    }

    // ─── Loading Spinner Helper ───
    // Add spinner overlay to body  
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);

    // Global helpers to show/hide spinner
    window.showSpinner = function () {
        overlay.classList.add('active');
    };
    window.hideSpinner = function () {
        overlay.classList.remove('active');
    };
})();
