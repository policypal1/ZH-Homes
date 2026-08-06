'use strict';

// Paste the /exec URL from the new Google Apps Script deployment here.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzkP7uw_JmciP2Qr66GUHT4VT-4Qx1ZlhACFkGM3mzKzheInsua1ItBdHzXWFqq8RcO/exec';

const quoteForm = document.getElementById('quoteForm');
const projectPhoto = document.getElementById('projectPhoto');
const fileError = document.getElementById('fileError');
const selectedFileRow = document.getElementById('selectedFileRow');
const selectedFileName = document.getElementById('selectedFileName');
const clearProjectPhoto = document.getElementById('clearProjectPhoto');
const formStatus = document.getElementById('formStatus');
const quoteSuccessOverlay = document.getElementById('quoteSuccessOverlay');
const contactSection = document.getElementById('contact');
const siteHeader = document.querySelector('.site-header');

const MAX_FILES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

function scrollToQuoteSection(behavior = 'smooth') {
  if (!contactSection) return;
  const headerHeight = siteHeader ? siteHeader.offsetHeight : 0;
  const target = contactSection.getBoundingClientRect().top + window.scrollY - headerHeight - 18;
  window.scrollTo({ top: Math.max(0, target), behavior });
}

document.querySelectorAll('a[href="#contact"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    scrollToQuoteSection('smooth');
    window.setTimeout(() => scrollToQuoteSection('auto'), 500);
    if (history.pushState) history.pushState(null, '', '#contact');
  });
});

window.addEventListener('load', () => {
  if (window.location.hash === '#contact') {
    window.setTimeout(() => scrollToQuoteSection('auto'), 50);
  }
});

function getFiles() {
  return Array.from(projectPhoto?.files || []);
}

function getExtension(fileName) {
  const parts = String(fileName || '').toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function isAllowedImage(file) {
  return ALLOWED_TYPES.has(file.type) || (!file.type && ALLOWED_EXTENSIONS.has(getExtension(file.name)));
}

function validateFiles(files) {
  if (!projectPhoto) return true;
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const invalid =
    files.length > MAX_FILES ||
    totalSize > MAX_TOTAL_SIZE ||
    files.some((file) => file.size > MAX_FILE_SIZE || !isAllowedImage(file));

  const message = 'Upload up to 4 JPG, PNG, WEBP, or GIF images. Each image must be 5MB or smaller.';
  projectPhoto.setCustomValidity(invalid ? message : '');

  if (fileError) {
    fileError.textContent = invalid ? message : '';
    fileError.style.display = invalid ? 'block' : 'none';
  }

  return !invalid;
}

function updateSelectedFiles(files) {
  if (!selectedFileName || !selectedFileRow) return;
  if (!files.length) {
    selectedFileName.textContent = '';
    selectedFileRow.hidden = true;
    return;
  }

  selectedFileName.textContent =
    files.length === 1 ? files[0].name : `${files.length} images selected`;
  selectedFileRow.hidden = false;
}

function clearFiles() {
  if (!projectPhoto) return;
  projectPhoto.value = '';
  projectPhoto.setCustomValidity('');
  if (fileError) {
    fileError.textContent = '';
    fileError.style.display = 'none';
  }
  updateSelectedFiles([]);
}

projectPhoto?.addEventListener('change', () => {
  const files = getFiles();
  validateFiles(files);
  updateSelectedFiles(files);
});

clearProjectPhoto?.addEventListener('click', clearFiles);

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        base64: result.includes(',') ? result.split(',')[1] : result
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function setStatus(message, type = '') {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = `form-status ${type}`.trim();
}

function showSuccess() {
  const card = document.querySelector('.contact-form-card');
  if (!card || !quoteSuccessOverlay) return;
  card.classList.add('quote-success-active');
  quoteSuccessOverlay.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => {
    card.classList.remove('quote-success-active');
    quoteSuccessOverlay.setAttribute('aria-hidden', 'true');
  }, 3000);
}

quoteForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const files = getFiles();
  if (!validateFiles(files)) {
    projectPhoto?.focus();
    return;
  }

  if (!quoteForm.checkValidity()) {
    quoteForm.reportValidity();
    return;
  }

  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(APPS_SCRIPT_URL)) {
    setStatus('The form is not connected. Paste the new Apps Script /exec URL into script.js.', 'error');
    return;
  }

  const submitButton = quoteForm.querySelector('.submit-btn');
  const originalText = submitButton?.textContent || 'Submit Quote Request';

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
    }
    setStatus('Sending your request...');

    const projectPhotos = await Promise.all(files.map(readFile));
    const payload = {
      source: 'ZH Homes Website',
      pageUrl: window.location.href,
      submittedAt: new Date().toISOString(),
      contactReason: 'project_quote',
      fullName: document.getElementById('fullName')?.value.trim() || '',
      email: document.getElementById('email')?.value.trim() || '',
      phone: document.getElementById('phone')?.value.trim() || '',
      serviceType: document.getElementById('serviceType')?.value.trim() || '',
      description: document.getElementById('description')?.value.trim() || '',
      companyWebsite: document.getElementById('companyWebsite')?.value.trim() || '',
      projectPhotos
    };

    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    quoteForm.reset();
    clearFiles();
    setStatus('Thanks. Your quote request was submitted.', 'success');
    showSuccess();
  } catch (error) {
    console.error(error);
    setStatus('Something went wrong. Please call or text ZH Homes at (503) 910-5466.', 'error');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
});

// Review carousel
const reviewSlides = Array.from(document.querySelectorAll('.review-slide'));
const reviewDots = Array.from(document.querySelectorAll('.review-dot'));
let reviewIndex = 0;

function showReview(index) {
  if (!reviewSlides.length) return;
  reviewIndex = (index + reviewSlides.length) % reviewSlides.length;
  reviewSlides.forEach((slide, i) => slide.classList.toggle('active', i === reviewIndex));
  reviewDots.forEach((dot, i) => dot.classList.toggle('active', i === reviewIndex));
}

document.querySelector('.review-arrow.prev')?.addEventListener('click', () => showReview(reviewIndex - 1));
document.querySelector('.review-arrow.next')?.addEventListener('click', () => showReview(reviewIndex + 1));
reviewDots.forEach((dot, index) => dot.addEventListener('click', () => showReview(index)));
showReview(0);

// Mobile gallery
const galleryTrack = document.querySelector('#projectGalleryMobile .gallery-mobile-track');
const gallerySlides = Array.from(document.querySelectorAll('.gallery-mobile-slide'));
const galleryDots = Array.from(document.querySelectorAll('.gallery-mobile-dot'));
let galleryIndex = 0;

function showGallery(index) {
  if (!galleryTrack || !gallerySlides.length) return;
  galleryIndex = (index + gallerySlides.length) % gallerySlides.length;
  galleryTrack.style.transform = `translateX(-${galleryIndex * 100}%)`;
  galleryDots.forEach((dot, i) => dot.classList.toggle('active', i === galleryIndex));
}

document.querySelector('.gallery-mobile-arrow.prev')?.addEventListener('click', () => showGallery(galleryIndex - 1));
document.querySelector('.gallery-mobile-arrow.next')?.addEventListener('click', () => showGallery(galleryIndex + 1));
galleryDots.forEach((dot, index) => dot.addEventListener('click', () => showGallery(index)));
showGallery(0);

// Mobile CTA visibility
const hero = document.querySelector('.hero');
const mobileCtaBar = document.querySelector('.mobile-cta-bar');
const mobileQuery = window.matchMedia('(max-width: 950px)');
let ticking = false;

function updateMobileCta() {
  ticking = false;
  if (!hero || !mobileCtaBar || !mobileQuery.matches) {
    document.body.classList.remove('hero-cta-visible');
    return;
  }
  const rect = hero.getBoundingClientRect();
  const heroTop = window.scrollY + rect.top;
  const progress = Math.max(0, (window.scrollY - heroTop) / Math.max(rect.height, 1));
  document.body.classList.toggle('hero-cta-visible', progress >= 0.6);
}

function requestMobileCtaUpdate() {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(updateMobileCta);
}

window.addEventListener('scroll', requestMobileCtaUpdate, { passive: true });
window.addEventListener('resize', requestMobileCtaUpdate);
mobileQuery.addEventListener?.('change', requestMobileCtaUpdate);
updateMobileCta();

// Image lightbox
const imageLightbox = document.getElementById('imageLightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxClose = document.getElementById('lightboxClose');

function openLightbox(image) {
  if (!imageLightbox || !lightboxImage || !image) return;
  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt || 'Expanded project image';
  imageLightbox.hidden = false;
  requestAnimationFrame(() => {
    imageLightbox.classList.add('is-open');
    document.body.classList.add('lightbox-open');
  });
}

function closeLightbox() {
  if (!imageLightbox || !lightboxImage) return;
  imageLightbox.classList.remove('is-open');
  document.body.classList.remove('lightbox-open');
  window.setTimeout(() => {
    imageLightbox.hidden = true;
    lightboxImage.src = '';
  }, 200);
}

const expandableSelectors = [
  '.photo-main', '.photo-small', '.service-image', '.mission-image-box',
  '.gallery-item', '.gallery-mobile-mini', '.hero-mobile-collage-main',
  '.hero-mobile-collage-small'
].join(',');

document.querySelectorAll(expandableSelectors).forEach((box) => {
  const image = box.querySelector('img');
  if (!image || box.querySelector('.expand-photo-btn')) return;
  box.classList.add('image-expandable');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'expand-photo-btn';
  button.setAttribute('aria-label', `Expand image${image.alt ? `: ${image.alt}` : ''}`);
  button.innerHTML = '<span class="expand-photo-label">View</span>';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openLightbox(image);
  });
  box.appendChild(button);
});

lightboxClose?.addEventListener('click', closeLightbox);
imageLightbox?.addEventListener('click', (event) => {
  if (event.target === imageLightbox) closeLightbox();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && imageLightbox?.classList.contains('is-open')) closeLightbox();
});
