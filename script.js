document.getElementById("btn")?.addEventListener("click", () => {
  alert("It works!");
});

// Google Ads website-call tracking for (503) 949-2257.
// Preserves the site's existing Google/GA4 setup and only adds the Ads destination
// plus the Google Forwarding Number conversion configuration.
(function () {
  const adsId = "AW-17949658140";
  const websiteCallDestination = "AW-17949658140/2Bf9CIJnxO4cEJyYiO9C";
  const displayPhoneNumber = "(503) 949-2257";

  window.dataLayer = window.dataLayer || [];

  if (typeof window.gtag !== "function") {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
  }

  // Some pages already load gtag.js for GA4 / Google Ads. Only load it here
  // when the page does not already have a Google tag script.
  if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
    const googleTag = document.createElement("script");
    googleTag.async = true;
    googleTag.src = "https://www.googletagmanager.com/gtag/js?id=" + adsId;
    document.head.appendChild(googleTag);
  }

  function configureWebsiteCallTracking() {
    window.gtag("config", adsId);
    window.gtag("config", websiteCallDestination, {
      phone_conversion_number: displayPhoneNumber
    });
  }

  // Waiting for the DOM means Google can see and replace every visible instance
  // of the business number, including numbers later in the page/footer.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", configureWebsiteCallTracking, { once: true });
  } else {
    configureWebsiteCallTracking();
  }
})();
