// UI Interactivity, Hero Carousel Circular Arrows & Shelf Animations
document.addEventListener("DOMContentLoaded", () => {
  // 1. Accordion toggle functionality for sidebar
  const accordionBtn = document.querySelectorAll('[data-accordion-btn]');
  const accordion = document.querySelectorAll('[data-accordion]');

  for (let i = 0; i < accordionBtn.length; i++) {
    accordionBtn[i].addEventListener('click', function () {
      const clickedBtn = this.nextElementSibling.classList.contains('active');
      for (let i = 0; i < accordion.length; i++) {
        if (clickedBtn) break;
        if (accordion[i].classList.contains('active')) {
          accordion[i].classList.remove('active');
          accordionBtn[i].classList.remove('active');
        }
      }
      this.nextElementSibling.classList.toggle('active');
      this.classList.toggle('active');
    });
  }

  // 2. HERO SLIDER CIRCULAR ARROWS (PREV & NEXT)
  const sliderContainer = document.querySelector(".slider-container");
  const prevBtn = document.querySelector(".slider-arrow-btn.prev");
  const nextBtn = document.querySelector(".slider-arrow-btn.next");

  if (sliderContainer) {
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        sliderContainer.scrollBy({ left: -sliderContainer.clientWidth, behavior: "smooth" });
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        sliderContainer.scrollBy({ left: sliderContainer.clientWidth, behavior: "smooth" });
      });
    }
  }

  // 3. INFINITE SCROLL-DRIVEN PARALLAX PRODUCT SHELF ROWS
  // Top row moves Right, Middle moves Left, Bottom moves Right on scroll down; reverses on scroll up.
  // Modulo wrapping guarantees the lines NEVER end or run out of products!
  const minimalShowcases = document.querySelectorAll(".product-minimal .product-showcase");
  const wrappers = Array.from(minimalShowcases).map(sc => sc.querySelector(".showcase-wrapper")).filter(Boolean);

  if (wrappers.length >= 3) {
    const setWidths = [];

    // Duplicate 4 times to ensure seamless endless continuity
    wrappers.forEach((w, idx) => {
      const original = w.innerHTML;
      const initialWidth = w.scrollWidth || 2400;
      setWidths[idx] = initialWidth;
      w.innerHTML = original + original + original + original;
    });

    let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    let targetScroll = currentScroll;
    let isTicking = false;

    // Speeds: Top moves Right (+1.2), Middle moves Left (-1.2), Bottom moves Right (+1.2)
    const speeds = [1.2, -1.2, 1.2];
    const phaseOffsets = [0, 0, 0.4];

    function wrapModulo(val, max) {
      if (max <= 0) return 0;
      let res = val % max;
      if (res < 0) res += max;
      return res;
    }

    function applyShelfParallax() {
      // Smooth lerp
      currentScroll += (targetScroll - currentScroll) * 0.18;
      if (Math.abs(targetScroll - currentScroll) < 0.2) {
        currentScroll = targetScroll;
      }

      wrappers.forEach((wrapper, i) => {
        const setWidth = setWidths[i] || 2400;
        const speed = speeds[i] || 1.2;
        const phase = (phaseOffsets[i] || 0) * setWidth;

        let xTranslate = 0;
        if (speed > 0) {
          // Moves Right on scroll down (offset increases)
          // Wraps continuously in [-setWidth, 0]
          const progress = wrapModulo((currentScroll * speed) + phase, setWidth);
          xTranslate = progress - setWidth;
        } else {
          // Moves Left on scroll down (offset decreases)
          // Wraps continuously in [-setWidth, 0]
          const progress = wrapModulo((-currentScroll * speed) + phase, setWidth);
          xTranslate = -progress;
        }

        wrapper.style.transform = `translate3d(${xTranslate}px, 0, 0)`;
      });

      if (Math.abs(targetScroll - currentScroll) >= 0.2) {
        requestAnimationFrame(applyShelfParallax);
      } else {
        isTicking = false;
      }
    }

    window.addEventListener("scroll", () => {
      targetScroll = window.pageYOffset || document.documentElement.scrollTop;
      if (!isTicking) {
        isTicking = true;
        requestAnimationFrame(applyShelfParallax);
      }
    }, { passive: true });

    // Initial render
    applyShelfParallax();
  }

  // 4. SMART SCROLL SEARCH HEADER (SLIDES UP ON SCROLL DOWN, SLIDES DOWN ON SCROLL UP)
  let lastScrollY = window.scrollY;
  const headerMain = document.querySelector(".header-main");

  if (headerMain) {
    window.addEventListener("scroll", () => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY) < 6) return;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        headerMain.classList.add("header-hidden");
        headerMain.classList.remove("header-visible");
      } else if (currentScrollY < lastScrollY) {
        headerMain.classList.remove("header-hidden");
        headerMain.classList.add("header-visible");
      }

      lastScrollY = currentScrollY;
    }, { passive: true });
  }
});
