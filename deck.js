(() => {
  "use strict";

  const GALLERY_COMPOSITE_IMAGE =
    "https://www.kingcitypropertyservice.com/uploads/1/0/1/0/101002410/composite-deck-finish-with-border-vaughan-650_orig.jpg";

  const SERVICE_COMPOSITE_IMAGE =
    "https://apdecks.com/wp-content/uploads/2024/01/Deckorators-composite-decking-contractors-near-me-in-san-antonio-texas.webp";

  function setText(selector, text) {
    const element = document.querySelector(selector);
    if (element) element.textContent = text;
  }

  function updateMeta(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.setAttribute("content", value);
  }

  function findCardByHeading(containerSelector, headingText) {
    return Array.from(
      document.querySelectorAll(`${containerSelector} h3`)
    )
      .find((heading) => heading.textContent.trim() === headingText)
      ?.closest("article");
  }

  function updateImages() {
    const galleryCompositeCard = Array.from(
      document.querySelectorAll(".deck-project-gallery-card")
    ).find((card) =>
      card.querySelector(".deck-project-tag")
        ?.textContent.trim()
        .toLowerCase()
        .includes("composite")
    );

    const galleryCompositeImage =
      galleryCompositeCard?.querySelector("img");

    if (galleryCompositeImage) {
      galleryCompositeImage.src = GALLERY_COMPOSITE_IMAGE;
      galleryCompositeImage.alt =
        "Low-maintenance composite deck with contrasting border";
      galleryCompositeImage.removeAttribute("srcset");
    }

    const compositeServiceCard =
      findCardByHeading(".services-grid", "Composite Decks");

    const compositeServiceImage =
      compositeServiceCard?.querySelector("img");

    if (compositeServiceImage) {
      compositeServiceImage.src = SERVICE_COMPOSITE_IMAGE;
      compositeServiceImage.alt =
        "Modern low-maintenance composite deck";
      compositeServiceImage.removeAttribute("srcset");
    }
  }

  function removeOutdoorFeaturesCard() {
    const outdoorFeaturesCard =
      findCardByHeading(".services-grid", "Outdoor Features");

    outdoorFeaturesCard?.remove();

    const remainingCards = Array.from(
      document.querySelectorAll(".services-grid .service-card")
    );

    remainingCards.forEach((card, index) => {
      const number = card.querySelector(".service-number");
      if (number) {
        number.textContent = String(index + 1).padStart(2, "0");
      }
    });
  }

  function removeOptionalFeatureQuestions() {
    document
      .querySelectorAll('input[name="desiredFeatures"]')
      .forEach((input) => {
        input
          .closest("fieldset.choice-fieldset.optional-choices")
          ?.remove();
      });
  }

  function updateMarketingCopy() {
    document.title =
      "Custom Deck Builder in Salem, Keizer & Silverton, Oregon | ZH Homes";

    updateMeta(
      'meta[name="description"]',
      "Build a custom wood or composite deck designed around your home, yard, and budget. Request a deck estimate from ZH Homes in Salem, Keizer, and Silverton, Oregon."
    );

    updateMeta(
      'meta[property="og:title"]',
      "Custom Deck Builder in Salem, Keizer & Silverton | ZH Homes"
    );

    updateMeta(
      'meta[property="og:description"]',
      "Turn your backyard into a space for grilling, relaxing, and spending time together with a custom deck from ZH Homes."
    );

    setText(
      ".deck-hero .subheadline:not(.hero-mobile-subheadline)",
      "Custom wood and composite decks designed for the way you want to live, built by a licensed local contractor serving Salem, Keizer, and Silverton."
    );

    setText(
      ".deck-hero .hero-mobile-subheadline",
      "Custom new decks for Salem, Keizer, and Silverton homeowners who want a backyard they actually use."
    );

    setText(
      ".deck-project-gallery-eyebrow",
      "Deck Design Inspiration"
    );

    setText(
      "#deck-gallery-title",
      "See What Your Backyard Could Become"
    );

    setText(
      ".services-heading h2",
      "Choose the Deck That Fits Your Home, Budget, and Lifestyle"
    );

    setText(
      ".mission-title h2",
      "A Clearer, More Reliable Way to Build Your Deck"
    );

    const missionStats = Array.from(
      document.querySelectorAll(".mission-stat")
    );

    const missionCopy = [
      {
        title: "Clear Communication",
        body: "Know what is happening, what comes next, and who to contact."
      },
      {
        title: "Designed for Your Property",
        body: "Planned around your home, yard, elevation, and how you will use the space."
      },
      {
        title: "Built for Oregon",
        body: "Durable materials and construction details selected for safety and Northwest weather."
      },
      {
        title: "Clear Written Estimates",
        body: "Review the scope, options, and estimated price before work begins."
      }
    ];

    missionStats.forEach((stat, index) => {
      const copy = missionCopy[index];
      if (!copy) return;

      const title = stat.querySelector("strong");
      const body = stat.querySelector("span");

      if (title) title.textContent = copy.title;
      if (body) body.textContent = copy.body;
    });

    setText(
      ".process-top h2",
      "From First Conversation to Finished Deck"
    );

    setText(
      ".process-top p",
      "A straightforward process keeps the project clear, organized, and easier to plan from the first estimate through the final walkthrough."
    );

    setText(
      ".contact-content h2",
      "Ready to Start Planning Your New Deck?"
    );

    const contactIntro =
      document.querySelector(".contact-content > p");

    if (contactIntro) {
      contactIntro.textContent =
        "Share your location, goals, timeline, and budget. ZH Homes will review the details and follow up about fit and next steps.";
    }
  }

  function applyUpdates() {
    updateImages();
    removeOutdoorFeaturesCard();
    removeOptionalFeatureQuestions();
    updateMarketingCopy();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyUpdates, {
      once: true
    });
  } else {
    applyUpdates();
  }
})();
