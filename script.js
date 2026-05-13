const icons = window.lucide;

if (icons) {
  icons.createIcons();
}

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

if (!reducedMotionQuery.matches) {
  document.documentElement.classList.add("motion-ready");

  const revealSelectors = [
    ".scenario-strip span",
    ".section-title",
    ".use-case-grid article",
    ".advantage-grid article",
    ".vibekey-feature-grid article",
    ".requirements-card",
    ".pricing-card",
    ".hardware-card",
    ".testimonial-grid figure",
    ".service-card",
    ".license-card",
    ".download-feature-grid article",
    ".process-grid article",
    ".download-band",
  ].join(",");

  const revealItems = Array.from(document.querySelectorAll(revealSelectors));

  revealItems.forEach((item) => {
    const siblings = Array.from(item.parentElement?.children || []);
    const localIndex = Math.max(0, siblings.indexOf(item));
    const delay = Math.min((localIndex % 6) * 70, 350);

    item.classList.add("reveal");
    item.style.setProperty("--reveal-delay", `${delay}ms`);

    if (item.matches(".section-title, .scenario-strip span, .requirements-card, .download-band")) {
      item.classList.add("reveal-soft");
    } else if (siblings.length > 1 && localIndex % 2 === 0) {
      item.classList.add("reveal-left");
    } else if (siblings.length > 1) {
      item.classList.add("reveal-right");
    }
  });

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12,
      },
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const parallaxImages = Array.from(document.querySelectorAll(".use-case-grid img"));
  let parallaxQueued = false;

  const updateParallax = () => {
    parallaxQueued = false;

    const backgroundY = Math.max(-72, window.scrollY * -0.055);
    document.documentElement.style.setProperty("--parallax-y", `${backgroundY}px`);

    const viewportCenter = window.innerHeight / 2;
    parallaxImages.forEach((image) => {
      const rect = image.getBoundingClientRect();

      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        return;
      }

      const imageCenter = rect.top + rect.height / 2;
      const distance = (imageCenter - viewportCenter) / viewportCenter;
      const mediaY = Math.max(-10, Math.min(10, distance * -8));
      image.style.setProperty("--media-y", `${mediaY}px`);
    });
  };

  const requestParallax = () => {
    if (parallaxQueued) {
      return;
    }

    parallaxQueued = true;
    window.requestAnimationFrame(updateParallax);
  };

  updateParallax();
  window.addEventListener("scroll", requestParallax, { passive: true });
  window.addEventListener("resize", requestParallax);
}

const purchaseForm = document.querySelector("[data-purchase-form]");
const purchaseMessage = document.querySelector("[data-purchase-message]");
const recoverForm = document.querySelector("[data-recover-form]");
const recoverMessage = document.querySelector("[data-recover-message]");
const unlinkForm = document.querySelector("[data-unlink-form]");
const unlinkMessage = document.querySelector("[data-unlink-message]");

const isLiveApiEnabled = (form) => form?.dataset.api === "live" || window.location.port === "8000";

purchaseForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(purchaseForm);
  const email = String(formData.get("email") || "").trim();

  if (!email) {
    purchaseMessage.textContent = "Enter the email address that should receive the license key.";
    return;
  }

  purchaseMessage.textContent = "Creating checkout...";

  const liveApiEnabled = isLiveApiEnabled(purchaseForm);

  if (!liveApiEnabled) {
    purchaseMessage.textContent = `Static preview: after submitting ${email}, production checkout will generate a payment QR and email the license key to this address.`;
    return;
  }

  try {
    const response = await fetch("/api/v1/purchases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error("purchase request failed");
    }

    const purchase = await response.json();
    const action = purchase.checkout_url || purchase.wechat_qr_url || "/purchase";
    purchaseMessage.innerHTML = `Checkout created. <a href="${action}">Open the payment page</a>. After payment, the license key will be sent to ${email}.`;
  } catch {
    purchaseMessage.textContent = `Static preview: after submitting ${email}, production checkout will generate a payment QR and email the license key to this address.`;
  }
});

recoverForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!recoverForm.reportValidity()) {
    return;
  }

  const formData = new FormData(recoverForm);
  const email = String(formData.get("email") || "").trim();

  recoverMessage.textContent = "Looking up your purchase email...";

  if (!isLiveApiEnabled(recoverForm)) {
    recoverMessage.textContent = `If ${email} matches a purchase, the CDKEY will be emailed immediately.`;
    return;
  }

  try {
    const response = await fetch("/api/v1/licenses/recover", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error("recover request failed");
    }

    recoverMessage.textContent = `If ${email} matches a purchase, the CDKEY has been sent.`;
  } catch {
    recoverMessage.textContent = `If ${email} matches a purchase, the CDKEY will be emailed immediately.`;
  }
});

unlinkForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!unlinkForm.reportValidity()) {
    return;
  }

  const formData = new FormData(unlinkForm);
  const email = String(formData.get("email") || "").trim();
  const cdkey = String(formData.get("cdkey") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const adminEmail = unlinkForm.dataset.adminEmail || "support@vibekey.vibapp.ai";
  const body = [
    "Damaged device unlink request",
    "",
    `Contact email: ${email}`,
    `CDKEY: ${cdkey}`,
    "",
    "What happened:",
    note || "The device was damaged and can no longer be connected.",
  ].join("\n");
  const mailto = `mailto:${adminEmail}?subject=${encodeURIComponent("VibeKey damaged device unlink request")}&body=${encodeURIComponent(body)}`;

  unlinkMessage.textContent = "";
  unlinkMessage.append("Admin review is not real time. ");

  const link = document.createElement("a");
  link.href = mailto;
  link.textContent = "Open email draft";
  unlinkMessage.append(link, " to send the request.");
});
