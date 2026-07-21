const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwHLveySfQQs0FxeKYvdpn5h9GotlbR36H1ttA5hNUTb-KWyC7oxTH5EZ7jFB9sy92XkQ/exec";

const MAX_IMAGE_FILES = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_IMAGE_SIZE = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function pushTrackingEvent(eventName, details = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...details });
}

document.querySelectorAll(".tracked-call").forEach((link) => {
  link.addEventListener("click", () => {
    pushTrackingEvent("deck_phone_click", { page_path: window.location.pathname });
  });
});

document.querySelectorAll('a[href="#hero-estimate"], a[href="#estimate"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const selector = link.getAttribute("href");
    const target = selector ? document.querySelector(selector) : null;
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", selector);
  });
});

function getAttribution() {
  const params = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"];
  return keys.reduce((result, key) => {
    result[key] = params.get(key) || "";
    return result;
  }, {});
}

function getFormValue(form, name, fallback = "") {
  const field = form.elements.namedItem(name);
  if (!field) return fallback;

  if (typeof RadioNodeList !== "undefined" && field instanceof RadioNodeList) {
    return String(field.value || fallback).trim();
  }

  return typeof field.value === "string" ? field.value.trim() : fallback;
}

function getCheckedValues(form, name) {
  return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
}

function getFileElements(form) {
  return {
    input: form.querySelector("[data-project-photo]"),
    error: form.querySelector("[data-file-error]"),
    row: form.querySelector("[data-selected-file-row]"),
    name: form.querySelector("[data-selected-file-name]")
  };
}

function getSelectedFiles(form) {
  const { input } = getFileElements(form);
  return Array.from(input?.files || []);
}

function validateFiles(form) {
  const { input, error } = getFileElements(form);
  if (!input) return true;

  const files = getSelectedFiles(form);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const invalidType = files.some((file) => !ALLOWED_IMAGE_TYPES.includes(file.type));
  const oversized = files.some((file) => file.size > MAX_IMAGE_SIZE);
  const invalid = files.length > MAX_IMAGE_FILES || totalSize > MAX_TOTAL_IMAGE_SIZE || invalidType || oversized;

  if (invalid) {
    const message = "Please upload up to 4 JPG, PNG, WEBP, or GIF images. Each image must be 5MB or smaller.";
    input.setCustomValidity(message);
    if (error) error.textContent = message;
    return false;
  }

  input.setCustomValidity("");
  if (error) error.textContent = "";
  return true;
}

function updateSelectedFileText(form) {
  const files = getSelectedFiles(form);
  const { row, name } = getFileElements(form);
  if (!row || !name) return;

  if (!files.length) {
    name.textContent = "";
    row.hidden = true;
    return;
  }

  name.textContent = files.length === 1 ? files[0].name : `${files.length} images selected`;
  row.hidden = false;
}

function clearFiles(form) {
  const { input, error } = getFileElements(form);
  if (!input) return;
  input.value = "";
  input.setCustomValidity("");
  if (error) error.textContent = "";
  updateSelectedFileText(form);
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

function setStatus(form, message, type = "") {
  const status = form.querySelector("[data-form-status]");
  if (!status) return;
  status.textContent = message;
  status.className = `form-status ${type}`.trim();
}

function showSuccess(form) {
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

function getSteps(form) {
  return Array.from(form.querySelectorAll(".estimate-step"));
}

function getCurrentStepIndex(form) {
  return Number(form.dataset.currentStep || 0);
}

function updateStep(form, requestedIndex, shouldFocus = true) {
  const steps = getSteps(form);
  if (!steps.length) return;

  const index = Math.max(0, Math.min(requestedIndex, steps.length - 1));
  form.dataset.currentStep = String(index);

  steps.forEach((step, stepIndex) => {
    const active = stepIndex === index;
    step.classList.toggle("active", active);
    step.hidden = !active;
  });

  const progressLabel = form.querySelector("[data-progress-label]");
  const progressTitle = form.querySelector("[data-progress-title]");
  const progressBar = form.querySelector("[data-progress-bar]");
  const title = steps[index]?.dataset.stepTitle || "Deck estimate";

  if (progressLabel) progressLabel.textContent = `Step ${index + 1} of ${steps.length}`;
  if (progressTitle) progressTitle.textContent = title;
  if (progressBar) progressBar.style.width = `${((index + 1) / steps.length) * 100}%`;

  if (shouldFocus) {
    const heading = steps[index]?.querySelector(".estimate-step-heading > span");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
  }

  pushTrackingEvent("deck_estimate_step_view", {
    form_name: form.id,
    step_number: index + 1,
    step_title: title
  });
}

function validateCurrentStep(form) {
  const steps = getSteps(form);
  const step = steps[getCurrentStepIndex(form)];
  if (!step) return true;

  const fields = Array.from(step.querySelectorAll("input, select, textarea"));
  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }

  if (step.querySelector("[data-project-photo]") && !validateFiles(form)) {
    step.querySelector("[data-project-photo]")?.focus();
    return false;
  }

  return true;
}

async function submitDeckForm(form) {
  if (!validateCurrentStep(form) || !form.checkValidity() || !validateFiles(form)) {
    form.reportValidity();
    return;
  }

  const submitButton = form.querySelector(".submit-button");
  const originalText = submitButton?.textContent || "Request My Free Deck Estimate";

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }
    setStatus(form, "Sending your request...");

    const files = getSelectedFiles(form);
    const projectPhotos = await Promise.all(files.map(readFileAsBase64));
    const desiredFeatures = getCheckedValues(form, "desiredFeatures");
    const formSource = form.dataset.formSource || "Deck Estimate Form";

    const details = {
      zipCode: getFormValue(form, "zipCode"),
      homeownerStatus: getFormValue(form, "homeownerStatus"),
      currentSetup: getFormValue(form, "currentSetup"),
      materialPreference: getFormValue(form, "materialPreference"),
      deckSize: getFormValue(form, "deckSize"),
      desiredFeatures,
      projectTiming: getFormValue(form, "projectTiming"),
      budgetRange: getFormValue(form, "budgetRange"),
      projectDetails: getFormValue(form, "projectDetails"),
      contactPreference: getFormValue(form, "contactPreference"),
      newDeckConfirmation: getFormValue(form, "newDeckConfirmation")
    };

    const description = [
      `Form source: ${formSource}`,
      `Homeowner status: ${details.homeownerStatus}`,
      `Project ZIP: ${details.zipCode}`,
      `Current backyard setup: ${details.currentSetup}`,
      `Material preference: ${details.materialPreference}`,
      `Approximate deck size: ${details.deckSize}`,
      `Desired features: ${details.desiredFeatures.length ? details.desiredFeatures.join(", ") : "None selected"}`,
      `Ideal timing: ${details.projectTiming}`,
      `Budget range: ${details.budgetRange}`,
      `Preferred contact: ${details.contactPreference}`,
      `New deck campaign confirmation: ${details.newDeckConfirmation}`,
      `Deck goals/details: ${details.projectDetails}`
    ].join("\n");

    const payload = {
      source: `ZH Homes Deck Landing Page - ${formSource}`,
      pageUrl: window.location.href,
      submittedAt: new Date().toISOString(),
      contactReason: "deck_quote",
      fullName: getFormValue(form, "fullName"),
      email: getFormValue(form, "email"),
      phone: getFormValue(form, "phone"),
      serviceType: "New Deck Construction",
      description,
      companyWebsite: getFormValue(form, "companyWebsite"),
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
    clearFiles(form);
    updateStep(form, 0, false);
    setStatus(form, "Thanks. Your deck estimate request was submitted.", "success");
    showSuccess(form);

    pushTrackingEvent("deck_lead_submit", {
      form_name: form.id,
      form_source: formSource,
      homeowner_status: details.homeownerStatus,
      material_preference: details.materialPreference,
      project_timing: details.projectTiming,
      budget_range: details.budgetRange
    });
  } catch (error) {
    console.error(error);
    setStatus(form, "Something went wrong. Please call or text ZH Homes directly at (503) 910-5466.", "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
}

document.querySelectorAll(".deck-multistep-form").forEach((form) => {
  updateStep(form, 0, false);

  form.addEventListener("click", (event) => {
    const nextButton = event.target.closest("[data-next]");
    const backButton = event.target.closest("[data-back]");
    const clearButton = event.target.closest("[data-clear-files]");

    if (nextButton) {
      if (!validateCurrentStep(form)) return;
      updateStep(form, getCurrentStepIndex(form) + 1);
      return;
    }

    if (backButton) {
      updateStep(form, getCurrentStepIndex(form) - 1);
      return;
    }

    if (clearButton) {
      clearFiles(form);
    }
  });

  form.querySelector("[data-project-photo]")?.addEventListener("change", () => {
    validateFiles(form);
    updateSelectedFileText(form);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitDeckForm(form);
  });
});

const mobileHeroSection = document.querySelector(".hero");
const mobileCtaBar = document.querySelector(".mobile-cta-bar");
const mobileCtaQuery = window.matchMedia("(max-width: 950px)");
let mobileCtaTicking = false;

function updateMobileCtaVisibility() {
  mobileCtaTicking = false;

  if (!mobileHeroSection || !mobileCtaBar || !mobileCtaQuery.matches) {
    document.body.classList.remove("hero-cta-visible");
    return;
  }

  const heroRect = mobileHeroSection.getBoundingClientRect();
  const heroTop = window.scrollY + heroRect.top;
  const heroHeight = Math.max(heroRect.height, 1);
  const heroScrollProgress = Math.max(0, (window.scrollY - heroTop) / heroHeight);

  document.body.classList.toggle("hero-cta-visible", heroScrollProgress >= 0.60);
}

function requestMobileCtaUpdate() {
  if (mobileCtaTicking) return;
  mobileCtaTicking = true;
  window.requestAnimationFrame(updateMobileCtaVisibility);
}

window.addEventListener("scroll", requestMobileCtaUpdate, { passive: true });
window.addEventListener("resize", requestMobileCtaUpdate);
mobileCtaQuery.addEventListener?.("change", requestMobileCtaUpdate);
updateMobileCtaVisibility();
