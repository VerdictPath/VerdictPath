// Verdict Path Marketing Website - JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            this.classList.toggle('active');
        });
    }

    // Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Close mobile menu if open
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    mobileMenuToggle.classList.remove('active');
                }
            }
        });
    });

    // Scroll Animation for Elements
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all feature cards and testimonials
    document.querySelectorAll('.feature-card, .testimonial, .step, .pricing-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add active state to navigation on scroll
    const sections = document.querySelectorAll('section[id]');
    const navItems = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', function() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${current}`) {
                item.classList.add('active');
            }
        });
    });

    // Add floating animation to treasure chest
    const treasureChest = document.querySelector('.cta-image img');
    if (treasureChest) {
        let position = 0;
        setInterval(() => {
            position += 0.5;
            treasureChest.style.transform = `translateY(${Math.sin(position) * 10}px)`;
        }, 50);
    }

    // Countdown timer for limited time offers (optional)
    function startCountdown(targetDate) {
        const countdownElement = document.getElementById('countdown');
        if (!countdownElement) return;

        const updateCountdown = () => {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                countdownElement.innerHTML = 'Offer Expired';
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            countdownElement.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        };

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    // Parallax effect for hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const heroImage = document.querySelector('.hero-image');
        
        if (heroImage && scrolled < window.innerHeight) {
            heroImage.style.transform = `translateY(${scrolled * 0.3}px)`;
        }
    });

    // Download button tracking (analytics placeholder)
    document.querySelectorAll('.download-btn, .btn-primary').forEach(button => {
        button.addEventListener('click', function(e) {
            // Analytics tracking code would go here
            console.log('Button clicked:', this.textContent.trim());
            
            // Example: Send to analytics
            // gtag('event', 'click', { 'event_category': 'download' });
        });
    });

    // Form submission handler (if you add a contact form)
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            // Send form data to your backend
            console.log('Form submitted:', data);
            
            // Show success message
            alert('Thank you! We\'ll get back to you soon. 🏴‍☠️');
            this.reset();
        });
    }

    // Easter egg: Konami code
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    document.addEventListener('keydown', function(e) {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                document.body.style.transform = 'rotate(180deg)';
                setTimeout(() => {
                    document.body.style.transform = 'rotate(0deg)';
                }, 2000);
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });

    // Pricing plan switcher (if you want monthly/yearly toggle)
    const pricingToggle = document.getElementById('pricing-toggle');
    if (pricingToggle) {
        pricingToggle.addEventListener('change', function() {
            const isYearly = this.checked;
            document.querySelectorAll('.price-amount').forEach(price => {
                const monthly = parseInt(price.dataset.monthly);
                const yearly = monthly * 10; // 2 months free
                price.textContent = isYearly ? yearly : monthly;
            });
            
            document.querySelectorAll('.price-period').forEach(period => {
                period.textContent = isYearly ? '/year' : '/month';
            });
        });
    }
});

// Add styles for mobile menu when active
const style = document.createElement('style');
style.textContent = `
    @media (max-width: 768px) {
        .nav-links.active {
            display: flex;
            flex-direction: column;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background-color: var(--surface);
            padding: 1rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .mobile-menu-toggle.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }
        
        .mobile-menu-toggle.active span:nth-child(2) {
            opacity: 0;
        }
        
        .mobile-menu-toggle.active span:nth-child(3) {
            transform: rotate(-45deg) translate(7px, -6px);
        }
    }
`;
document.head.appendChild(style);
