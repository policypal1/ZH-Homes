"use strict";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzkP7uw_JmciP2Qr66GUHT4VT-4Qx1ZlhACFkGM3mzKzheInsua1ItBdHzXWFqq8RcO/exec";

const form = document.getElementById("bathroomQuoteForm");
const estimateCard = document.getElementById("estimate");
const formSuccess = document.getElementById("formSuccess");
const formStatus = document.getElementById("formStatus");
const stepLabel = document.getElementById("formStepLabel");
const progressBar = document.getElementById("formProgressBar");
const nextButton = document.getElementById("nextFormStep");
const backButton = document.getElementById("backFormStep");
const projectTypeError = document.getElementById("projectTypeError");
const projectCity = document.getElementById("projectCity");
const projectPhoto = document.getElementById("projectPhoto");
const fileError = document.getElementById("fileError");
const selectedFiles = document.getElementById("selectedFiles");
const selectedFileName = document.getElementById("selectedFileName");
const clearProjectPhoto = document.getElementById("clearProjectPhoto");

const MAX_FILES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

let currentStep = 1;

function setStatus(message, type = "") {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = `form-status ${type}`.trim();
}

function showStep(step, options = {}) {
  if (!form) return;
  currentStep = step;

  form.querySelectorAll("[data-form-step]").forEach((panel) => {
    panel.hidden = Number(panel.dataset.formStep) !== step;
  });

  if (stepLabel) stepLabel.textContent = `Step ${step} of 2`;
  if (progressBar) progressBar.style.width = step === 1 ? "50%" : "100%";
  setStatus("");

  if (options.focus) {
    const firstField = form.querySelector(`[data-form-step="${step}"] input:not([type="hidden"]), [data-form-step="${step}"] select, [data-form-step="${step}"] textarea`);
    window.setTimeout(() => firstField?.focus({ preventScroll: true }), 0);
  }

}

function selectedProjectType() {
  return form?.querySelector('input[name="serviceType"]:checked')?.value || "";
}

function validateStepOne() {
  let valid = true;
  const projectType = selectedProjectType();

  if (!projectType) {
    valid = false;
    if (projectTypeError) projectTypeError.textContent = "Choose the option that is closest to your project.";
  } else if (projectTypeError) {
    projectTypeError.textContent = "";
  }

  if (projectCity && !projectCity.value.trim()) {
    valid = false;
    projectCity.setAttribute("aria-invalid", "true");
  } else {
    projectCity?.removeAttribute("aria-invalid");
  }

  if (!valid) {
    if (!projectType) {
      form?.querySelector('input[name="serviceType"]')?.focus();
    } else {
      projectCity?.focus();
    }
  }

  return valid;
}

function getExtension(fileName) {
  const pieces = String(fileName || "").toLowerCase().split(".");
  return pieces.length > 1 ? pieces.pop() : "";
}

function validImage(file) {
  return ALLOWED_TYPES.has(file.type) || (!file.type && ALLOWED_EXTENSIONS.has(getExtension(file.name)));
}

function selectedPhotoFiles() {
  return Array.from(projectPhoto?.files || []);
}

function validateFiles(files) {
  if (!projectPhoto) return true;

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const invalid =
    files.length > MAX_FILES ||
    totalSize > MAX_TOTAL_SIZE ||
    files.some((file) => file.size > MAX_FILE_SIZE || !validImage(file));

  const message = invalid
    ? "Upload up to 4 JPG, PNG, WEBP, or GIF images. Keep each image under 5MB."
    : "";

  projectPhoto.setCustomValidity(message);
  projectPhoto.toggleAttribute("aria-invalid", invalid);
  if (fileError) fileError.textContent = message;
  return !invalid;
}

function updateSelectedFiles(files) {
  if (!selectedFiles || !selectedFileName) return;

  if (!files.length) {
    selectedFiles.hidden = true;
    selectedFileName.textContent = "";
    return;
  }

  selectedFileName.textContent =
    files.length === 1 ? files[0].name : `${files.length} project photos selected`;
  selectedFiles.hidden = false;
}

function clearFiles() {
  if (!projectPhoto) return;
  projectPhoto.value = "";
  projectPhoto.setCustomValidity("");
  projectPhoto.removeAttribute("aria-invalid");
  if (fileError) fileError.textContent = "";
  updateSelectedFiles([]);
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        base64: result.includes(",") ? result.split(",")[1] : result,
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

nextButton?.addEventListener("click", () => {
  if (!validateStepOne()) return;
  showStep(2, { focus: true });
});

backButton?.addEventListener("click", () => showStep(1, { focus: true }));

form?.querySelectorAll('input[name="serviceType"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (projectTypeError) projectTypeError.textContent = "";
  });
});

projectCity?.addEventListener("input", () => projectCity.removeAttribute("aria-invalid"));

projectPhoto?.addEventListener("change", () => {
  const files = selectedPhotoFiles();
  validateFiles(files);
  updateSelectedFiles(files);
});

clearProjectPhoto?.addEventListener("click", clearFiles);

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateStepOne()) {
    showStep(1);
    return;
  }

  if (currentStep !== 2) {
    showStep(2, { focus: true });
    return;
  }

  const files = selectedPhotoFiles();
  if (!validateFiles(files)) {
    projectPhoto?.focus();
    return;
  }

  if (!form.checkValidity()) {
    form.querySelectorAll(":invalid").forEach((field) => field.setAttribute("aria-invalid", "true"));
    form.reportValidity();
    return;
  }

  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(APPS_SCRIPT_URL)) {
    setStatus("The form connection needs attention. Please call or text (503) 910-5466.", "error");
    return;
  }

  const submitButton = form.querySelector(".submit-button");
  const originalText = submitButton?.textContent || "Send my request";
  const honeypot = document.getElementById("companyWebsite")?.value.trim() || "";

  try {
    document.body.classList.add("form-busy");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending…";
    }
    setStatus("Sending your request…");

    if (honeypot) {
      await new Promise((resolve) => window.setTimeout(resolve, 450));
    } else {
      const projectPhotos = await Promise.all(files.map(readFile));
      const city = projectCity?.value.trim() || "";
      const timing = document.getElementById("projectTiming")?.value.trim() || "Not selected";
      const customerDescription = document.getElementById("description")?.value.trim() || "";

      const payload = {
        source: "ZH Homes Bathroom Remodel Landing Page",
        fullName: document.getElementById("fullName")?.value.trim() || "",
        email: document.getElementById("email")?.value.trim() || "",
        phone: document.getElementById("phone")?.value.trim() || "",
        serviceType: selectedProjectType(),
        projectCity: city,
        projectTiming: timing,
        description: `Project city: ${city}\nIdeal timing: ${timing}\n\n${customerDescription}`,
        companyWebsite: "",
        projectPhotos,
      };

      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
    }

    form.reset();
    clearFiles();
    form.hidden = true;
    document.querySelector(".estimate-heading")?.setAttribute("hidden", "");
    formSuccess.hidden = false;
    formSuccess.focus({ preventScroll: true });
    setStatus("");
  } catch (error) {
    console.error(error);
    setStatus("Something went wrong. Please call or text ZH Homes at (503) 910-5466.", "error");
  } finally {
    document.body.classList.remove("form-busy");
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
});

form?.querySelectorAll("input, select, textarea").forEach((field) => {
  field.addEventListener("input", () => field.removeAttribute("aria-invalid"));
  field.addEventListener("change", () => field.removeAttribute("aria-invalid"));
});

document.querySelectorAll('.faq-list details').forEach((details) => {
  details.addEventListener("toggle", () => {
    if (!details.open) return;
    document.querySelectorAll('.faq-list details[open]').forEach((other) => {
      if (other !== details) other.open = false;
    });
  });
});

document.querySelectorAll('a[href="#estimate"]').forEach((link) => {
  link.addEventListener("click", () => {
    window.setTimeout(() => {
      if (currentStep === 1) {
        form?.querySelector('input[name="serviceType"]')?.focus({ preventScroll: true });
      }
    }, 500);
  });
});

if (estimateCard && window.location.hash === "#estimate") {
  window.setTimeout(() => estimateCard.scrollIntoView({ block: "start" }), 60);
}

showStep(1);
