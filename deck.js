const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwHLveySfQQs0FxeKYvdpn5h9GotlbR36H1ttA5hNUTb-KWyC7oxTH5EZ7jFB9sy92XkQ/exec";

const projectPhoto = document.getElementById("projectPhoto");
const fileError = document.getElementById("fileError");
const selectedFileRow = document.getElementById("selectedFileRow");
const selectedFileName = document.getElementById("selectedFileName");
const clearProjectPhoto = document.getElementById("clearProjectPhoto");

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

document.querySelectorAll('a[href="#estimate"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.getElementById("estimate");
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", "#estimate");
  });
});

function getSelectedFiles() {
  return Array.from(projectPhoto?.files || []);
}

function validateFiles(files) {
  if (!projectPhoto) return true;
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const invalidType = files.some((file) => !ALLOWED_IMAGE_TYPES.includes(file.type));
  const oversized = files.some((file) => file.size > MAX_IMAGE_SIZE);
  const invalid = files.length > MAX_IMAGE_FILES || totalSize > MAX_TOTAL_IMAGE_SIZE || invalidType || oversized;

  if (invalid) {
    const message = "Please upload up to 4 JPG, PNG, WEBP, or GIF images. Each image must be 5MB or smaller.";
    projectPhoto.setCustomValidity(message);
    if (fileError) fileError.textContent = message;
    return false;
  }

  projectPhoto.setCustomValidity("");
  if (fileError) fileError.textContent = "";
  return true;
}

function updateSelectedFileText(files) {
  if (!selectedFileName || !selectedFileRow) return;
  if (!files.length) {
    selectedFileName.textContent = "";
    selectedFileRow.hidden = true;
    return;
  }

  selectedFileName.textContent = files.length === 1
    ? files[0].name
    : `${files.length} images selected`;
  selectedFileRow.hidden = false;
}

function clearFiles() {
  if (!projectPhoto) return;
  projectPhoto.value = "";
  projectPhoto.setCustomValidity("");
  updateSelectedFileText([]);
  if (fileError) fileError.textContent = "";
}

projectPhoto?.addEventListener("change", () => {
  const files = getSelectedFiles();
  validateFiles(files);
  updateSelectedFileText(files);
});
clearProjectPhoto?.addEventListener("click", clearFiles);

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
  const formStatus = form.querySelector("[data-form-status]");
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = `form-status${form.id === "heroDeckQuoteForm" ? " hero-form-status" : ""} ${type}`.trim();
}

function showSuccess(form) {
  const container = form.closest(".hero-quick-card, .deck-form-card");
  const successOverlay = container?.querySelector("[data-success-overlay]");
  if (!successOverlay) return;

  successOverlay.classList.add("active");
  successOverlay.setAttribute("aria-hidden", "false");
  window.setTimeout(() => {
    successOverlay.classList.remove("active");
    successOverlay.setAttribute("aria-hidden", "true");
  }, 4200);
}

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
  if (!field || typeof field.value !== "string") return fallback;
  return field.value.trim();
}

async function submitDeckForm(form) {
  const isFullForm = form.id === "deckQuoteForm";
  const files = isFullForm ? getSelectedFiles() : [];

  if (isFullForm && !validateFiles(files)) {
    projectPhoto?.focus();
    return;
  }

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const submitButton = form.querySelector(".submit-button");
  const originalText = submitButton?.textContent || "Request My Deck Estimate";

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }
    setStatus(form, "Sending your request...");

    const projectPhotos = await Promise.all(files.map(readFileAsBase64));
    const zipCode = getFormValue(form, "zipCode");
    const materialPreference = getFormValue(form, "materialPreference", "Unsure");
    const projectTiming = getFormValue(form, "projectTiming");
    const projectDetails = getFormValue(form, "projectDetails");
    const formSource = form.dataset.formSource || "Deck Estimate Form";

    const description = [
      `Form source: ${formSource}`,
      `Project ZIP: ${zipCode}`,
      `Material preference: ${materialPreference}`,
      `Ideal timing: ${projectTiming || "Not provided"}`,
      projectDetails ? `Deck goals/details: ${projectDetails}` : "Deck goals/details: Not provided"
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
      zipCode,
      materialPreference,
      projectTiming,
      projectDetails,
      attribution: getAttribution()
    };

    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    form.reset();
    if (isFullForm) clearFiles();
    setStatus(form, "Thanks. Your deck estimate request was submitted.", "success");
    showSuccess(form);
    pushTrackingEvent("deck_lead_submit", {
      form_name: form.id,
      form_source: formSource,
      material_preference: materialPreference,
      project_timing: projectTiming || "not_provided"
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

document.querySelectorAll("#heroDeckQuoteForm, #deckQuoteForm").forEach((form) => {
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
