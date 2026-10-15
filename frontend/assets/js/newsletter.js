/**
 * ANON E-COMMERCE - TIMED POPUP NEWSLETTER CONTROLLER (newsletter.js)
 * Manages newsletter subscription popup dialog with auto-trigger & storage state
 */
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.querySelector('[data-modal]') || document.querySelector('.modal');
  if (!modal) return;

  // Check if user dismissed popup in this session
  const isDismissed = sessionStorage.getItem("anon_newsletter_dismissed");

  if (!isDismissed) {
    // Show newsletter popup 3 seconds after page load
    setTimeout(() => {
      modal.classList.remove("closed");
      modal.classList.add("active");
    }, 3000);
  }

  const closeBtn = modal.querySelector('[data-modal-close]') || modal.querySelector('.modal-close-btn');
  const closeOverlay = modal.querySelector('[data-modal-overlay]') || modal.querySelector('.modal-close-overlay');

  const closeNewsletter = () => {
    modal.classList.add("closed");
    modal.classList.remove("active");
    sessionStorage.setItem("anon_newsletter_dismissed", "1");
  };

  if (closeBtn) closeBtn.addEventListener("click", closeNewsletter);
  if (closeOverlay) closeOverlay.addEventListener("click", closeNewsletter);

  // Form Submission
  const newsletterForm = modal.querySelector("form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const emailInput = newsletterForm.querySelector('input[type="email"]') || newsletterForm.querySelector('input[name="email"]');
      const email = emailInput?.value;
      if (!email) return;

      try {
        const res = await fetch("http://127.0.0.1:5000/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        
        let toastEl = document.getElementById("backend-toast");
        if (toastEl) {
          toastEl.textContent = data.message || "Thank you for subscribing! 📩";
          toastEl.style.display = "block";
          setTimeout(() => toastEl.style.display = "none", 3000);
        }
        closeNewsletter();
      } catch (err) {
        console.error("Newsletter error:", err);
      }
    });
  }
});
