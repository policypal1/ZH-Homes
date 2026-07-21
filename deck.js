const APPS_SCRIPT_URL = "PASTE_YOUR_DEPLOYED_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

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
  const preferredContactInput = form.querySelector('input[name="contactPreference"]');
  const preferredContactFieldset = preferredContactInput?.closest("fieldset");
  preferredContactFieldset?.remove();

  form.querySelector(".campaign-confirmation")?.remove();

  const successMessage = form
    .closest(".hero-quick-card, .deck-form-card")
    ?.querySelector("[data-success-overlay] p");

  if (successMessage) {
    successMessage.textContent =
      "Thanks. We will review your deck request and follow up using the phone number or email you provided.";
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
      const desiredFeatures = formData.getAll("desiredFeatures").map(String);

      const details = {
        homeownerStatus: String(formData.get("homeownerStatus") || ""),
        zipCode: String(formData.get("zipCode") || ""),
        currentSetup: String(formData.get("currentSetup") || ""),
        materialPreference: String(formData.get("materialPreference") || ""),
        deckSize: String(formData.get("deckSize") || ""),
        desiredFeatures,
        projectTiming: String(formData.get("projectTiming") || ""),
        budgetRange: String(formData.get("budgetRange") || ""),
        projectDetails: String(formData.get("projectDetails") || "")
      };

      const description = [
        `Homeowner status: ${details.homeownerStatus}`,
        `Project ZIP: ${details.zipCode}`,
        `Current backyard setup: ${details.currentSetup}`,
        `Material preference: ${details.materialPreference}`,
        `Approximate deck size: ${details.deckSize}`,
        `Desired features: ${desiredFeatures.length ? desiredFeatures.join(", ") : "None selected"}`,
        `Ideal timing: ${details.projectTiming}`,
        `Budget range: ${details.budgetRange}`,
        `Deck goals/details: ${details.projectDetails}`
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
        project_timing: details.projectTiming,
        budget_range: details.budgetRange,
        homeowner_status: details.homeownerStatus
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
      src: "https://images.pexels.com/photos/37588543/pexels-photo-37588543.jpeg?auto=compress&cs=tinysrgb&w=1600",
      alt: "Large elevated backyard deck with stairs and modern railing"
    },
    {
      selector: ".services-section .service-card",
      headingSelector: "h3",
      heading: "Composite Decks",
      src: "https://images.pexels.com/photos/29052548/pexels-photo-29052548.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Backyard deck with stairs, railing, and open lawn"
    },
    {
      selector: ".services-section .service-card",
      headingSelector: "h3",
      heading: "Outdoor Features",
      src: "https://images.pexels.com/photos/10855255/pexels-photo-10855255.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Outdoor kitchen and pergola designed for backyard entertaining"
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
  let scrollTimer = 0;

  const dots = cards.map((_, index) => {
    const dot = document.createElement("button");
    dot.className = "services-carousel-dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Go to deck service ${index + 1}`);
    dot.addEventListener("click", () => scrollToCard(index));
    dotsContainer?.appendChild(dot);
    return dot;
  });

  function getCardLeft(index) {
    const card = cards[index];
    return card ? card.offsetLeft - track.offsetLeft : 0;
  }

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

  function scrollToCard(index) {
    const targetIndex = Math.max(0, Math.min(index, cards.length - 1));
    track.scrollTo({ left: getCardLeft(targetIndex), behavior: "smooth" });
    updateControls(targetIndex);
  }

  function findNearestCard() {
    const left = track.scrollLeft;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - track.offsetLeft - left);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    updateControls(closestIndex);
  }

  previousButton?.addEventListener("click", () => scrollToCard(currentIndex - 1));
  nextButton?.addEventListener("click", () => scrollToCard(currentIndex + 1));

  track.addEventListener(
    "scroll",
    () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(findNearestCard, 90);
    },
    { passive: true }
  );

  window.addEventListener("resize", findNearestCard, { passive: true });
  track.insertAdjacentElement("afterend", controls);
  updateControls(0);
}

function initializeMobilePageFlow() {
  const mediaQuery = window.matchMedia("(max-width: 950px)");
  const inlineReview = document.querySelector(".deck-hero .hero-inline-review");
  const separateReview = document.querySelector(".hero-review-section");

  function applyMobileFlow() {
    if (!inlineReview || !separateReview) return;
    inlineReview.setAttribute("aria-hidden", mediaQuery.matches ? "true" : "false");
  }

  applyMobileFlow();
  mediaQuery.addEventListener?.("change", applyMobileFlow);
}

document.querySelectorAll(".tracked-call").forEach((link) => {
  link.addEventListener("click", () => {
    pushTrackingEvent("deck_phone_click", { page_path: window.location.pathname });
  });
});

replaceDeckCampaignImages();
document.querySelectorAll(".deck-multistep-form").forEach(initializeMultiStepForm);
initializeReviewCarousel();
initializeAnchorScrolling();
initializeDeckImageViewer();
initializeServiceCarousel();
initializeMobilePageFlow();
