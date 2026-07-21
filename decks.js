const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwHLveySfQQs0FxeKYvdpn5h9GotlbR36H1ttA5hNUTb-KWyC7oxTH5EZ7jFB9sy92XkQ/exec";

const form = document.getElementById("deckLeadForm");
const steps = Array.from(document.querySelectorAll(".form-step"));
const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");
const progressTitle = document.getElementById("progressTitle");
const formStatus = document.getElementById("formStatus");
const successPanel = document.getElementById("successPanel");
const projectPhotos = document.getElementById("projectPhotos");
const selectedFiles = document.getElementById("selectedFiles");
const photoError = document.getElementById("photoError");

const STEP_TITLES = ["Project type", "Location", "Scope and timing", "Contact details"];
const MAX_IMAGE_FILES = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_IMAGE_SIZE = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const formLoadedAt = Date.now();
let currentStep = 0;
let formStartedTracked = false;

function trackEvent(eventName, parameters = {}) {
  const safeParameters = { page_type: "deck_landing_page", ...parameters };

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, safeParameters);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...safeParameters });
}

function setFormStatus(message, type = "") {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = `form-status ${type}`.trim();
}

function getFieldValue(name) {
  const field = form?.elements?.namedItem(name);

  if (!field) return "";

  if (field instanceof RadioNodeList) {
    return String(field.value || "").trim();
  }

  if (field instanceof HTMLInputElement && field.type === "checkbox") {
    return field.checked ? field.value || "yes" : "";
  }

  return String(field.value || "").trim();
}

function updateProgress() {
  const percentage = ((currentStep + 1) / steps.length) * 100;
  progressBar.style.width = `${percentage}%`;
  progressLabel.textContent = `Step ${currentStep + 1} of ${steps.length}`;
  progressTitle.textContent = STEP_TITLES[currentStep] || "Project request";
}

function showStep(index, shouldFocus = true) {
  currentStep = Math.max(0, Math.min(index, steps.length - 1));

  steps.forEach((step, stepIndex) => {
    step.classList.toggle("active", stepIndex === currentStep);
  });

  updateProgress();
  setFormStatus("");

  if (shouldFocus) {
    const legend = steps[currentStep]?.querySelector("legend");
    legend?.setAttribute("tabindex", "-1");
    legend?.focus({ preventScroll: true });
    document.querySelector("#estimate .form-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setStepError(step, message = "") {
  const errorElement = step?.querySelector(".step-error");
  if (errorElement) errorElement.textContent = message;
}

function requiredRadioGroupIsComplete(step, name) {
  return Boolean(step.querySelector(`input[type="radio"][name="${name}"]:checked`));
}

function validateStep(step) {
  setStepError(step, "");

  const requiredRadioNames = Array.from(step.querySelectorAll('input[type="radio"][required]'))
    .map((input) => input.name)
    .filter((name, index, names) => name && names.indexOf(name) === index);

  for (const name of requiredRadioNames) {
    if (!requiredRadioGroupIsComplete(step, name)) {
      const firstRadio = step.querySelector(`input[type="radio"][name="${name}"]`);
      setStepError(step, "Please complete each required choice before continuing.");
      firstRadio?.focus();
      return false;
    }
  }

  const requiredFields = Array.from(step.querySelectorAll("input[required]:not([type='radio']), select[required], textarea[required]"));

  for (const field of requiredFields) {
    if (!field.checkValidity()) {
      setStepError(step, field.validationMessage || "Please complete the required fields before continuing.");
      field.reportValidity();
      field.focus();
      return false;
    }
  }

  if (step.querySelector("#projectPhotos") && !validatePhotos()) {
    projectPhotos?.focus();
    return false;
  }

  return true;
}

function findFirstInvalidStep() {
  return steps.findIndex((step) => !validateStep(step));
}

function getFileExtension(fileName) {
  const parts = String(fileName || "").toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function isAllowedImage(file) {
  return ALLOWED_IMAGE_TYPES.includes(file.type) && ALLOWED_IMAGE_EXTENSIONS.includes(getFileExtension(file.name));
}

function getPhotoFiles() {
  return Array.from(projectPhotos?.files || []);
}

function validatePhotos() {
  const files = getPhotoFiles();

  if (!files.length) {
    projectPhotos?.setCustomValidity("");
    if (photoError) photoError.textContent = "";
    if (selectedFiles) {
      selectedFiles.textContent = "";
      selectedFiles.hidden = true;
    }
    return true;
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const invalidFile = files.some((file) => !isAllowedImage(file));
  const oversizedFile = files.some((file) => file.size > MAX_IMAGE_SIZE);
  const invalid = files.length > MAX_IMAGE_FILES || totalSize > MAX_TOTAL_IMAGE_SIZE || invalidFile || oversizedFile;

  if (invalid) {
    const message = "Upload 1–4 JPG, PNG, WEBP, or GIF images. Each image must be 5MB or smaller and total uploads must stay under 20MB.";
    projectPhotos?.setCustomValidity(message);
    if (photoError) photoError.textContent = message;
    return false;
  }

  projectPhotos?.setCustomValidity("");
  if (photoError) photoError.textContent = "";

  if (selectedFiles) {
    selectedFiles.hidden = false;
    selectedFiles.textContent = files.length === 1
      ? `Selected: ${files[0].name}`
      : `${files.length} images selected: ${files.map((file) => file.name).join(", ")}`;
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

    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function readPhotosAsBase64(files) {
  return Promise.all(files.map(readFileAsBase64));
}

function getCampaignData() {
  const query = new URLSearchParams(window.location.search);
  const allowedKeys = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

  return allowedKeys.reduce((campaign, key) => {
    const value = query.get(key);
    if (value) campaign[key] = value.slice(0, 500);
    return campaign;
  }, {});
}

function buildDescription() {
  const lines = [
    `Project type: ${getFieldValue("projectType")}`,
    `Property authority: ${getFieldValue("propertyAuthority")}`,
    `Project city: ${getFieldValue("projectCity")}`,
    `ZIP code: ${getFieldValue("zipCode")}`,
    `Approximate size: ${getFieldValue("approximateSize") || "Not provided"}`,
    `Preferred material: ${getFieldValue("preferredMaterial") || "Not provided"}`,
    `Planned investment: ${getFieldValue("budgetRange")}`,
    `Timeline: ${getFieldValue("projectTimeline")}`,
    `Preferred contact: ${getFieldValue("preferredContact")}`,
    `Best contact time: ${getFieldValue("bestContactTime") || "Not provided"}`,
    "",
    "Project details:",
    getFieldValue("projectDetails")
  ];

  return lines.join("\n");
}

function resetFormExperience() {
  form?.reset();
  if (selectedFiles) {
    selectedFiles.hidden = true;
    selectedFiles.textContent = "";
  }
  if (photoError) photoError.textContent = "";
  showStep(0, false);
}

document.querySelectorAll(".next-step").forEach((button) => {
  button.addEventListener("click", () => {
    const step = steps[currentStep];
    if (!validateStep(step)) return;

    trackEvent("deck_form_step_completed", {
      step_number: currentStep + 1,
      step_name: STEP_TITLES[currentStep]
    });

    showStep(currentStep + 1);
  });
});

document.querySelectorAll(".prev-step").forEach((button) => {
  button.addEventListener("click", () => showStep(currentStep - 1));
});

form?.addEventListener("input", () => {
  if (formStartedTracked) return;
  formStartedTracked = true;
  trackEvent("deck_lead_form_started");
});

projectPhotos?.addEventListener("change", validatePhotos);

document.querySelectorAll("[data-project-choice]").forEach((link) => {
  link.addEventListener("click", () => {
    const value = link.getAttribute("data-project-choice");
    const radio = form?.querySelector(`input[name="projectType"][value="${CSS.escape(value || "")}"]`);
    if (radio) radio.checked = true;
    showStep(0, false);
  });
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormStatus("");

  const invalidStepIndex = findFirstInvalidStep();
  if (invalidStepIndex !== -1) {
    showStep(invalidStepIndex);
    return;
  }

  const honeypot = getFieldValue("companyWebsite");
  if (honeypot) {
    resetFormExperience();
    form.hidden = true;
    successPanel.hidden = false;
    successPanel.focus();
    return;
  }

  if (!APPS_SCRIPT_URL) {
    setFormStatus("The form connection is unavailable. Please call or text ZH Homes directly.", "error");
    return;
  }

  const submitButton = form.querySelector(".submit-button");
  const originalButtonText = submitButton?.textContent || "Submit Project Request";

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    setFormStatus("Sending your project request...");

    const files = getPhotoFiles();
    const encodedPhotos = await readPhotosAsBase64(files);
    const campaign = getCampaignData();

    const payload = {
      source: "ZH Homes Deck Landing Page",
      pageUrl: window.location.href,
      submittedAt: new Date().toISOString(),
      contactReason: "deck_project_quote",
      fullName: getFieldValue("fullName"),
      email: getFieldValue("email"),
      phone: getFieldValue("phone"),
      serviceType: "Decks",
      description: buildDescription(),
      companyWebsite: honeypot,
      projectPhotos: encodedPhotos,
      projectType: getFieldValue("projectType"),
      propertyAuthority: getFieldValue("propertyAuthority"),
      projectCity: getFieldValue("projectCity"),
      zipCode: getFieldValue("zipCode"),
      approximateSize: getFieldValue("approximateSize"),
      preferredMaterial: getFieldValue("preferredMaterial"),
      budgetRange: getFieldValue("budgetRange"),
      projectTimeline: getFieldValue("projectTimeline"),
      preferredContact: getFieldValue("preferredContact"),
      bestContactTime: getFieldValue("bestContactTime"),
      formDurationSeconds: Math.max(1, Math.round((Date.now() - formLoadedAt) / 1000)),
      campaign
    };

    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    trackEvent("generate_lead", {
      lead_type: "deck_project",
      project_type: payload.projectType,
      project_city: payload.projectCity,
      budget_range: payload.budgetRange,
      project_timeline: payload.projectTimeline
    });

    trackEvent("deck_lead_submitted", {
      project_type: payload.projectType,
      project_city: payload.projectCity,
      budget_range: payload.budgetRange,
      project_timeline: payload.projectTimeline,
      photo_count: files.length
    });

    resetFormExperience();
    form.hidden = true;
    document.querySelector(".form-progress").hidden = true;
    successPanel.hidden = false;
    successPanel.focus();
  } catch (error) {
    console.error(error);
    setFormStatus("Something went wrong. Please call or text ZH Homes at (503) 910-5466.", "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  }
});

showStep(0, false);
