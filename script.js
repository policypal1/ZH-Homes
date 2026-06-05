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
const projectGalleryMobile = document.getElementById("projectGalleryMobile");
const projectGalleryTrack = projectGalleryMobile?.querySelector(".gallery-mobile-track");
const projectGallerySlides = Array.from(document.querySelectorAll(".gallery-mobile-slide"));
const projectGalleryDots = Array.from(document.querySelectorAll(".gallery-mobile-dot"));
const prevProjectGalleryBtn = document.querySelector(".gallery-mobile-arrow.prev");
const nextProjectGalleryBtn = document.querySelector(".gallery-mobile-arrow.next");

let currentReviewIndex = 0;

function setupTestimonialsContent() {
  const testimonialsLeft = document.querySelector(".testimonials-left");
  const slides = Array.from(document.querySelectorAll(".review-slide"));

  if (testimonialsLeft && !testimonialsLeft.querySelector(".testimonials-actions")) {
    const actions = document.createElement("div");
    actions.className = "testimonials-actions";

    const googleReviewsButton = document.createElement("a");
    googleReviewsButton.className = "google-reviews-btn";
    googleReviewsButton.href = "https://share.google/Ry8oCcymMj5uC";
    googleReviewsButton.target = "_blank";
    googleReviewsButton.rel = "noopener noreferrer";
    googleReviewsButton.textContent = "See Google Reviews";

    actions.appendChild(googleReviewsButton);
    testimonialsLeft.appendChild(actions);
  }

  if (slides[0]) {
    const tawnyaStars = slides[0].querySelector(".review-stars");
    const tawnyaText = slides[0].querySelector(".review-text");

    if (tawnyaStars) {
      tawnyaStars.setAttribute("aria-label", "5 out of 5 stars");
      tawnyaStars.innerHTML = `
        <span class="review-star-icons">★★★★★</span>
        <span class="review-star-label">Google Review</span>
      `;
    }

    if (tawnyaText) {
      tawnyaText.textContent =
        "If you need someone who shows up, gives a professional bid, and gets things done on time and within the agreed bid contract, you need to call and get on their schedule. I know he is in high demand, so don’t wait.";
    }
  }

  if (slides[1]) {
    const janStars = slides[1].querySelector(".review-stars");
    const janText = slides[1].querySelector(".review-text");
    const janAuthorLabel = slides[1].querySelector(".review-person span");

    if (janStars) {
      janStars.setAttribute("aria-label", "5 out of 5 stars");
      janStars.innerHTML = `
        <span class="review-star-icons">★★★★★</span>
        <span class="review-star-label">Google Review</span>
      `;
    }

    if (janText) {
      janText.classList.remove("review-rating-only");
      janText.textContent = "Jan Bryant left a 5-star rating on Google.";
    }

    if (janAuthorLabel) {
      janAuthorLabel.textContent = "Google Review";
    }
  }
}

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

function clearSelectedProjectPhoto() {
  if (!projectPhoto) return;

  projectPhoto.value = "";
  projectPhoto.setCustomValidity("");

  if (fileError) fileError.style.display = "none";
  if (selectedFileName) selectedFileName.textContent = "";
  if (selectedFileRow) selectedFileRow.hidden = true;
}

projectPhoto?.addEventListener("change", () => {
  const file = projectPhoto.files?.[0];

  if (!file) {
    clearSelectedProjectPhoto();
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    if (fileError) fileError.style.display = "block";
    clearSelectedProjectPhoto();
    projectPhoto.setCustomValidity("Please upload an image that is 10MB or smaller.");
  } else {
    if (fileError) fileError.style.display = "none";
    projectPhoto.setCustomValidity("");

    if (selectedFileName) selectedFileName.textContent = file.name;
    if (selectedFileRow) selectedFileRow.hidden = false;
  }
});

clearProjectPhoto?.addEventListener("click", clearSelectedProjectPhoto);

quoteForm?.addEventListener("submit", (event) => {
  const file = projectPhoto?.files?.[0];

  if (file && file.size > 10 * 1024 * 1024) {
    event.preventDefault();

    if (fileError) fileError.style.display = "block";
    projectPhoto.focus();
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

setupTestimonialsContent();
showReview(0);
showProjectGallerySlide(0);
