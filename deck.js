const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwzBw-XwcN0DjhyT_vcgbfwu3LrgqBNozlXW9DYo7vV9qt7sMKqxRVdz1egs-8yVZ0Q/exec";

const MAX_IMAGE_FILES = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_IMAGE_SIZE = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

function pushTrackingEvent(eventName, details = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...details });
}

function getAttribution() {
  const params = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"];

  return keys.reduce((result, key) => {
    result[key] = params.get(key) || "";
    return result;
  }, {});
}

function getFileExtension(fileName) {
  const parts = String(fileName || "").toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function isAllowedImage(file) {
  const typeAllowed = ALLOWED_IMAGE_TYPES.includes(file.type);
  const extensionAllowed = ALLOWED_IMAGE_EXTENSIONS.includes(getFileExtension(file.name));
  return typeAllowed || (!file.type && extensionAllowed);
}

function validateFiles(fileInput, errorElement) {
  const files = Array.from(fileInput?.files || []);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const hasInvalidType = files.some((file) => !isAllowedImage(file));
  const hasOversizedFile = files.some((file) => file.size > MAX_IMAGE_SIZE);
  const invalid =
    files.length > MAX_IMAGE_FILES ||
    totalSize > MAX_TOTAL_IMAGE_SIZE ||
    hasInvalidType ||
    hasOversizedFile;

  if (invalid) {
    const message = "Upload up to 4 JPG, PNG, WEBP, or GIF images. Each image must be 5MB or smaller.";
    fileInput?.setCustomValidity(message);
    if (errorElement) errorElement.textContent = message;
    return false;
  }

  fileInput?.setCustomValidity("");
  if (errorElement) errorElement.textContent = "";
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

    reader.onerror = () => reject(new Error("Could not read an uploaded image."));
    reader.readAsDataURL(file);
  });
}

function findInvalidControl(step) {
  const controls = Array.from(step.querySelectorAll("input, select, textarea")).filter(
    (control) => !control.disabled && control.type !== "hidden"
  );

  const checkedRadioGroups = new Set();

  for (const control of controls) {
    control.classList.remove("field-invalid");

    if (control.type === "radio") {
      if (checkedRadioGroups.has(control.name)) continue;
      checkedRadioGroups.add(control.name);

      const group = Array.from(
        step.querySelectorAll(`input[type="radio"][name="${CSS.escape(control.name)}"]`)
      );
      const required = group.some((radio) => radio.required);
      const checked = group.some((radio) => radio.checked);

      if (required && !checked) return group[0];
      continue;
    }

    if (!control.checkValidity()) return control;
  }

  return null;
}

function updateSelectedFiles(form, fileInput) {
  const row = form.querySelector("[data-selected-file-row]");
  const name = form.querySelector("[data-selected-file-name]");
  const files = Array.from(fileInput?.files || []);

  if (!row || !name) return;

  if (!files.length) {
    name.textContent = "";
    row.hidden = true;
    return;
  }

  name.textContent = files.length === 1 ? files[0].name : `${files.length} images selected`;
  row.hidden = false;
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
  }, 5000);
}

function setFormStatus(form, message, type = "") {
  const status = form.querySelector("[data-form-status]");
  if (!status) return;

  status.textContent = message;
  status.className = `form-status ${type}`.trim();
}

function simplifyDeckEstimateForm(form) {
  /* Remove questions that are not needed for the first estimate request. */
  form.querySelector('input[name="homeownerStatus"]')?.closest("fieldset")?.remove();
  form.querySelector('input[name="desiredFeatures"]')?.closest("fieldset")?.remove();
  form.querySelector('input[name="contactPreference"]')?.closest("fieldset")?.remove();
  form.querySelector(".campaign-confirmation")?.remove();

  /* Remove the entire timing and budget step. */
  form.querySelector('input[name="projectTiming"]')?.closest(".estimate-step")?.remove();

  /* Keep only Wood, Composite, and Not sure yet. */
  form
    .querySelector('input[name="materialPreference"][value="Compare both"]')
    ?.closest("label")
    ?.remove();

  /* Notes and photos are optional. */
  const detailsField = form.querySelector('textarea[name="projectDetails"]');
  if (detailsField) {
    detailsField.required = false;
    detailsField.removeAttribute("required");
    detailsField.removeAttribute("minlength");
    detailsField.placeholder = "Anything else Zach should know about the yard or the deck? Optional.";

    const detailsLabel = form.querySelector(`label[for="${detailsField.id}"]`);
    if (detailsLabel) detailsLabel.textContent = "Additional project notes (optional)";
  }

  /* Rewrite the remaining four steps with short, direct labels. */
  const remainingSteps = Array.from(form.querySelectorAll(".estimate-step"));
  const stepCopy = [
    ["Contact information", "How can Zach reach you?"],
    ["Project location", "Where is the deck project?"],
    ["Deck basics", "What kind of deck are you considering?"],
    ["Optional details", "Anything else Zach should know?"]
  ];

  remainingSteps.forEach((step, index) => {
    const copy = stepCopy[index];
    if (!copy) return;

    step.dataset.stepTitle = copy[0];
    const heading = step.querySelector(".estimate-step-heading > span");
    if (heading) heading.textContent = copy[1];
    step.querySelector(".estimate-step-heading p")?.remove();
  });

  const successMessage = form
    .closest(".hero-quick-card, .deck-form-card")
    ?.querySelector("[data-success-overlay] p");

  if (successMessage) {
    successMessage.textContent =
      "Thanks. Zach will review your deck request and follow up using the phone number or email you provided.";
  }
}

function initializeMultiStepForm(form) {
  simplifyDeckEstimateForm(form);

  const steps = Array.from(form.querySelectorAll(".estimate-step"));
  const progressLabel = form.querySelector("[data-progress-label]");
  const progressTitle = form.querySelector("[data-progress-title]");
  const progressBar = form.querySelector("[data-progress-bar]");
  const fileInput = form.querySelector("[data-project-photo]");
  const fileError = form.querySelector("[data-file-error]");
  const clearFilesButton = form.querySelector("[data-clear-files]");
  let currentStep = 0;

  if (!steps.length) return;

  function updateStep(nextStep, shouldFocus = true) {
    currentStep = Math.max(0, Math.min(nextStep, steps.length - 1));

    steps.forEach((step, index) => {
      const active = index === currentStep;
      step.hidden = !active;
      step.classList.toggle("active", active);
    });

    if (progressLabel) progressLabel.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    if (progressTitle) progressTitle.textContent = steps[currentStep]?.dataset.stepTitle || "Deck estimate";
    if (progressBar) progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;

    if (shouldFocus) {
      const heading = steps[currentStep]?.querySelector(".estimate-step-heading > span");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
    }
  }

  function validateCurrentStep() {
    const step = steps[currentStep];
    if (!step) return true;

    if (fileInput && step.contains(fileInput) && !validateFiles(fileInput, fileError)) {
      fileInput.focus();
      return false;
    }

    const invalidControl = findInvalidControl(step);
    if (!invalidControl) return true;

    invalidControl.classList.add("field-invalid");
    invalidControl.reportValidity();
    invalidControl.focus({ preventScroll: false });
    return false;
  }

  form.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!validateCurrentStep()) return;
      updateStep(currentStep + 1);
    });
  });

  form.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => updateStep(currentStep - 1));
  });

  form.addEventListener("input", (event) => {
    if (event.target instanceof HTMLElement) event.target.classList.remove("field-invalid");
  });

  form.addEventListener("change", (event) => {
    if (event.target instanceof HTMLElement) event.target.classList.remove("field-invalid");
  });

  fileInput?.addEventListener("change", () => {
    validateFiles(fileInput, fileError);
    updateSelectedFiles(form, fileInput);
  });

  clearFilesButton?.addEventListener("click", () => {
    if (!fileInput) return;
    fileInput.value = "";
    fileInput.setCustomValidity("");
    if (fileError) fileError.textContent = "";
    updateSelectedFiles(form, fileInput);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validateCurrentStep()) return;

    const invalidControl = Array.from(form.elements).find(
      (element) =>
        element instanceof HTMLElement &&
        "checkValidity" in element &&
        !element.checkValidity()
    );

    if (invalidControl instanceof HTMLElement) {
      const invalidStep = invalidControl.closest(".estimate-step");
      const invalidStepIndex = steps.indexOf(invalidStep);
      if (invalidStepIndex >= 0) updateStep(invalidStepIndex, false);
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
      updateStep(0, false);
      showFormSuccess(form);
      return;
    }

    const submitButton = form.querySelector(".estimate-submit");
    const originalButtonText = submitButton?.textContent || "Request My Deck Estimate";

    try {
      if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(APPS_SCRIPT_URL)) {
        throw new Error(
          "Add the deployed Google Apps Script web app URL at the top of deck.js before using the form."
        );
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }

      setFormStatus(form, "Sending your request...");

      const files = Array.from(fileInput?.files || []);
      const projectPhotos = await Promise.all(files.map(readFileAsBase64));
      const optionalProjectDetails = String(formData.get("projectDetails") || "").trim();

      const details = {
        zipCode: String(formData.get("zipCode") || "").trim(),
        currentSetup: String(formData.get("currentSetup") || "").trim(),
        materialPreference: String(formData.get("materialPreference") || "").trim(),
        deckSize: String(formData.get("deckSize") || "").trim(),
        projectDetails: optionalProjectDetails || "No additional details provided."
      };

      const description = [
        `Project ZIP: ${details.zipCode}`,
        `Current backyard setup: ${details.currentSetup}`,
        `Material preference: ${details.materialPreference}`,
        `Approximate deck size: ${details.deckSize}`,
        `Additional notes: ${details.projectDetails}`
      ].join("\n");

      const payload = {
        source: `ZH Homes Deck Landing Page - ${form.dataset.formSource || "Deck Estimate"}`,
        pageUrl: window.location.href,
        submittedAt: new Date().toISOString(),
        contactReason: "deck_quote",
        fullName: String(formData.get("fullName") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        serviceType: "New Deck Construction",
        description,
        companyWebsite: honeypot,
        projectPhotos,
        ...details,
        attribution: getAttribution()
      };

      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      form.reset();
      if (fileInput) updateSelectedFiles(form, fileInput);
      updateStep(0, false);
      setFormStatus(form, "Thanks. Your deck estimate request was submitted.", "success");
      showFormSuccess(form);

      pushTrackingEvent("deck_lead_submit", {
        form_name: form.dataset.formSource || "deck_estimate",
        material_preference: details.materialPreference,
        current_setup: details.currentSetup,
        deck_size: details.deckSize
      });
    } catch (error) {
      console.error(error);
      setFormStatus(
        form,
        "Something went wrong. Please call or text ZH Homes at (503) 910-5466.",
        "error"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });

  updateStep(0, false);
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
      dot.classList.toggle("active", dotIndex === currentIndex);
      dot.setAttribute("aria-current", dotIndex === currentIndex ? "true" : "false");
    });
  }

  previousButton?.addEventListener("click", () => showSlide(currentIndex - 1));
  nextButton?.addEventListener("click", () => showSlide(currentIndex + 1));
  dots.forEach((dot, index) => dot.addEventListener("click", () => showSlide(index)));
  showSlide(0);
}

function initializeAnchorScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      const header = document.querySelector(".site-header");
      const offset = (header?.offsetHeight || 0) + 16;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      history.replaceState(null, "", href);
    });
  });
}

function initializeDeckImageViewer() {
  const galleryCards = Array.from(document.querySelectorAll(".deck-project-gallery-card"));
  if (!galleryCards.length) return;

  const modal = document.createElement("div");
  modal.className = "deck-image-modal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Deck image viewer");
  modal.innerHTML = `
    <div class="deck-image-modal-backdrop" data-close-image-modal></div>
    <div class="deck-image-modal-dialog">
      <button class="deck-image-modal-close" type="button" aria-label="Close image viewer" data-close-image-modal>×</button>
      <img class="deck-image-modal-image" src="" alt="" />
      <p class="deck-image-modal-caption"></p>
    </div>
  `;

  document.body.appendChild(modal);

  const modalImage = modal.querySelector(".deck-image-modal-image");
  const modalCaption = modal.querySelector(".deck-image-modal-caption");
  const closeButton = modal.querySelector(".deck-image-modal-close");
  let lastFocusedElement = null;

  function openModal(image, caption) {
    if (!modalImage || !modalCaption) return;

    lastFocusedElement = document.activeElement;
    modalImage.src = image.currentSrc || image.src;
    modalImage.alt = image.alt || caption || "Deck project image";
    modalCaption.textContent = caption || image.alt || "Deck project image";
    modal.hidden = false;
    document.body.classList.add("deck-image-modal-open");
    closeButton?.focus();

    pushTrackingEvent("deck_gallery_image_view", {
      image_alt: image.alt || "",
      image_src: image.currentSrc || image.src
    });
  }

  function closeModal() {
    if (modal.hidden) return;

    modal.hidden = true;
    document.body.classList.remove("deck-image-modal-open");

    if (modalImage) {
      modalImage.src = "";
      modalImage.alt = "";
    }

    if (modalCaption) modalCaption.textContent = "";
    lastFocusedElement?.focus?.();
  }

  galleryCards.forEach((card) => {
    const image = card.querySelector("img");
    const captionContainer = card.querySelector("figcaption");
    const captionText = card.querySelector("figcaption strong")?.textContent?.trim() || image?.alt || "";

    if (!image || !captionContainer || captionContainer.querySelector(".deck-gallery-view-button")) return;

    const button = document.createElement("button");
    button.className = "deck-gallery-view-button";
    button.type = "button";
    button.textContent = "View";
    button.setAttribute("aria-label", `View larger image${captionText ? `: ${captionText}` : ""}`);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openModal(image, captionText);
    });

    captionContainer.appendChild(button);
  });

  modal.querySelectorAll("[data-close-image-modal]").forEach((element) => {
    element.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
}


function replaceDeckCampaignImages() {
  const replacements = [
    {
      selector: ".deck-project-gallery-card",
      headingSelector: "figcaption strong",
      heading: "Low-maintenance composite deck",
      src: "https://images.pexels.com/photos/34053442/pexels-photo-34053442.jpeg?auto=compress&cs=tinysrgb&w=1600",
      fallbackSrc: "https://images.pexels.com/photos/8031887/pexels-photo-8031887.jpeg?auto=compress&cs=tinysrgb&w=1600",
      alt: "Straightforward residential backyard deck connected to a home"
    },
    {
      selector: ".services-section .service-card",
      headingSelector: "h3",
      heading: "Composite Decks",
      src: "https://images.pexels.com/photos/34053442/pexels-photo-34053442.jpeg?auto=compress&cs=tinysrgb&w=1400",
      fallbackSrc: "https://images.pexels.com/photos/8031887/pexels-photo-8031887.jpeg?auto=compress&cs=tinysrgb&w=1400",
      alt: "Simple residential deck without a gazebo or oversized structure"
    },
    {
      selector: ".services-section .service-card",
      headingSelector: "h3",
      heading: "Outdoor Features",
      src: "https://images.pexels.com/photos/35806992/pexels-photo-35806992.jpeg?auto=compress&cs=tinysrgb&w=1400",
      fallbackSrc: "https://images.pexels.com/photos/12700434/pexels-photo-12700434.jpeg?auto=compress&cs=tinysrgb&w=1400",
      alt: "Outdoor deck features with seating, plants, and string lighting"
    }
  ];

  replacements.forEach((replacement) => {
    const item = Array.from(document.querySelectorAll(replacement.selector)).find((element) =>
      element
        .querySelector(replacement.headingSelector)
        ?.textContent?.trim()
        .toLowerCase()
        .includes(replacement.heading.toLowerCase())
    );

    const image = item?.querySelector("img");
    if (!image) return;

    image.onerror = () => {
      if (!replacement.fallbackSrc || image.src === replacement.fallbackSrc) return;
      image.onerror = null;
      image.src = replacement.fallbackSrc;
    };
    image.src = replacement.src;
    image.removeAttribute("srcset");
    image.alt = replacement.alt;
  });
}

function initializeServiceCarousel() {
  const section = document.querySelector(".services-section");
  const track = section?.querySelector(".services-grid");
  const cards = Array.from(track?.querySelectorAll(".service-card") || []);

  if (!section || !track || cards.length < 2 || section.querySelector(".services-carousel-controls")) {
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

  const dots = cards.map((_, index) => {
    const dot = document.createElement("button");
    dot.className = "services-carousel-dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Go to deck service ${index + 1}`);
    dot.addEventListener("click", () => scrollToCard(index));
    dotsContainer?.appendChild(dot);
    return dot;
  });

  function updateControls(index) {
    currentIndex = Math.max(0, Math.min(index, cards.length - 1));

    dots.forEach((dot, dotIndex) => {
      const active = dotIndex === currentIndex;
      dot.classList.toggle("active", active);
      dot.setAttribute("aria-current", active ? "true" : "false");
    });

    if (previousButton) previousButton.disabled = currentIndex === 0;
    if (nextButton) nextButton.disabled = currentIndex === cards.length - 1;
  }

  function findNearestCard() {
    const trackRect = track.getBoundingClientRect();
    const viewportCenter = trackRect.left + trackRect.width / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(cardCenter - viewportCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    updateControls(closestIndex);
  }

  function requestControlSync() {
    if (animationFrame) return;

    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = 0;
      findNearestCard();
    });
  }

  function getCenteredScrollLeft(index) {
    const card = cards[index];
    if (!card) return 0;

    const desiredLeft = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
    const maximumLeft = Math.max(0, track.scrollWidth - track.clientWidth);
    return Math.max(0, Math.min(desiredLeft, maximumLeft));
  }

  function scrollToCard(index) {
    const targetIndex = Math.max(0, Math.min(index, cards.length - 1));
    track.scrollTo({ left: getCenteredScrollLeft(targetIndex), behavior: "smooth" });
    updateControls(targetIndex);
  }

  previousButton?.addEventListener("click", () => scrollToCard(currentIndex - 1));
  nextButton?.addEventListener("click", () => scrollToCard(currentIndex + 1));

  /* This runs continuously during a finger swipe, so the active bottom dot
     follows the card instead of updating only after arrow-button clicks. */
  track.addEventListener("scroll", requestControlSync, { passive: true });
  track.addEventListener("touchmove", requestControlSync, { passive: true });
  track.addEventListener("touchend", () => window.setTimeout(findNearestCard, 40), { passive: true });
  track.addEventListener("pointerup", () => window.setTimeout(findNearestCard, 40), { passive: true });
  track.addEventListener("scrollend", findNearestCard, { passive: true });
  window.addEventListener("resize", requestControlSync, { passive: true });

  track.insertAdjacentElement("afterend", controls);
  updateControls(0);
}

function initializeMobilePageFlow() {
  const mediaQuery = window.matchMedia("(max-width: 950px)");
  const inlineReview = document.querySelector(".deck-hero .hero-inline-review");
  const separateReview = document.querySelector(".hero-review-section");

  function applyMobileFlow() {
    const mobile = mediaQuery.matches;

    if (inlineReview) inlineReview.setAttribute("aria-hidden", mobile ? "false" : "false");
    if (separateReview) separateReview.setAttribute("aria-hidden", mobile ? "true" : "false");
  }

  applyMobileFlow();
  mediaQuery.addEventListener?.("change", applyMobileFlow);
}

function replaceVisibleLinkText(link, label) {
  if (!link) return;

  const textNode = Array.from(link.childNodes).find(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
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
  const quoteLink = bar?.querySelector(".cta-quote");
  const callLink = bar?.querySelector(".cta-call");

  if (!bar || !hero) return;

  replaceVisibleLinkText(quoteLink, "Get Quote");
  replaceVisibleLinkText(callLink, "Call 503-910-5466");

  let animationFrame = 0;

  function updateVisibility() {
    animationFrame = 0;

    if (!mediaQuery.matches) {
      bar.classList.remove("is-visible");
      document.body.classList.remove("sticky-cta-visible");
      return;
    }

    const headerHeight = document.querySelector(".site-header")?.offsetHeight || 0;
    const heroBottom = hero.getBoundingClientRect().bottom;
    const visible = heroBottom <= headerHeight + 6;

    bar.classList.toggle("is-visible", visible);
    document.body.classList.toggle("sticky-cta-visible", visible);
    bar.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  function requestVisibilityUpdate() {
    if (animationFrame) return;
    animationFrame = window.requestAnimationFrame(updateVisibility);
  }

  window.addEventListener("scroll", requestVisibilityUpdate, { passive: true });
  window.addEventListener("resize", requestVisibilityUpdate, { passive: true });
  mediaQuery.addEventListener?.("change", requestVisibilityUpdate);
  updateVisibility();
}



/* ==========================================================
   V13 CONVERSION COPY + USER-SELECTED DECK IMAGERY
   ========================================================== */

function setDeckText(selector, text, root = document) {
  const element = root.querySelector(selector);
  if (element) element.textContent = text;
  return element;
}

function setDeckHtml(selector, html, root = document) {
  const element = root.querySelector(selector);
  if (element) element.innerHTML = html;
  return element;
}

function findDeckCard(containerSelector, headingSelector, heading) {
  return Array.from(document.querySelectorAll(containerSelector)).find((element) =>
    element
      .querySelector(headingSelector)
      ?.textContent?.trim()
      .toLowerCase()
      .includes(heading.toLowerCase())
  );
}

function setRemoteDeckImage(image, source, fallbackSource, altText) {
  if (!image) return;

  image.referrerPolicy = "no-referrer";
  image.removeAttribute("srcset");
  image.alt = altText;

  image.onerror = () => {
    if (!fallbackSource || image.dataset.fallbackApplied === "true") return;
    image.dataset.fallbackApplied = "true";
    image.onerror = null;
    image.src = fallbackSource;
  };

  image.src = source;
}

function updateServiceCardCopy(heading, description, linkText) {
  const card = findDeckCard(".services-section .service-card", "h3", heading);
  if (!card) return;

  setDeckText(".service-content p", description, card);
  setDeckText(".service-link", linkText, card);
}

function updateProcessCard(index, heading, description) {
  const card = document.querySelectorAll(".process-section .process-card")[index];
  if (!card) return;

  setDeckText("h3", heading, card);
  setDeckText("p", description, card);
}

function updateMissionStat(index, heading, description) {
  const item = document.querySelectorAll(".mission-section .mission-stat")[index];
  if (!item) return;

  setDeckText("strong", heading, item);
  setDeckText("span", description, item);
}

function applyV13CopyAndImagery() {
  /* Search and share copy */
  document.title = "Custom Deck Builder in Salem, Keizer & Silverton | ZH Homes";

  const description =
    "Turn unfinished backyard space into a custom wood or composite deck built around your home, yard, and lifestyle. Get a clear deck estimate from ZH Homes.";

  document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  document
    .querySelector('meta[property="og:title"]')
    ?.setAttribute("content", "Build a Backyard You’ll Actually Use | ZH Homes");
  document
    .querySelector('meta[property="og:description"]')
    ?.setAttribute(
      "content",
      "Custom wood and composite decks with a clear written estimate, direct communication, and a layout built around your property."
    );

  /* Header */
  setDeckText(".header-cta", "Get My Estimate");

  /* Hero */
  const heroHeadline =
    'Build the deck that finally makes your backyard <span class="accent">feel finished.</span>';
  setDeckHtml("#hero-title", heroHeadline);
  setDeckHtml(".hero-mobile-title", heroHeadline);

  setDeckText(
    ".deck-hero .hero-copy > .subheadline:not(.hero-mobile-subheadline)",
    "ZH Homes designs and builds custom wood and composite decks around your home, your yard, and the way you want to live outside, with a clear written estimate and direct communication from start to finish."
  );
  setDeckText(
    ".hero-mobile-subheadline",
    "Turn unfinished outdoor space into a place for grilling, dinners, slow mornings, and summer nights."
  );

  setDeckText(".deck-hero .hero-actions .btn-primary", "Get My Deck Estimate");
  setDeckText(".deck-hero .hero-actions .btn-secondary", "Call 503-910-5466");
  setDeckText(".deck-hero .hero-review-badge", "Verified 5-Star Review");

  /* Trust strip */
  const stats = document.querySelectorAll(".quick-stats .stat-box");
  const statCopy = [
    ["Licensed", "Bonded & Insured • Oregon CCB #260679"],
    ["Local", "Salem-Area Contractor"],
    ["Clear", "Written Project Estimates"],
    ["Nearby", "Salem, Keizer & Silverton"]
  ];
  stats.forEach((stat, index) => {
    if (!statCopy[index]) return;
    setDeckText("strong", statCopy[index][0], stat);
    setDeckText("span", statCopy[index][1], stat);
  });

  /* Gallery positioning and copy. These remain inspiration images, not ZH Homes project claims. */
  setDeckText(".deck-project-gallery-eyebrow", "Deck Design Inspiration");
  setDeckText("#deck-gallery-title", "See What Your Backyard Could Become");

  const galleryDining = document.querySelector(".deck-project-gallery-card.gallery-large-left");
  setDeckText(".deck-project-tag", "Outdoor Dining", galleryDining || document);
  setDeckText("figcaption strong", "A deck made for dinners and summer nights", galleryDining || document);
  setRemoteDeckImage(
    galleryDining?.querySelector("img"),
    "https://reliablehomeexperts.com/hubfs/ReliableHomeExperts_January2026/images/JB-deck-after-2.jpg",
    "https://images.pexels.com/photos/12700434/pexels-photo-12700434.jpeg?auto=compress&cs=tinysrgb&w=1500",
    "Wood deck arranged for outdoor dining and entertaining"
  );

  const galleryComposite = document.querySelector(".deck-project-gallery-card.gallery-small-right");
  setDeckText(".deck-project-tag", "Composite Deck", galleryComposite || document);
  setDeckText("figcaption strong", "Low-maintenance space with a finished look", galleryComposite || document);
  setRemoteDeckImage(
    galleryComposite?.querySelector("img"),
    "https://www.kingcitypropertyservice.com/uploads/1/0/1/0/101002410/composite-deck-finish-with-border-vaughan-650_orig.jpg",
    "https://images.pexels.com/photos/34053442/pexels-photo-34053442.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "Residential composite deck with clean picture-frame border"
  );

  const galleryRailing = document.querySelector(".deck-project-gallery-card.gallery-small-left");
  setDeckText("figcaption strong", "Safe access that completes the design", galleryRailing || document);

  const galleryEntertaining = document.querySelector(".deck-project-gallery-card.gallery-large-right");
  setDeckText(".deck-project-tag", "Outdoor Living", galleryEntertaining || document);
  setDeckText("figcaption strong", "A backyard built for hosting", galleryEntertaining || document);
  setRemoteDeckImage(
    galleryEntertaining?.querySelector("img"),
    "https://images.airtasker.com/v7/https://airtasker-seo-assets-prod.s3.amazonaws.com/en_GB/1702273848607-wooden-deck.jpg?gravity=smart&w=1200&h=1200",
    "https://images.pexels.com/photos/8031887/pexels-photo-8031887.jpeg?auto=compress&cs=tinysrgb&w=1500",
    "Finished backyard deck arranged for lounging and entertaining"
  );

  /* Services */
  setDeckText(".services-eyebrow", "Built Around Your Backyard");
  setDeckText(".services-heading h2", "Choose the Deck That Fits Your Home and the Way You Live");
  setDeckText(".services-btn span", "Plan My Deck");

  updateServiceCardCopy(
    "Custom Deck Design",
    "A layout shaped around your house, yard, furniture, grill, traffic flow, and the way you want to use the space.",
    "Design My Deck"
  );
  updateServiceCardCopy(
    "Wood Decks",
    "Get the warm, natural look of wood with stain and finish options that make the deck feel like part of the home.",
    "Explore Wood Decks"
  );
  updateServiceCardCopy(
    "Composite Decks",
    "Enjoy a finished outdoor space with less staining and sealing, plus durable color options that complement your home.",
    "Explore Composite"
  );
  updateServiceCardCopy(
    "Stairs & Railings",
    "Make the transition from deck to yard feel safe, comfortable, and visually finished.",
    "Plan Stairs & Railings"
  );
  updateServiceCardCopy(
    "Sloped-Yard Decks",
    "Turn difficult elevation into useful outdoor space with footings, drainage, access, and stairs planned for the property.",
    "Show Us the Yard"
  );

  const compositeCard = findDeckCard(".services-section .service-card", "h3", "Composite Decks");
  setRemoteDeckImage(
    compositeCard?.querySelector("img"),
    "https://cdn.shopify.com/s/files/1/0926/6371/0020/files/NeoTimber-Composite-Decking-Patio-3.jpg?v=1751881159",
    "https://images.pexels.com/photos/34053442/pexels-photo-34053442.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "Composite patio deck with comfortable seating and a residential backyard setting"
  );

  /* Remove the service the user no longer wants. This runs before the mobile carousel is built. */
  findDeckCard(".services-section .service-card", "h3", "Outdoor Features")?.remove();

  /* Why ZH Homes */
  setDeckText(".mission-eyebrow", "Why Homeowners Choose ZH Homes");
  setDeckText(
    ".mission-title h2",
    "A Deck You’ll Love. A Process You Can Trust."
  );

  updateMissionStat(
    0,
    "Direct Updates",
    "Talk with the person responsible for your project, not a chain of salespeople."
  );
  updateMissionStat(
    1,
    "Built for Your Yard",
    "Every layout is planned around your home, yard, access, elevation, and goals."
  );
  updateMissionStat(
    2,
    "Oregon-Ready",
    "Construction details and materials chosen for safety, durability, and Northwest weather."
  );
  updateMissionStat(
    3,
    "Clear Pricing",
    "See the proposed scope, materials, and price before you decide."
  );

  /* Process */
  setDeckText(".process-eyebrow", "A Clearer Way to Build");
  setDeckText(".process-top h2", "From a Rough Idea to a Finished Deck, Without the Guesswork");
  setDeckText(
    ".process-top p",
    "You do not need drawings or every detail figured out. Start with your backyard and what you want the space to do. We will help turn it into a practical plan."
  );

  updateProcessCard(
    0,
    "Tell Us What You Want",
    "Share your location, rough size, material preference, and anything else you already know."
  );
  updateProcessCard(
    1,
    "Walk the Property",
    "We look at access, elevation, drainage, layout, stairs, railings, and material options."
  );
  updateProcessCard(
    2,
    "Review a Written Estimate",
    "See the proposed scope, materials, pricing, and next steps before work is scheduled."
  );
  updateProcessCard(
    3,
    "Watch Your Backyard Take Shape",
    "Once approved, the project is scheduled and built with direct updates through the final walkthrough."
  );

  /* Reviews */
  setDeckText(".testimonials-eyebrow", "Proof From Local Homeowners");
  setDeckText(
    ".testimonials-left h2",
    "The Kind of Contractor Homeowners Tell Their Friends to Call"
  );
  setDeckText(
    ".testimonials-mobile-subheadline",
    "Verified Google feedback about showing up, communicating clearly, bringing useful ideas, and doing the work well."
  );
  setDeckText(".google-reviews-btn", "Read Google Reviews");

  /* Final estimate section */
  setDeckText(".deck-estimate-section .contact-eyebrow", "Start Planning Your Deck");
  setDeckText(
    ".deck-estimate-section .contact-content h2",
    "Your Backyard Is Already There. Let’s Make It Worth Using."
  );
  setDeckText(
    ".deck-estimate-section .contact-content > p",
    "Share the property basics and anything else you already know. Zach will review the request and follow up with the clearest next step."
  );

  const contactItems = document.querySelectorAll(
    ".deck-estimate-section .contact-info-item a, .deck-estimate-section .contact-info-item span"
  );
  const contactCopy = [
    "Call or text Zach: (503) 910-5466",
    "Serving Salem, Keizer, Silverton, and nearby communities",
    "No obligation. No pressure. Just a straightforward conversation about your project."
  ];
  contactItems.forEach((item, index) => {
    if (contactCopy[index]) item.textContent = contactCopy[index];
  });

  setDeckText(".hero-quick-heading > span", "Custom Deck Estimate");
  setDeckText(".hero-quick-heading h2", "Start Planning Your Deck");
  setDeckText(".deck-form-heading h3", "Tell Zach About Your Deck");
  setDeckText(
    ".deck-form-heading p",
    "Share the project basics so Zach can understand the property and deck before following up."
  );

  document.querySelectorAll(".deck-multistep-form").forEach((form) => {
    setDeckText(".estimate-submit", "Get My Deck Estimate", form);
    setDeckText(
      ".hero-form-assurance",
      "No obligation. Just a straightforward follow-up about your project.",
      form
    );
  });

  /* FAQ and footer */
  setDeckText(".faq-eyebrow", "Deck Planning Questions");
  setDeckText(".faq-top h2", "What Homeowners Want to Know Before Building a Deck");
  setDeckText(
    ".faq-top p",
    "Clear answers about cost, materials, timing, permits, design, and service area."
  );
  setDeckText(
    ".deck-footer .footer-brand p",
    "Custom wood and composite decks built for the way Salem-area homeowners want to live outside."
  );
}


document.querySelectorAll(".tracked-call").forEach((link) => {
  link.addEventListener("click", () => {
    pushTrackingEvent("deck_phone_click", { page_path: window.location.pathname });
  });
});

replaceDeckCampaignImages();
applyV13CopyAndImagery();
document.querySelectorAll(".deck-multistep-form").forEach(initializeMultiStepForm);
initializeReviewCarousel();
initializeAnchorScrolling();
initializeServiceCarousel();
initializeMobilePageFlow();
initializeMobileStickyCta();
