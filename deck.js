"use strict";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxmtBDtQo2n_IlfvZ6WhvB0HkEzNIjQjClzpzAi2-jNFsWNDaL1wqdpfCp7n3tQRJqz/exec";

const GOOGLE_ADS_DECK_QUOTE_SEND_TO =
  "AW-18215005784/HQ8iCKjUzdUcENjcy-1D";

const MAX_IMAGE_FILES = 4;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif"
]);

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

function trackGoogleAdsDeckQuoteConversion() {
  window.dataLayer = window.dataLayer || [];

  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  window.gtag("event", "conversion", {
    send_to: GOOGLE_ADS_DECK_QUOTE_SEND_TO
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
  const storageKey = "zhHomesDeckAttribution";
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

function getFileExtension(fileName) {
  const pieces = String(fileName || "").toLowerCase().split(".");
  return pieces.length > 1 ? pieces.pop() : "";
}

function isAllowedImage(file) {
  const typeIsAllowed = ALLOWED_IMAGE_TYPES.has(file.type);
  const extensionIsAllowed = ALLOWED_IMAGE_EXTENSIONS.has(
    getFileExtension(file.name)
  );

  return typeIsAllowed || (!file.type && extensionIsAllowed);
}

function validateFiles(fileInput, errorElement) {
  const files = Array.from(fileInput?.files || []);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  const invalid =
    files.length > MAX_IMAGE_FILES ||
    totalSize > MAX_TOTAL_IMAGE_SIZE_BYTES ||
    files.some((file) => file.size > MAX_IMAGE_SIZE_BYTES) ||
    files.some((file) => !isAllowedImage(file));

  if (invalid) {
    const message =
      "Upload up to 4 JPG, PNG, WEBP, or GIF images. Each image must be 5MB or smaller.";

    fileInput?.setCustomValidity(message);

    if (errorElement) {
      errorElement.textContent = message;
    }

    return false;
  }

  fileInput?.setCustomValidity("");

  if (errorElement) {
    errorElement.textContent = "";
  }

  return true;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");

      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        base64: result.includes(",") ? result.split(",")[1] : result
      });
    };

    reader.onerror = () => {
      reject(new Error(`Could not read ${file.name}.`));
    };

    reader.readAsDataURL(file);
  });
}

function updateSelectedFiles(form, fileInput) {
  const row = form.querySelector("[data-selected-file-row]");
  const name = form.querySelector("[data-selected-file-name]");
  const files = Array.from(fileInput?.files || []);

  if (!row || !name) {
    return;
  }

  if (!files.length) {
    name.textContent = "";
    row.hidden = true;
    return;
  }

  name.textContent =
    files.length === 1
      ? files[0].name
      : `${files.length} images selected`;

  row.hidden = false;
}

function setFormStatus(form, message, type = "") {
  const status = form.querySelector("[data-form-status]");

  if (!status) {
    return;
  }

  status.textContent = message;
  status.className = `form-status ${type}`.trim();
}

function showFormSuccess(form) {
  const container = form.closest(".hero-quick-card, .deck-form-card");
  const overlay = container?.querySelector("[data-success-overlay]");

  if (!overlay) {
    return;
  }

  overlay.classList.add("active");
  overlay.setAttribute("aria-hidden", "false");

  window.setTimeout(() => {
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
  }, 6000);
}

function clearInvalidState(control) {
  if (!(control instanceof HTMLElement)) {
    return;
  }

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
      if (checkedRadioGroups.has(control.name)) {
        continue;
      }

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

    if (!control.checkValidity()) {
      return control;
    }
  }

  return null;
}

function getRadioValue(formData, fieldName) {
  return String(formData.get(fieldName) || "").trim();
}

function scoreLead(details) {
  let score = 0;
  const signals = [];

  if (details.homeownerStatus === "Yes, homeowner") {
    score += 2;
    signals.push("Confirmed homeowner");
  } else {
    signals.push("Homeowner status needs review");
  }

  if (
    details.currentSetup === "No deck / grass outside" ||
    details.currentSetup === "Existing deck to remove"
  ) {
    score += 2;
    signals.push("Clear full-project setup");
  } else if (details.currentSetup) {
    score += 1;
    signals.push("Existing setup provided");
  }

  if (details.materialPreference) {
    score += 1;
    signals.push("Material preference provided");
  }

  if (details.deckSize && details.deckSize !== "Need help sizing") {
    score += 1;
    signals.push("Approximate size provided");
  } else if (details.deckSize) {
    signals.push("Needs sizing help");
  }

  if (details.newDeckConfirmation) {
    score += 2;
    signals.push("Confirmed new-deck request");
  }

  if (details.projectDetails.length >= 40) {
    score += 1;
    signals.push("Useful project description");
  }

  if (details.projectPhotoCount > 0) {
    score += 1;
    signals.push("Backyard photos included");
  }

  let tier = "Needs review";

  if (score >= 8) {
    tier = "High intent";
  } else if (score >= 5) {
    tier = "Potential fit";
  }

  return { score, tier, signals };
}

function initializeMultiStepForm(form) {
  if (
    !(form instanceof HTMLFormElement) ||
    form.dataset.deckFormInitialized === "true"
  ) {
    return;
  }

  form.dataset.deckFormInitialized = "true";

  const steps = Array.from(form.querySelectorAll(".estimate-step"));
  const progressLabel = form.querySelector("[data-progress-label]");
  const progressTitle = form.querySelector("[data-progress-title]");
  const progressBar = form.querySelector("[data-progress-bar]");
  const fileInput = form.querySelector("[data-project-photo]");
  const fileError = form.querySelector("[data-file-error]");
  const clearFilesButton = form.querySelector("[data-clear-files]");
  const submitButton = form.querySelector(".estimate-submit");

  let currentStep = 0;
  let formStarted = false;
  let isSubmitting = false;

  if (!steps.length) {
    return;
  }

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
        steps[currentStep]?.dataset.stepTitle || "Free deck estimate";
    }

    if (progressBar) {
      progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    }

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
    if (!step) {
      return true;
    }

    if (
      fileInput &&
      step.contains(fileInput) &&
      !validateFiles(fileInput, fileError)
    ) {
      fileInput.focus();
      return false;
    }

    const invalidControl = findInvalidControl(step);

    if (!invalidControl) {
      return true;
    }

    invalidControl.classList.add("field-invalid");
    invalidControl.reportValidity();
    invalidControl.focus({ preventScroll: false });
    return false;
  }

  function trackFormStart() {
    if (formStarted) {
      return;
    }

    formStarted = true;

    pushTrackingEvent("deck_form_start", {
      form_name: form.dataset.formSource || "deck_estimate"
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

      if (!validateStep(activeStep)) {
        return;
      }

      pushTrackingEvent("deck_form_step_complete", {
        form_name: form.dataset.formSource || "deck_estimate",
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

  fileInput?.addEventListener("change", () => {
    validateFiles(fileInput, fileError);
    updateSelectedFiles(form, fileInput);
  });

  clearFilesButton?.addEventListener("click", () => {
    if (!fileInput) {
      return;
    }

    fileInput.value = "";
    fileInput.setCustomValidity("");

    if (fileError) {
      fileError.textContent = "";
    }

    updateSelectedFiles(form, fileInput);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting || !validateStep(steps[currentStep])) {
      return;
    }

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

    if (fileInput && !validateFiles(fileInput, fileError)) {
      fileInput.focus();
      return;
    }

    const formData = new FormData(form);
    const honeypot = String(formData.get("companyWebsite") || "").trim();

    if (honeypot) {
      form.reset();
      updateSelectedFiles(form, fileInput);
      updateStep(0, false);
      showFormSuccess(form);
      return;
    }

    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(APPS_SCRIPT_URL)) {
      setFormStatus(
        form,
        "The form is not connected. Please call or text ZH Homes at (503) 910-5466.",
        "error"
      );
      return;
    }

    const detailsText = String(formData.get("projectDetails") || "").trim();
    const selectedFiles = Array.from(fileInput?.files || []);

    const details = {
      homeownerStatus: getRadioValue(formData, "homeownerStatus"),
      zipCode: String(formData.get("zipCode") || "").trim(),
      currentSetup: String(formData.get("currentSetup") || "").trim(),
      materialPreference: getRadioValue(formData, "materialPreference"),
      deckSize: String(formData.get("deckSize") || "").trim(),
      projectDetails: detailsText || "No additional details provided.",
      contactPreference: getRadioValue(formData, "contactPreference"),
      newDeckConfirmation:
        formData.get("newDeckConfirmation") === "Confirmed new deck project",
      projectPhotoCount: selectedFiles.length
    };

    const qualification = scoreLead(details);

    const description = [
      `Lead quality: ${qualification.tier} (${qualification.score}/10)`,
      `Qualification signals: ${qualification.signals.join(", ") || "None"}`,
      `Homeowner status: ${details.homeownerStatus}`,
      `Project ZIP: ${details.zipCode}`,
      `Current backyard setup: ${details.currentSetup}`,
      `Material preference: ${details.materialPreference}`,
      `Approximate deck size: ${details.deckSize}`,
      `Backyard photos attached: ${details.projectPhotoCount}`,
      `Preferred contact method: ${details.contactPreference}`,
      `Confirmed new deck construction: ${details.newDeckConfirmation ? "Yes" : "No"}`,
      `Offer requested: Free on-site deck planning visit`,
      `Estimate promise: Written estimate within 48 hours after site visit`,
      `Project details: ${details.projectDetails}`
    ].join("\n");

    const originalButtonText =
      submitButton?.textContent || "Request My Free Site Visit";

    isSubmitting = true;

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }

      setFormStatus(form, "Sending your request...");

      const projectPhotos = await Promise.all(
        selectedFiles.map(readFileAsBase64)
      );

      const payload = {
        source: `ZH Homes Deck Landing Page - ${
          form.dataset.formSource || "Free On-Site Deck Estimate"
        }`,
        pageUrl: window.location.href,
        submittedAt: new Date().toISOString(),
        contactReason: "free_on_site_deck_estimate",
        serviceType: "New Deck Construction",
        offerName: "Free On-Site Deck Planning Visit",
        estimateTurnaround: "Within 48 hours after site visit",
        fullName: String(formData.get("fullName") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        description,
        companyWebsite: honeypot,
        projectPhotos,
        leadQualityTier: qualification.tier,
        leadQualityScore: qualification.score,
        qualificationSignals: qualification.signals,

        // Kept as blank values for compatibility with the existing Apps Script.
        desiredFeatures: [],
        projectTiming: "",
        budgetRange: "",

        ...details,
        attribution: getAttribution()
      };

      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      form.reset();
      updateSelectedFiles(form, fileInput);
      updateStep(0, false);

      setFormStatus(
        form,
        "Thanks. Your free on-site deck visit request was submitted.",
        "success"
      );

      showFormSuccess(form);

      pushTrackingEvent("deck_lead_submit", {
        form_name: form.dataset.formSource || "deck_estimate",
        offer_name: "free_on_site_deck_planning_visit",
        homeowner_status: details.homeownerStatus,
        project_zip: details.zipCode,
        current_setup: details.currentSetup,
        material_preference: details.materialPreference,
        deck_size: details.deckSize,
        photo_count: details.projectPhotoCount,
        contact_preference: details.contactPreference,
        lead_quality_tier: qualification.tier,
        lead_quality_score: qualification.score
      });

      trackGoogleAdsDeckQuoteConversion();
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
  style.id = "deck-anchor-offset";
  style.textContent = `
    .deck-page main > section[id],
    .deck-page [id="hero-estimate"] {
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
    if (!hash || hash === "#") {
      return null;
    }

    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch (error) {
      return document.getElementById(hash.slice(1));
    }
  }

  function getHeaderOffset() {
    const header = document.querySelector(".site-header");

    if (!header) {
      return 20;
    }

    const position = getComputedStyle(header).position;
    const overlapsContent = position === "sticky" || position === "fixed";

    return (overlapsContent ? header.getBoundingClientRect().height : 0) + 20;
  }

  function scrollToHash(hash, behavior = "smooth") {
    const target = getTarget(hash);

    if (!target) {
      return false;
    }

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
    if (!window.location.hash) {
      return;
    }

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
  window.setTimeout(correctDirectHashVisit, 250);
  window.setTimeout(correctDirectHashVisit, 1000);
}

function initializeReviewCarousel() {
  const carousel = document.getElementById("deckReviewCarousel");

  if (!carousel) {
    return;
  }

  const slides = Array.from(carousel.querySelectorAll(".review-slide"));
  const dots = Array.from(carousel.querySelectorAll(".review-dot"));
  const previousButton = carousel.querySelector(".review-arrow.prev");
  const nextButton = carousel.querySelector(".review-arrow.next");
  let currentIndex = 0;

  if (!slides.length) {
    return;
  }

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

  previousButton?.addEventListener("click", () => {
    showSlide(currentIndex - 1);
  });

  nextButton?.addEventListener("click", () => {
    showSlide(currentIndex + 1);
  });

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      showSlide(index);
    });
  });

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
  track.setAttribute("aria-label", "Deck services carousel");

  const controls = document.createElement("div");
  controls.className = "services-carousel-controls";
  controls.innerHTML = `
    <button class="services-carousel-arrow services-carousel-prev" type="button" aria-label="Previous deck service">‹</button>
    <div class="services-carousel-dots" aria-label="Deck service navigation"></div>
    <button class="services-carousel-arrow services-carousel-next" type="button" aria-label="Next deck service">›</button>
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
    dot.setAttribute("aria-label", `Go to deck service ${index + 1}`);
    dot.addEventListener("click", () => {
      scrollToCard(index);
    });
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

    if (previousButton) {
      previousButton.disabled = currentIndex === 0;
    }

    if (nextButton) {
      nextButton.disabled = currentIndex === cards.length - 1;
    }
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
    if (animationFrame) {
      return;
    }

    animationFrame = requestAnimationFrame(() => {
      animationFrame = 0;
      findNearestCard();
    });
  }

  function getCenteredScrollLeft(index) {
    const card = cards[index];

    if (!card) {
      return 0;
    }

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

  previousButton?.addEventListener("click", () => {
    scrollToCard(currentIndex - 1);
  });

  nextButton?.addEventListener("click", () => {
    scrollToCard(currentIndex + 1);
  });

  track.addEventListener("scroll", requestControlUpdate, { passive: true });
  track.addEventListener("touchmove", requestControlUpdate, { passive: true });
  track.addEventListener(
    "touchend",
    () => window.setTimeout(findNearestCard, 40),
    { passive: true }
  );
  track.addEventListener(
    "pointerup",
    () => window.setTimeout(findNearestCard, 40),
    { passive: true }
  );
  window.addEventListener("resize", requestControlUpdate, { passive: true });

  track.insertAdjacentElement("afterend", controls);
  updateControls(0);
}

function replaceVisibleLinkText(link, label) {
  if (!link) {
    return;
  }

  const textNode = Array.from(link.childNodes).find(
    (node) =>
      node.nodeType === Node.TEXT_NODE &&
      node.textContent.trim()
  );

  if (textNode) {
    textNode.textContent = ` ${label}`;
  } else {
    link.append(document.createTextNode(` ${label}`));
  }
}

function initializeMobileStickyCta() {
  const mediaQuery = window.matchMedia("(max-width: 950px)");
  const bar = document.querySelector(".mobile-cta-bar");
  const hero = document.querySelector(".deck-hero");

  if (!bar || !hero) {
    return;
  }

  replaceVisibleLinkText(bar.querySelector(".cta-quote"), "Free Site Visit");
  replaceVisibleLinkText(
    bar.querySelector(".cta-call"),
    "Call 503-910-5466"
  );

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
    if (animationFrame) {
      return;
    }

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
      pushTrackingEvent("deck_phone_click", {
        link_location: link.closest("header")
          ? "header"
          : link.closest(".mobile-cta-bar")
            ? "mobile_sticky_cta"
            : "page"
      });
    });
  });
}

function initializeDeckLandingPage() {
  getAttribution();
  initializeAnchorScrolling();

  document
    .querySelectorAll(".deck-multistep-form")
    .forEach(initializeMultiStepForm);

  initializeReviewCarousel();
  initializeServiceCarousel();
  initializeMobileStickyCta();
  initializeCallTracking();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeDeckLandingPage, {
    once: true
  });
} else {
  initializeDeckLandingPage();
}
