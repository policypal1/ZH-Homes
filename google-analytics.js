(() => {
  "use strict";

  const MEASUREMENT_ID = "G-YGW64HPK3W";
  const PAGE_TYPE = "deck_landing_page";
  const DEBUG_MODE =
    new URLSearchParams(window.location.search).get("ga_debug") === "1" ||
    ["localhost", "127.0.0.1"].includes(window.location.hostname);

  const SAFE_CAMPAIGN_PARAMETERS = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "gbraid",
    "wbraid",
    "gad_source"
  ]);

  const BLOCKED_PARAMETER_NAMES = new Set([
    "fullname",
    "full_name",
    "firstname",
    "first_name",
    "lastname",
    "last_name",
    "name",
    "email",
    "email_address",
    "phone",
    "phone_number",
    "zipcode",
    "zip_code",
    "postal_code",
    "address",
    "street",
    "projectdetails",
    "project_details",
    "description",
    "message",
    "file_name",
    "filename"
  ]);

  const SAFE_CATEGORICAL_FIELDS = new Set([
    "homeownerStatus",
    "currentSetup",
    "materialPreference",
    "deckSize",
    "desiredFeatures",
    "projectTiming",
    "budgetRange",
    "contactPreference",
    "newDeckConfirmation"
  ]);

  const state = {
    maximumScrollPercent: 0,
    activeSeconds: 0,
    pageExitSent: false,
    startedForms: new Map(),
    completedForms: new Set(),
    fieldInteractions: new Set(),
    viewedSections: new Set(),
    viewedCtas: new Set(),
    engagementThresholds: new Set(),
    scrollThresholds: new Set(),
    performanceSent: false,
    vitalsSent: false,
    lcp: 0,
    cls: 0,
    inp: 0,
    fcp: 0
  };

  function clampText(value, maximumLength = 100) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maximumLength);
  }

  function redactPotentialPii(value) {
    return clampText(value, 250)
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
      .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, "[redacted-phone]")
      .replace(/\b\d{5}(?:-\d{4})?\b/g, "[redacted-postal-code]");
  }

  function safePageLocation() {
    const url = new URL(window.location.href);
    const safeSearch = new URLSearchParams();

    url.searchParams.forEach((value, key) => {
      if (SAFE_CAMPAIGN_PARAMETERS.has(key.toLowerCase())) {
        safeSearch.set(key, clampText(value, 100));
      }
    });

    url.search = safeSearch.toString();
    url.hash = "";
    url.username = "";
    url.password = "";
    return url.toString();
  }

  function safeLinkUrl(rawUrl) {
    if (!rawUrl) return "";

    try {
      const url = new URL(rawUrl, window.location.href);

      if (url.protocol === "tel:") return "tel:";
      if (url.protocol === "mailto:") return "mailto:";

      url.username = "";
      url.password = "";
      url.search = "";
      url.hash = "";
      return url.toString().slice(0, 250);
    } catch {
      return "";
    }
  }

  function referrerDomain() {
    if (!document.referrer) return "direct";

    try {
      return new URL(document.referrer).hostname || "direct";
    } catch {
      return "unknown";
    }
  }

  function viewportBucket() {
    const width = window.innerWidth;
    if (width < 600) return "mobile";
    if (width < 951) return "tablet";
    return "desktop";
  }

  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
  }

  function cleanParameters(parameters = {}) {
    const cleaned = {};

    Object.entries(parameters).forEach(([rawKey, rawValue]) => {
      const key = clampText(rawKey, 40).replace(/[^a-zA-Z0-9_]/g, "_");
      if (!key || BLOCKED_PARAMETER_NAMES.has(key.toLowerCase())) return;
      if (rawValue === undefined || rawValue === null || typeof rawValue === "function") return;

      if (typeof rawValue === "boolean") {
        cleaned[key] = rawValue;
        return;
      }

      if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
        cleaned[key] = Math.round(rawValue * 1000) / 1000;
        return;
      }

      if (typeof rawValue === "string") {
        cleaned[key] = redactPotentialPii(rawValue).slice(0, 100);
      }
    });

    return cleaned;
  }

  window.dataLayer = window.dataLayer || [];
  const nativeDataLayerPush = window.dataLayer.push.bind(window.dataLayer);

  window.gtag =
    window.gtag ||
    function gtag() {
      nativeDataLayerPush(arguments);
    };

  function sendEvent(eventName, parameters = {}, options = {}) {
    const safeEventName = clampText(eventName, 40).replace(/[^a-zA-Z0-9_]/g, "_");
    if (!safeEventName) return;

    const eventParameters = {
      page_type: PAGE_TYPE,
      page_path: window.location.pathname,
      viewport_type: viewportBucket(),
      ...cleanParameters(parameters)
    };

    if (DEBUG_MODE) eventParameters.debug_mode = true;
    if (options.beacon) eventParameters.transport_type = "beacon";

    window.gtag("event", safeEventName, eventParameters);
  }

  /*
   * deck.js already pushes useful objects such as:
   * { event: "deck_phone_click", page_path: "/decks.html" }
   * This bridge forwards those existing events to GA4 without changing deck.js.
   */
  window.dataLayer.push = function pushWithGa4Bridge(...items) {
    const result = nativeDataLayerPush(...items);

    items.forEach((item) => {
      if (!isPlainObject(item) || typeof item.event !== "string") return;
      if (item.__zhAnalyticsForwarded) return;
      if (/^(?:gtm\.|gtag\.|_)/i.test(item.event)) return;

      const { event, __zhAnalyticsForwarded, ...parameters } = item;
      sendEvent(event, parameters);

      if (event === "deck_lead_submit") {
        const formName = clampText(parameters.form_name || "deck_estimate", 100);
        state.completedForms.add(formName);

        sendEvent("generate_lead", {
          lead_source: "deck_estimate_form",
          form_name: formName,
          material_preference: parameters.material_preference,
          current_setup: parameters.current_setup,
          deck_size: parameters.deck_size
        });
      }
    });

    return result;
  };

  const googleTagScript = document.createElement("script");
  googleTagScript.async = true;
  googleTagScript.src =
    "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
  document.head.appendChild(googleTagScript);

  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, {
    send_page_view: true,
    page_location: safePageLocation(),
    page_title: document.title,
    page_path: window.location.pathname,
    debug_mode: DEBUG_MODE
  });

  function elementLocation(element) {
    const container = element.closest(
      "section[id], header, footer, .mobile-cta-bar, .hero-quick-card, .deck-form-card"
    );

    if (!container) return "unknown";
    if (container.id) return clampText(container.id, 60);
    if (container.classList.contains("mobile-cta-bar")) return "mobile_sticky_cta";
    if (container.classList.contains("hero-quick-card")) return "hero_estimate_form";
    if (container.classList.contains("deck-form-card")) return "main_estimate_form";
    if (container.tagName === "HEADER") return "header";
    if (container.tagName === "FOOTER") return "footer";
    return clampText(container.className, 60);
  }

  function elementText(element) {
    const ariaLabel = element.getAttribute("aria-label");
    return redactPotentialPii(ariaLabel || element.textContent || element.value || "").slice(0, 100);
  }

  function formName(form) {
    return clampText(form.dataset.formSource || form.id || "deck_estimate", 100);
  }

  function currentFormStep(form) {
    const steps = Array.from(form.querySelectorAll(".estimate-step"));
    const activeStep = steps.find(
      (step) => !step.hidden && (step.classList.contains("active") || step.offsetParent !== null)
    );
    const index = Math.max(0, steps.indexOf(activeStep));

    return {
      number: index + 1,
      total: steps.length,
      title: clampText(
        activeStep?.dataset.stepTitle ||
          activeStep?.querySelector(".estimate-step-heading span")?.textContent ||
          "unknown",
        100
      )
    };
  }

  function trackClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const interactive = target?.closest("a, button, summary, [role='button']");
    if (!interactive) return;

    const location = elementLocation(interactive);
    const text = elementText(interactive);
    const href = interactive instanceof HTMLAnchorElement ? interactive.getAttribute("href") || "" : "";

    if (href.toLowerCase().startsWith("tel:")) {
      sendEvent("click_to_call", {
        cta_text: text,
        cta_location: location,
        link_type: "telephone"
      });
      return;
    }

    if (href === "#estimate" || href === "#hero-estimate") {
      sendEvent("estimate_cta_click", {
        cta_text: text,
        cta_location: location,
        destination: href.replace("#", "")
      });
      return;
    }

    if (interactive.matches(".estimate-next")) {
      const form = interactive.closest("form");
      if (form) {
        const step = currentFormStep(form);
        sendEvent("deck_form_next", {
          form_name: formName(form),
          form_step: step.number,
          form_step_name: step.title,
          form_step_total: step.total
        });

        window.setTimeout(() => {
          const nextStep = currentFormStep(form);
          sendEvent("deck_form_step_view", {
            form_name: formName(form),
            form_step: nextStep.number,
            form_step_name: nextStep.title,
            form_step_total: nextStep.total
          });
        }, 0);
      }
      return;
    }

    if (interactive.matches(".estimate-back")) {
      const form = interactive.closest("form");
      if (form) {
        const step = currentFormStep(form);
        sendEvent("deck_form_back", {
          form_name: formName(form),
          form_step: step.number,
          form_step_name: step.title,
          form_step_total: step.total
        });
      }
      return;
    }

    if (interactive.matches(".review-arrow, .review-dot")) {
      sendEvent("review_carousel_click", {
        control: interactive.classList.contains("prev")
          ? "previous"
          : interactive.classList.contains("next")
            ? "next"
            : text || "dot",
        cta_location: location
      });
      return;
    }

    if (interactive.matches(".google-reviews-btn")) {
      sendEvent("google_reviews_click", {
        cta_text: text,
        cta_location: location
      });
      return;
    }

    if (interactive.matches("summary")) {
      sendEvent("faq_toggle_click", {
        faq_question: text,
        faq_location: location
      });
      return;
    }

    if (href) {
      const destination = new URL(href, window.location.href);
      const outbound = destination.hostname && destination.hostname !== window.location.hostname;

      if (outbound) {
        sendEvent("deck_outbound_click", {
          link_domain: destination.hostname,
          link_url: safeLinkUrl(destination.href),
          link_text: text,
          link_location: location
        });
      } else {
        sendEvent("deck_navigation_click", {
          link_url: safeLinkUrl(destination.href),
          link_text: text,
          link_location: location
        });
      }
      return;
    }

    sendEvent("deck_button_click", {
      button_text: text,
      button_location: location,
      button_classes: clampText(interactive.className, 100)
    });
  }

  function trackFormInteraction(event) {
    const control = event.target instanceof Element ? event.target.closest("input, select, textarea") : null;
    const form = control?.closest("form.deck-multistep-form");
    if (!control || !form) return;

    const name = formName(form);
    const fieldName = clampText(control.getAttribute("name") || control.id || control.tagName, 60);

    if (!state.startedForms.has(name)) {
      state.startedForms.set(name, Date.now());
      const step = currentFormStep(form);
      sendEvent("deck_form_start", {
        form_name: name,
        form_id: form.id,
        form_step: step.number,
        form_step_name: step.title
      });
    }

    const fieldKey = `${name}:${fieldName}`;
    if (!state.fieldInteractions.has(fieldKey)) {
      state.fieldInteractions.add(fieldKey);
      sendEvent("deck_form_field_start", {
        form_name: name,
        field_name: fieldName,
        field_type: control.getAttribute("type") || control.tagName.toLowerCase(),
        form_step: currentFormStep(form).number
      });
    }
  }

  function trackFormChange(event) {
    const control = event.target instanceof Element ? event.target.closest("input, select, textarea") : null;
    const form = control?.closest("form.deck-multistep-form");
    if (!control || !form) return;

    const fieldName = control.getAttribute("name") || "";
    const parameters = {
      form_name: formName(form),
      field_name: clampText(fieldName || control.id || control.tagName, 60),
      field_type: control.getAttribute("type") || control.tagName.toLowerCase(),
      form_step: currentFormStep(form).number
    };

    if (SAFE_CATEGORICAL_FIELDS.has(fieldName)) {
      parameters.option_selected = clampText(control.value, 100);
      parameters.option_checked = "checked" in control ? Boolean(control.checked) : true;
    }

    if (control instanceof HTMLInputElement && control.type === "file") {
      const files = Array.from(control.files || []);
      const extensions = Array.from(
        new Set(
          files
            .map((file) => file.name.split(".").pop()?.toLowerCase())
            .filter(Boolean)
            .map((extension) => clampText(extension, 10))
        )
      );

      sendEvent("project_photo_selected", {
        form_name: formName(form),
        file_count: files.length,
        file_extensions: extensions.join(",")
      });
      return;
    }

    sendEvent("deck_form_field_change", parameters);
  }

  function initializeFormTracking() {
    document.querySelectorAll("form.deck-multistep-form").forEach((form) => {
      const name = formName(form);

      form.addEventListener("submit", () => {
        const startedAt = state.startedForms.get(name);
        sendEvent("deck_form_submit_attempt", {
          form_name: name,
          form_id: form.id,
          form_step: currentFormStep(form).number,
          seconds_since_form_start: startedAt
            ? Math.max(0, Math.round((Date.now() - startedAt) / 1000))
            : 0
        });
      });

      form.addEventListener(
        "invalid",
        (event) => {
          const control = event.target;
          if (!(control instanceof HTMLElement)) return;

          sendEvent("deck_form_validation_error", {
            form_name: name,
            field_name: clampText(control.getAttribute("name") || control.id || "unknown", 60),
            field_type: control.getAttribute("type") || control.tagName.toLowerCase(),
            form_step: currentFormStep(form).number,
            validation_type: control.validity?.valueMissing
              ? "value_missing"
              : control.validity?.typeMismatch
                ? "type_mismatch"
                : control.validity?.patternMismatch
                  ? "pattern_mismatch"
                  : control.validity?.tooShort
                    ? "too_short"
                    : control.validity?.customError
                      ? "custom_error"
                      : "invalid"
          });
        },
        true
      );

      const container = form.closest(".hero-quick-card, .deck-form-card");
      const successOverlay = container?.querySelector("[data-success-overlay]");

      if (successOverlay) {
        new MutationObserver(() => {
          const visible =
            successOverlay.classList.contains("active") ||
            successOverlay.getAttribute("aria-hidden") === "false";

          if (!visible || state.completedForms.has(name)) return;
          state.completedForms.add(name);

          sendEvent("generate_lead", {
            lead_source: "deck_estimate_form",
            form_name: name,
            completion_detection: "success_overlay"
          });
        }).observe(successOverlay, {
          attributes: true,
          attributeFilter: ["class", "aria-hidden"]
        });
      }

      const status = form.querySelector("[data-form-status]");
      if (status) {
        new MutationObserver(() => {
          if (!status.classList.contains("error")) return;

          sendEvent("deck_form_submit_error", {
            form_name: name,
            form_step: currentFormStep(form).number
          });
        }).observe(status, {
          childList: true,
          attributes: true,
          attributeFilter: ["class"]
        });
      }
    });
  }

  function initializeFaqTracking() {
    document.querySelectorAll("details.faq-item").forEach((item, index) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;

        sendEvent("faq_open", {
          faq_index: index + 1,
          faq_question: clampText(item.querySelector("summary")?.textContent || "unknown", 100)
        });
      });
    });
  }

  function initializeGalleryTracking() {
    document.querySelectorAll(".deck-project-gallery-card").forEach((card, index) => {
      card.addEventListener("click", () => {
        sendEvent("deck_gallery_item_click", {
          gallery_index: index + 1,
          gallery_category: clampText(card.querySelector(".deck-project-tag")?.textContent || "unknown", 60),
          gallery_title: clampText(card.querySelector("figcaption strong")?.textContent || "unknown", 100)
        });
      });
    });
  }

  function initializeSectionTracking() {
    if (!("IntersectionObserver" in window)) return;

    const sections = document.querySelectorAll(
      ".deck-hero, #gallery, #services, #work, #process, #testimonials, #estimate, #faq"
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.25) return;

          const section = entry.target;
          const identifier =
            section.id ||
            (section.classList.contains("deck-hero") ? "hero" : clampText(section.className, 60));

          if (state.viewedSections.has(identifier)) return;
          state.viewedSections.add(identifier);

          sendEvent("deck_section_view", {
            section_id: identifier,
            section_heading: clampText(section.querySelector("h1, h2")?.textContent || identifier, 100)
          });

          observer.unobserve(section);
        });
      },
      { threshold: [0.25] }
    );

    sections.forEach((section) => observer.observe(section));
  }

  function initializeCtaImpressions() {
    if (!("IntersectionObserver" in window)) return;

    const ctas = document.querySelectorAll(
      ".hero-actions, .hero-quick-card, .services-btn, .deck-form-card, .mobile-cta-bar"
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;

          const key = `${elementLocation(entry.target)}:${clampText(entry.target.className, 60)}`;
          if (state.viewedCtas.has(key)) return;
          state.viewedCtas.add(key);

          sendEvent("deck_cta_impression", {
            cta_location: elementLocation(entry.target),
            cta_type: clampText(entry.target.className, 80)
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: [0.5] }
    );

    ctas.forEach((cta) => observer.observe(cta));
  }

  function initializeStickyCtaTracking() {
    const stickyCta = document.querySelector(".mobile-cta-bar");
    if (!stickyCta) return;

    let sent = false;
    new MutationObserver(() => {
      if (sent || !stickyCta.classList.contains("is-visible")) return;
      sent = true;
      sendEvent("sticky_cta_impression", { cta_location: "mobile_sticky_cta" });
    }).observe(stickyCta, { attributes: true, attributeFilter: ["class"] });
  }

  function updateScrollDepth() {
    const documentHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.clientHeight
    );
    const scrollableHeight = Math.max(1, documentHeight - window.innerHeight);
    const percent = Math.min(100, Math.round((window.scrollY / scrollableHeight) * 100));
    state.maximumScrollPercent = Math.max(state.maximumScrollPercent, percent);

    [25, 50, 75, 90, 100].forEach((threshold) => {
      if (percent < threshold || state.scrollThresholds.has(threshold)) return;
      state.scrollThresholds.add(threshold);
      sendEvent("deck_scroll_depth", { scroll_percent: threshold });
    });
  }

  function initializeEngagementTracking() {
    const thresholds = [10, 30, 60, 120, 300];

    window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      state.activeSeconds += 1;

      thresholds.forEach((threshold) => {
        if (state.activeSeconds < threshold || state.engagementThresholds.has(threshold)) return;
        state.engagementThresholds.add(threshold);
        sendEvent("deck_engagement_time", { active_seconds: threshold });
      });
    }, 1000);
  }

  function initializeWebVitals() {
    try {
      const paintEntries = performance.getEntriesByType("paint");
      const fcp = paintEntries.find((entry) => entry.name === "first-contentful-paint");
      if (fcp) state.fcp = Math.round(fcp.startTime);

      if ("PerformanceObserver" in window) {
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) state.lcp = Math.round(lastEntry.startTime);
          }).observe({ type: "largest-contentful-paint", buffered: true });
        } catch {
          // Unsupported in this browser.
        }

        try {
          new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              if (!entry.hadRecentInput) state.cls += entry.value;
            });
          }).observe({ type: "layout-shift", buffered: true });
        } catch {
          // Unsupported in this browser.
        }

        try {
          new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              if (entry.interactionId && entry.duration > state.inp) {
                state.inp = Math.round(entry.duration);
              }
            });
          }).observe({ type: "event", buffered: true, durationThreshold: 40 });
        } catch {
          // Unsupported in this browser.
        }
      }
    } catch {
      // Performance measurement is optional.
    }
  }

  function sendPerformance() {
    if (state.performanceSent) return;
    state.performanceSent = true;

    const navigation = performance.getEntriesByType("navigation")[0];
    if (!navigation) return;

    sendEvent("deck_page_performance", {
      ttfb_ms: Math.round(navigation.responseStart),
      dom_content_loaded_ms: Math.round(navigation.domContentLoadedEventEnd),
      load_time_ms: Math.round(navigation.loadEventEnd || performance.now()),
      transfer_size_kb: Math.round((navigation.transferSize || 0) / 1024),
      encoded_body_size_kb: Math.round((navigation.encodedBodySize || 0) / 1024)
    });
  }

  function sendWebVitals() {
    if (state.vitalsSent) return;
    state.vitalsSent = true;

    sendEvent(
      "deck_web_vitals",
      {
        fcp_ms: state.fcp || undefined,
        lcp_ms: state.lcp || undefined,
        cls_score: Math.round(state.cls * 1000) / 1000,
        inp_ms: state.inp || undefined
      },
      { beacon: true }
    );
  }

  function sendFormAbandonments() {
    state.startedForms.forEach((startedAt, name) => {
      if (state.completedForms.has(name)) return;

      sendEvent(
        "deck_form_abandon",
        {
          form_name: name,
          seconds_since_form_start: Math.max(0, Math.round((Date.now() - startedAt) / 1000))
        },
        { beacon: true }
      );
    });
  }

  function sendPageExit() {
    if (state.pageExitSent) return;
    state.pageExitSent = true;

    sendFormAbandonments();
    sendWebVitals();

    sendEvent(
      "deck_page_engagement_summary",
      {
        active_seconds: state.activeSeconds,
        maximum_scroll_percent: state.maximumScrollPercent,
        forms_started: state.startedForms.size,
        forms_completed: state.completedForms.size,
        sections_viewed: state.viewedSections.size,
        referrer_domain: referrerDomain()
      },
      { beacon: true }
    );
  }

  function initializeErrorTracking() {
    window.addEventListener("error", (event) => {
      const source = event.filename ? event.filename.split("/").pop() : "unknown";
      sendEvent("deck_javascript_error", {
        error_type: "javascript_error",
        error_message: redactPotentialPii(event.message || "unknown_error"),
        error_source: clampText(source, 100),
        error_line: event.lineno || 0,
        error_column: event.colno || 0
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === "string"
            ? event.reason
            : "unhandled_promise_rejection";

      sendEvent("deck_javascript_error", {
        error_type: "unhandled_rejection",
        error_message: redactPotentialPii(reason)
      });
    });
  }

  function initializeRageClickTracking() {
    const recentClicks = [];

    document.addEventListener(
      "click",
      (event) => {
        const now = Date.now();
        const point = { time: now, x: event.clientX, y: event.clientY };
        recentClicks.push(point);

        while (recentClicks.length && now - recentClicks[0].time > 2000) {
          recentClicks.shift();
        }

        if (recentClicks.length < 3) return;

        const closeTogether = recentClicks.every(
          (click) => Math.hypot(click.x - point.x, click.y - point.y) <= 50
        );

        if (!closeTogether) return;

        const target = event.target instanceof Element ? event.target.closest("a, button, input, select, textarea") : null;
        sendEvent("deck_rage_click", {
          target_type: target?.tagName.toLowerCase() || "unknown",
          target_text: target ? elementText(target) : "unknown",
          target_location: target ? elementLocation(target) : "unknown"
        });

        recentClicks.length = 0;
      },
      true
    );
  }

  function initialize() {
    sendEvent("deck_page_loaded", {
      referrer_domain: referrerDomain(),
      landing_page: window.location.pathname,
      has_google_ads_click_id:
        new URLSearchParams(window.location.search).has("gclid") ||
        new URLSearchParams(window.location.search).has("gbraid") ||
        new URLSearchParams(window.location.search).has("wbraid"),
      has_utm_parameters: Array.from(new URLSearchParams(window.location.search).keys()).some((key) =>
        key.toLowerCase().startsWith("utm_")
      )
    });

    document.addEventListener("click", trackClick, true);
    document.addEventListener("focusin", trackFormInteraction, true);
    document.addEventListener("input", trackFormInteraction, true);
    document.addEventListener("change", trackFormChange, true);

    initializeFormTracking();
    initializeFaqTracking();
    initializeGalleryTracking();
    initializeSectionTracking();
    initializeCtaImpressions();
    initializeStickyCtaTracking();
    initializeEngagementTracking();
    initializeWebVitals();
    initializeErrorTracking();
    initializeRageClickTracking();

    let scrollFrame = 0;
    window.addEventListener(
      "scroll",
      () => {
        if (scrollFrame) return;
        scrollFrame = window.requestAnimationFrame(() => {
          scrollFrame = 0;
          updateScrollDepth();
        });
      },
      { passive: true }
    );
    updateScrollDepth();

    window.addEventListener("load", () => {
      window.setTimeout(sendPerformance, 0);
    });

    window.addEventListener("pagehide", sendPageExit);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") sendWebVitals();
    });
  }

  window.ZHAnalytics = Object.freeze({
    measurementId: MEASUREMENT_ID,
    sendEvent,
    debugMode: DEBUG_MODE
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
