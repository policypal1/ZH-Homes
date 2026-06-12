const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxXzEXk_SKdgKbnBJfN8M3NNj-YHNgnunJ6YixlTF6r8O85lxNl6MLvAu_zcIJnw6Jjxw/exec";

const reviewCarousel = document.getElementById("reviewCarousel");
const reviewSlides = Array.from(document.querySelectorAll(".review-slide"));
const reviewDots = Array.from(document.querySelectorAll(".review-dot"));
const prevReviewBtn = document.querySelector(".review-arrow.prev");
const nextReviewBtn = document.querySelector(".review-arrow.next");
const quoteForm = document.getElementById("quoteForm");
const projectPhoto = document.getElementById("projectPhoto");
const fileError = document.getElementById("fileError");
const selectedFileRow = document.getElementById("selectedFileRow");
const selectedFileName = document.getElementById("selectedFileName");
const clearProjectPhoto = document.getElementById("clearProjectPhoto");
const formStatus = document.getElementById("formStatus");
const projectGalleryMobile = document.getElementById("projectGalleryMobile");
const projectGalleryTrack = projectGalleryMobile?.querySelector(".gallery-mobile-track");
const projectGallerySlides = Array.from(document.querySelectorAll(".gallery-mobile-slide"));
const projectGalleryDots = Array.from(document.querySelectorAll(".gallery-mobile-dot"));
const prevProjectGalleryBtn = document.querySelector(".gallery-mobile-arrow.prev");
const nextProjectGalleryBtn = document.querySelector(".gallery-mobile-arrow.next");

const contactSection = document.getElementById("contact");
const siteHeader = document.querySelector(".site-header");
const quoteSuccessOverlay = document.getElementById("quoteSuccessOverlay");

const MAX_IMAGE_FILES = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_IMAGE_SIZE = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

function scrollToQuoteSection(behavior = "smooth") {
  if (!contactSection) return;

  const headerHeight = siteHeader ? siteHeader.offsetHeight : 0;
  const extraGap = 18;
  const targetTop =
    contactSection.getBoundingClientRect().top +
    window.pageYOffset -
    headerHeight -
    extraGap;

  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior
  });
}

document.querySelectorAll('a[href="#contact"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    scrollToQuoteSection("smooth");

    window.setTimeout(() => scrollToQuoteSection("auto"), 450);
    window.setTimeout(() => scrollToQuoteSection("auto"), 900);

    if (history.pushState) {
      history.pushState(null, "", "#contact");
    }
  });
});

window.addEventListener("load", () => {
  if (window.location.hash === "#contact") {
    window.setTimeout(() => scrollToQuoteSection("auto"), 50);
  }
});

let currentReviewIndex = 0;

function showReview(index) {
  if (!reviewSlides.length) return;

  currentReviewIndex = (index + reviewSlides.length) % reviewSlides.length;

  reviewSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle("active", slideIndex === currentReviewIndex);
  });

  reviewDots.forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === currentReviewIndex);
  });
}

function nextReview() {
  showReview(currentReviewIndex + 1);
}

function prevReview() {
  showReview(currentReviewIndex - 1);
}

function showProjectGallerySlide(index) {
  if (!projectGalleryTrack || !projectGallerySlides.length) return;

  const slideIndex = (index + projectGallerySlides.length) % projectGallerySlides.length;
  projectGalleryTrack.style.transform = `translateX(-${slideIndex * 100}%)`;

  projectGalleryDots.forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === slideIndex);
  });

  projectGalleryTrack.dataset.index = String(slideIndex);
}

function nextProjectGallerySlide() {
  const current = Number(projectGalleryTrack?.dataset.index || 0);
  showProjectGallerySlide(current + 1);
}

function prevProjectGallerySlide() {
  const current = Number(projectGalleryTrack?.dataset.index || 0);
  showProjectGallerySlide(current - 1);
}

prevReviewBtn?.addEventListener("click", () => {
  prevReview();
});

nextReviewBtn?.addEventListener("click", () => {
  nextReview();
});

prevProjectGalleryBtn?.addEventListener("click", () => {
  prevProjectGallerySlide();
});

nextProjectGalleryBtn?.addEventListener("click", () => {
  nextProjectGallerySlide();
});

reviewDots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    showReview(index);
  });
});

projectGalleryDots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    showProjectGallerySlide(index);
  });
});

function getSelectedProjectPhotos() {
  return Array.from(projectPhoto?.files || []);
}

function clearSelectedProjectPhoto() {
  if (!projectPhoto) return;

  projectPhoto.value = "";
  projectPhoto.setCustomValidity("");

  if (fileError) fileError.style.display = "none";
  if (selectedFileName) selectedFileName.textContent = "";
  if (selectedFileRow) selectedFileRow.hidden = true;
}


function getFileExtension(fileName) {
  const parts = String(fileName || "").toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function isAllowedImageFile(file) {
  const typeAllowed = ALLOWED_IMAGE_TYPES.includes(file.type);
  const extensionAllowed = ALLOWED_IMAGE_EXTENSIONS.includes(getFileExtension(file.name));
  return typeAllowed && extensionAllowed;
}

function validateProjectPhotos(files) {
  if (!projectPhoto) return true;

  if (!files.length) {
    projectPhoto.setCustomValidity("");
    if (fileError) fileError.style.display = "none";
    return true;
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const hasNonImage = files.some((file) => !isAllowedImageFile(file));
  const hasOversizedFile = files.some((file) => file.size > MAX_IMAGE_SIZE);

  if (files.length > MAX_IMAGE_FILES || totalSize > MAX_TOTAL_IMAGE_SIZE || hasNonImage || hasOversizedFile) {
    projectPhoto.setCustomValidity("Please upload 1–4 JPG, PNG, WEBP, or GIF images. Each image must be 5MB or smaller and total uploads must stay under 20MB.");
    if (fileError) {
      fileError.textContent = "Please upload 1–4 JPG, PNG, WEBP, or GIF images. Each image must be 5MB or smaller and total uploads must stay under 20MB.";
      fileError.style.display = "block";
    }
    return false;
  }

  projectPhoto.setCustomValidity("");
  if (fileError) fileError.style.display = "none";
  return true;
}

function updateSelectedProjectPhotoText(files) {
  if (!selectedFileName || !selectedFileRow) return;

  if (!files.length) {
    selectedFileName.textContent = "";
    selectedFileRow.hidden = true;
    return;
  }

  const names = files.map((file) => file.name);
  selectedFileName.textContent = names.length === 1 ? names[0] : `${names.length} images selected: ${names.join(", ")}`;
  selectedFileRow.hidden = false;
}

projectPhoto?.addEventListener("change", () => {
  const files = getSelectedProjectPhotos();

  if (!files.length) {
    clearSelectedProjectPhoto();
    return;
  }

  if (!validateProjectPhotos(files)) {
    updateSelectedProjectPhotoText(files);
    return;
  }

  updateSelectedProjectPhotoText(files);
});

clearProjectPhoto?.addEventListener("click", clearSelectedProjectPhoto);

function setFormStatus(message, type = "") {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = `form-status ${type}`.trim();
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

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
    reader.onerror = () => reject(new Error("Could not read the uploaded image."));
    reader.readAsDataURL(file);
  });
}

async function readFilesAsBase64(files) {
  return Promise.all(files.map((file) => readFileAsBase64(file)));
}

function showQuoteSuccessAnimation() {
  const contactCard = document.querySelector(".contact-form-card");
  if (!contactCard || !quoteSuccessOverlay) return;

  contactCard.classList.add("quote-success-active");
  quoteSuccessOverlay.setAttribute("aria-hidden", "false");

  window.setTimeout(() => {
    contactCard.classList.remove("quote-success-active");
    quoteSuccessOverlay.setAttribute("aria-hidden", "true");
  }, 2600);
}

quoteForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const files = getSelectedProjectPhotos();

  if (!validateProjectPhotos(files)) {
    projectPhoto?.focus();
    return;
  }

  if (!quoteForm.checkValidity()) {
    quoteForm.reportValidity();
    return;
  }

  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("PASTE_YOUR")) {
    setFormStatus("The form is not connected yet. Add your Apps Script web app URL in script.js.", "error");
    return;
  }

  const submitBtn = quoteForm.querySelector(".submit-btn");
  const originalButtonText = submitBtn?.textContent || "Submit Quote Request";

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
    }
    setFormStatus("Sending your request...", "");

    const projectPhotos = await readFilesAsBase64(files);

    const payload = {
      source: "ZH Homes Website",
      pageUrl: window.location.href,
      submittedAt: new Date().toISOString(),
      contactReason: "project_quote",
      fullName: document.getElementById("fullName")?.value.trim() || "",
      email: document.getElementById("email")?.value.trim() || "",
      phone: document.getElementById("phone")?.value.trim() || "",
      serviceType: document.getElementById("serviceType")?.value.trim() || "",
      description: document.getElementById("description")?.value.trim() || "",
      companyWebsite: document.getElementById("companyWebsite")?.value.trim() || "",
      projectPhotos: projectPhotos
    };

    // Google Apps Script web apps often block browser reads with CORS.
    // mode: "no-cors" still sends the request, but does not try to read the response.
   await fetch(APPS_SCRIPT_URL, {
  method: "POST",
  mode: "no-cors",
  headers: {
    "Content-Type": "text/plain;charset=utf-8"
  },
  body: JSON.stringify(payload)
});

quoteForm.reset();
clearSelectedProjectPhoto();
setFormStatus("Thanks. Your quote request was submitted.", "success");
showQuoteSuccessAnimation();
  } catch (error) {
    console.error(error);
    setFormStatus("Something went wrong. Please call or text ZH Homes directly.", "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalButtonText;
    }
  }
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

document.querySelectorAll(".needs-photo-view-btn").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    button.closest(".needs-photo-marker")?.classList.add("photo-overlay-hidden");
  });
});

const imageLightbox = document.getElementById("imageLightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");

function openImageLightbox(src, altText) {
  if (!imageLightbox || !lightboxImage) return;

  lightboxImage.src = src;
  lightboxImage.alt = altText || "Expanded project image";
  imageLightbox.hidden = false;

  requestAnimationFrame(() => {
    imageLightbox.classList.add("is-open");
    document.body.classList.add("lightbox-open");
  });
}

function closeImageLightbox() {
  if (!imageLightbox || !lightboxImage) return;

  imageLightbox.classList.remove("is-open");
  document.body.classList.remove("lightbox-open");

  window.setTimeout(() => {
    imageLightbox.hidden = true;
    lightboxImage.src = "";
    lightboxImage.alt = "";
  }, 200);
}

const expandableImageSelectors = [
  ".photo-main",
  ".photo-small",
  ".service-image",
  ".mission-image-box",
  ".gallery-item",
  ".gallery-mobile-mini",
  ".hero-mobile-collage-main",
  ".hero-mobile-collage-small"
].join(",");

document.querySelectorAll(expandableImageSelectors).forEach((imageBox) => {
  const image = imageBox.querySelector("img");
  if (!image || imageBox.querySelector(".expand-photo-btn")) return;

  imageBox.classList.add("image-expandable");

  const expandButton = document.createElement("button");
  expandButton.type = "button";
  expandButton.className = "expand-photo-btn";
  expandButton.setAttribute("aria-label", `Expand image${image.alt ? ": " + image.alt : ""}`);
  expandButton.innerHTML = '<span class="expand-photo-label">View</span>';

  imageBox.appendChild(expandButton);

  expandButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openImageLightbox(image.currentSrc || image.src, image.alt);
  });
});

lightboxClose?.addEventListener("click", closeImageLightbox);

imageLightbox?.addEventListener("click", (event) => {
  if (event.target === imageLightbox) {
    closeImageLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && imageLightbox?.classList.contains("is-open")) {
    closeImageLightbox();
  }
});

showReview(0);
showProjectGallerySlide(0);
