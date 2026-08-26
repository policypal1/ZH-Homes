"use strict";

const LEAD_API_URL = "/api/bathroom-lead";

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "gbraid",
  "wbraid"
];

function pushTrackingEvent(eventName, details = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    page_path: window.location.pathname,
    ...details
  });
}

function readCurrentAttribution() {
  const params = new URLSearchParams(window.location.search);

  return ATTRIBUTION_KEYS.reduce((result, key) => {
    result[key] = params.get(key) || "";
    return result;
  }, {});
}

function getAttribution() {
  const storageKey = "zhHomesBathroomAttribution";
  const current = readCurrentAttribution();
  const hasCurrentValues = Object.values(current).some(Boolean);

  if (hasCurrentValues) {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(current));
    } catch (error) {
      console.warn("Attribution data could not be saved.", error);
    }
    return current;
  }

  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
    return ATTRIBUTION_KEYS.reduce((result, key) => {
      result[key] = String(saved[key] || "");
      return result;
    }, {});
  } catch (error) {
    return current;
  }
}

function setFormStatus(form, message, type = "") {
  const status = form.querySelector("[data-form-status]");
  if (!status) return;
  status.textContent = message;
  status.className = `form-status ${type}`.trim();
}

function showFormSuccess(form) {
  const container = form.closest(".hero-quick-card, .deck-form-card");
  const overlay = container?.querySelector("[data-success-overlay]");
  if (!overlay) return;

  overlay.classList.add("active");
  overlay.setAttribute("aria-hidden", "false");

  window.setTimeout(() => {
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
  }, 6000);
}

function clearInvalidState(control) {
  if (!(control instanceof HTMLElement)) return;
  control.classList.remove("field-invalid");
  control.closest("fieldset")?.classList.remove("field-invalid-group");
}

function findInvalidControl(step) {
  const controls = Array.from(
    step.querySelectorAll("input, select, textarea")
  ).filter((control) => !control.disabled && control.type !== "hidden");

  const checkedRadioGroups = new Set();

  for (const control of controls) {
    clearInvalidState(control);

    if (control.type === "radio") {
      if (checkedRadioGroups.has(control.name)) continue;
      checkedRadioGroups.add(control.name);

      const group = Array.from(
        step.querySelectorAll(
          `input[type="radio"][name="${CSS.escape(control.name)}"]`
        )
      );

      const isRequired = group.some((radio) => radio.required);
      const hasSelection = group.some((radio) => radio.checked);

      if (isRequired && !hasSelection) {
        group[0]?.closest("fieldset")?.classList.add("field-invalid-group");
        return group[0];
      }
      continue;
    }

    if (!control.checkValidity()) return control;
  }

  return null;
}

function initializeMultiStepForm(form) {
  if (
    !(form instanceof HTMLFormElement) ||
    form.dataset.bathroomFormInitialized === "true"
  ) {
    return;
  }

  form.dataset.bathroomFormInitialized = "true";

  const steps = Array.from(form.querySelectorAll(".estimate-step"));
  const progressLabel = form.querySelector("[data-progress-label]");
  const progressTitle = form.querySelector("[data-progress-title]");
  const progressBar = form.querySelector("[data-progress-bar]");
  const submitButton = form.querySelector(".estimate-submit");

  let currentStep = 0;
  let formStarted = false;
  let isSubmitting = false;

  if (!steps.length) return;

  function updateStep(nextStep, focusHeading = true) {
    currentStep = Math.max(0, Math.min(nextStep, steps.length - 1));

    steps.forEach((step, index) => {
      const isActive = index === currentStep;
      step.hidden = !isActive;
      step.classList.toggle("active", isActive);
    });

    if (progressLabel) {
      progressLabel.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    }

    if (progressTitle) {
      progressTitle.textContent =
        steps[currentStep]?.dataset.stepTitle || "Bathroom estimate";
    }

    if (progressBar) {
      progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    }

    form.querySelectorAll("[data-progress-step]").forEach((marker, index) => {
      marker.classList.toggle("active", index === currentStep);
      marker.classList.toggle("complete", index < currentStep);
      marker.setAttribute(
        "aria-current",
        index === currentStep ? "step" : "false"
      );
    });

    if (focusHeading) {
      const heading = steps[currentStep]?.querySelector(
        ".estimate-step-heading > span"
      );
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }
  }

  function validateStep(step) {
    if (!step) return true;

    const invalidControl = findInvalidControl(step);
    if (!invalidControl) return true;

    invalidControl.classList.add("field-invalid");
    invalidControl.reportValidity?.();
    invalidControl.focus?.({ preventScroll: false });
    return false;
  }

  function trackFormStart() {
    if (formStarted) return;
    formStarted = true;
    pushTrackingEvent("bathroom_form_start", {
      form_name: form.dataset.formSource || "bathroom_estimate"
    });
  }

  form.addEventListener("focusin", trackFormStart, { once: true });

  form.addEventListener("input", (event) => {
    trackFormStart();
    clearInvalidState(event.target);
  });

  form.addEventListener("change", (event) => {
    trackFormStart();
    clearInvalidState(event.target);
  });

  form.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", () => {
      const activeStep = steps[currentStep];
      if (!validateStep(activeStep)) return;

      pushTrackingEvent("bathroom_form_step_complete", {
        form_name: form.dataset.formSource || "bathroom_estimate",
        completed_step: currentStep + 1,
        completed_step_name: activeStep?.dataset.stepTitle || ""
      });

      updateStep(currentStep + 1);
    });
  });

  form.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => {
      updateStep(currentStep - 1);
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting || !validateStep(steps[currentStep])) return;

    const invalidControl = Array.from(form.elements).find(
      (element) =>
        element instanceof HTMLElement &&
        typeof element.checkValidity === "function" &&
        !element.checkValidity()
    );

    if (invalidControl instanceof HTMLElement) {
      const invalidStep = invalidControl.closest(".estimate-step");
      const invalidStepIndex = steps.indexOf(invalidStep);

      if (invalidStepIndex >= 0) {
        updateStep(invalidStepIndex, false);
      }

      invalidControl.reportValidity?.();
      invalidControl.focus?.();
      return;
    }

    const formData = new FormData(form);
    const honeypot = String(formData.get("companyWebsite") || "").trim();

    if (honeypot) {
      form.reset();
      updateStep(0, false);
      showFormSuccess(form);
      return;
    }

    const zipCode = String(formData.get("zipCode") || "").trim();
    const projectType = String(formData.get("projectType") || "").trim();
    const fullName = String(formData.get("fullName") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();

    const description = [
      `Bathroom project: ${projectType || "Not provided"}`,
      `Project ZIP: ${zipCode || "Not provided"}`,
      "Offer: Free bathroom walkthrough + written estimate within 24 hours"
    ].join("\n");

    const originalButtonText =
      submitButton?.textContent || "Get My Free Estimate";

    isSubmitting = true;

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }

      setFormStatus(form, "Sending your request...");

      const payload = {
        source: `ZH Homes Bathroom Landing Page - ${
          form.dataset.formSource || "Bathroom Estimate"
        }`,
        pageUrl: window.location.href,
        submittedAt: new Date().toISOString(),
        contactReason: "bathroom_estimate",
        serviceType: projectType || "Bathroom Remodel",
        fullName,
        email,
        phone,
        description,
        companyWebsite: honeypot,
        projectPhotos: [],
        zipCode,
        projectType,
        attribution: getAttribution()
      };

      const response = await fetch(LEAD_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      let result = null;
      try {
        result = await response.json();
      } catch (error) {
        result = null;
      }

      if (!response.ok || !result?.ok) {
        throw new Error("Lead delivery was not confirmed.");
      }

      form.reset();
      updateStep(0, false);

      setFormStatus(
        form,
        "Thanks. Your bathroom estimate request was submitted.",
        "success"
      );

      showFormSuccess(form);

      // This only fires after the API confirms Apps Script returned "ok".
      pushTrackingEvent("bathroom_lead_submit", {
        form_name: form.dataset.formSource || "bathroom_estimate",
        project_zip: zipCode,
        project_type: projectType
      });
    } catch (error) {
      console.error(error);
      setFormStatus(
        form,
        "Something went wrong. Please call or text ZH Homes at (503) 910-5466.",
        "error"
      );
    } finally {
      isSubmitting = false;

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });

  updateStep(0, false);
}

function initializeAnchorScrolling() {
  const style = document.createElement("style");
  style.id = "bathroom-anchor-offset";
  style.textContent = `
    .bathroom-page main > section[id],
    .bathroom-page [id="hero-estimate"] {
      scroll-margin-top: 112px;
    }
  `;

  if (!document.getElementById(style.id)) {
    document.head.appendChild(style);
  }

  function normalizePath(pathname) {
    return pathname.replace(/\/+$/, "") || "/";
  }

  function getTarget(hash) {
    if (!hash || hash === "#") return null;
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch (error) {
      return document.getElementById(hash.slice(1));
    }
  }

  function getHeaderOffset() {
    const header = document.querySelector(".site-header");
    if (!header) return 20;

    const position = getComputedStyle(header).position;
    const overlapsContent = position === "sticky" || position === "fixed";

    return (overlapsContent ? header.getBoundingClientRect().height : 0) + 20;
  }

  function scrollToHash(hash, behavior = "smooth") {
    const target = getTarget(hash);
    if (!target) return false;

    const top =
      target.getBoundingClientRect().top +
      window.scrollY -
      getHeaderOffset();

    window.scrollTo({
      top: Math.max(0, Math.round(top)),
      behavior
    });

    return true;
  }

  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !(event.target instanceof Element)
    ) {
      return;
    }

    const link = event.target.closest('a[href*="#"]');
    if (!link || link.target === "_blank" || link.hasAttribute("download")) {
      return;
    }

    const destination = new URL(link.href, window.location.href);
    const samePage =
      destination.origin === window.location.origin &&
      normalizePath(destination.pathname) ===
        normalizePath(window.location.pathname) &&
      destination.search === window.location.search;

    if (!samePage || !destination.hash || !getTarget(destination.hash)) {
      return;
    }

    event.preventDefault();
    history.pushState(
      null,
      "",
      `${destination.pathname}${destination.search}${destination.hash}`
    );
    scrollToHash(destination.hash);
  });

  function correctDirectHashVisit() {
    if (!window.location.hash) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToHash(window.location.hash, "auto");
      });
    });
  }

  correctDirectHashVisit();
  window.addEventListener("load", correctDirectHashVisit, { once: true });
  window.addEventListener("pageshow", correctDirectHashVisit);
  window.addEventListener("hashchange", () => {
    scrollToHash(window.location.hash);
  });
  document.fonts?.ready?.then(correctDirectHashVisit);
}

function initializeReviewCarousel() {
  const carousel = document.getElementById("deckReviewCarousel");
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll(".review-slide"));
  const dots = Array.from(carousel.querySelectorAll(".review-dot"));
  const previousButton = carousel.querySelector(".review-arrow.prev");
  const nextButton = carousel.querySelector(".review-arrow.next");
  let currentIndex = 0;

  if (!slides.length) return;

  function showSlide(index) {
    currentIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("active", slideIndex === currentIndex);
    });

    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === currentIndex;
      dot.classList.toggle("active", isActive);
      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });
  }

  previousButton?.addEventListener("click", () => showSlide(currentIndex - 1));
  nextButton?.addEventListener("click", () => showSlide(currentIndex + 1));
  dots.forEach((dot, index) => dot.addEventListener("click", () => showSlide(index)));
  showSlide(0);
}

function initializeServiceCarousel() {
  const section = document.querySelector(".services-section");
  const track = section?.querySelector(".services-grid");
  const cards = Array.from(track?.querySelectorAll(".service-card") || []);

  if (
    !section ||
    !track ||
    cards.length < 2 ||
    section.querySelector(".services-carousel-controls")
  ) {
    return;
  }

  track.setAttribute("tabindex", "0");
  track.setAttribute("aria-label", "Bathroom services carousel");

  const controls = document.createElement("div");
  controls.className = "services-carousel-controls";
  controls.innerHTML = `
    <button class="services-carousel-arrow services-carousel-prev" type="button" aria-label="Previous bathroom service">‹</button>
    <div class="services-carousel-dots" aria-label="Bathroom service navigation"></div>
    <button class="services-carousel-arrow services-carousel-next" type="button" aria-label="Next bathroom service">›</button>
  `;

  const dotsContainer = controls.querySelector(".services-carousel-dots");
  const previousButton = controls.querySelector(".services-carousel-prev");
  const nextButton = controls.querySelector(".services-carousel-next");
  let currentIndex = 0;
  let animationFrame = 0;

  const dots = cards.map((card, index) => {
    const dot = document.createElement("button");
    dot.className = "services-carousel-dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Go to bathroom service ${index + 1}`);
    dot.addEventListener("click", () => scrollToCard(index));
    dotsContainer?.appendChild(dot);
    return dot;
  });

  function updateControls(index) {
    currentIndex = Math.max(0, Math.min(index, cards.length - 1));

    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === currentIndex;
      dot.classList.toggle("active", isActive);
      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });

    if (previousButton) previousButton.disabled = currentIndex === 0;
    if (nextButton) nextButton.disabled = currentIndex === cards.length - 1;
  }

  function getCenteredScrollLeft(index) {
    const card = cards[index];
    if (!card) return 0;

    const requestedLeft =
      card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
    const maximumLeft = Math.max(0, track.scrollWidth - track.clientWidth);

    return Math.max(0, Math.min(requestedLeft, maximumLeft));
  }

  function scrollToCard(index) {
    const targetIndex = Math.max(0, Math.min(index, cards.length - 1));

    track.scrollTo({
      left: getCenteredScrollLeft(targetIndex),
      behavior: "smooth"
    });

    updateControls(targetIndex);
  }

  function findNearestCard() {
    const trackRect = track.getBoundingClientRect();
    const viewportCenter = trackRect.left + trackRect.width / 2;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(cardCenter - viewportCenter);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    updateControls(nearestIndex);
  }

  function requestControlUpdate() {
    if (animationFrame) return;

    animationFrame = requestAnimationFrame(() => {
      animationFrame = 0;
      findNearestCard();
    });
  }

  previousButton?.addEventListener("click", () => scrollToCard(currentIndex - 1));
  nextButton?.addEventListener("click", () => scrollToCard(currentIndex + 1));
  track.addEventListener("scroll", requestControlUpdate, { passive: true });
  track.addEventListener("touchmove", requestControlUpdate, { passive: true });
  track.addEventListener("touchend", () => window.setTimeout(findNearestCard, 40), { passive: true });
  track.addEventListener("pointerup", () => window.setTimeout(findNearestCard, 40), { passive: true });
  window.addEventListener("resize", requestControlUpdate, { passive: true });

  track.insertAdjacentElement("afterend", controls);
  updateControls(0);
}

function initializeMobileStickyCta() {
  const mediaQuery = window.matchMedia("(max-width: 950px)");
  const bar = document.querySelector(".mobile-cta-bar");
  const hero = document.querySelector(".deck-hero");

  if (!bar || !hero) return;

  let animationFrame = 0;

  function updateVisibility() {
    animationFrame = 0;

    if (!mediaQuery.matches) {
      bar.classList.remove("is-visible");
      document.body.classList.remove("sticky-cta-visible");
      bar.setAttribute("aria-hidden", "true");
      return;
    }

    const headerHeight =
      document.querySelector(".site-header")?.offsetHeight || 0;
    const isVisible =
      hero.getBoundingClientRect().bottom <= headerHeight + 6;

    bar.classList.toggle("is-visible", isVisible);
    document.body.classList.toggle("sticky-cta-visible", isVisible);
    bar.setAttribute("aria-hidden", isVisible ? "false" : "true");
  }

  function requestVisibilityUpdate() {
    if (animationFrame) return;
    animationFrame = requestAnimationFrame(updateVisibility);
  }

  window.addEventListener("scroll", requestVisibilityUpdate, { passive: true });
  window.addEventListener("resize", requestVisibilityUpdate, { passive: true });
  mediaQuery.addEventListener?.("change", requestVisibilityUpdate);
  updateVisibility();
}

function initializeCallTracking() {
  document.querySelectorAll(".tracked-call").forEach((link) => {
    link.addEventListener("click", () => {
      pushTrackingEvent("bathroom_phone_click", {
        link_location: link.closest("header")
          ? "header"
          : link.closest(".mobile-cta-bar")
            ? "mobile_sticky_cta"
            : "page"
      });
    });
  });
}

function getCurrentFourDayCutoff(now = new Date()) {
  const anchor = new Date(2026, 7, 24, 0, 0, 0, 0);
  const windowMs = 4 * 24 * 60 * 60 * 1000;

  if (now.getTime() < anchor.getTime()) {
    return new Date(anchor.getTime() + windowMs);
  }

  const elapsed = now.getTime() - anchor.getTime();
  const completedWindows = Math.floor(elapsed / windowMs);

  return new Date(anchor.getTime() + (completedWindows + 1) * windowMs);
}

function initializeFourDayCountdowns() {
  const countdowns = Array.from(
    document.querySelectorAll("[data-four-day-countdown]")
  );

  if (!countdowns.length) return;

  function pad(value) {
    return String(Math.max(0, value)).padStart(2, "0");
  }

  function update() {
    const now = new Date();
    const target = getCurrentFourDayCutoff(now);
    const remaining = Math.max(0, target.getTime() - now.getTime());

    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    countdowns.forEach((countdown) => {
      const daysNode = countdown.querySelector("[data-days]");
      const hoursNode = countdown.querySelector("[data-hours]");
      const minutesNode = countdown.querySelector("[data-minutes]");
      const secondsNode = countdown.querySelector("[data-seconds]");

      if (daysNode) daysNode.textContent = pad(days);
      if (hoursNode) hoursNode.textContent = pad(hours);
      if (minutesNode) minutesNode.textContent = pad(minutes);
      if (secondsNode) secondsNode.textContent = pad(seconds);
    });
  }

  update();
  window.setInterval(update, 1000);
}

function initializeBathroomLandingPage() {
  getAttribution();
  initializeAnchorScrolling();

  document
    .querySelectorAll(".deck-multistep-form")
    .forEach(initializeMultiStepForm);

  initializeReviewCarousel();
  initializeServiceCarousel();
  initializeMobileStickyCta();
  initializeCallTracking();
  initializeFourDayCountdowns();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeBathroomLandingPage, {
    once: true
  });
} else {
  initializeBathroomLandingPage();
}
