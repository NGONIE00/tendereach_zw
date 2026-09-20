(function () {
  "use strict";

  var root = document.documentElement;
  var STORAGE_KEY = "tenderreach-theme";

  function getPreferredTheme() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }

    // New switch markup (docs/api SVG version).
    document.querySelectorAll(".theme-switch").forEach(function (btn) {
      btn.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    });

    // Backward-compat: if any page still has the older round emoji
    // button (.theme-toggle) instead of the new switch, keep it
    // working too, rather than requiring every page to be updated in
    // lockstep before anything functions.
    document.querySelectorAll(".theme-toggle").forEach(function (btn) {
      btn.textContent = theme === "dark" ? "☀" : "☾";
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    });
  }

  function toggleTheme() {
    var current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    var next = current === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  applyTheme(getPreferredTheme());

  // Event delegation on document, not querySelectorAll+addEventListener
  // on load — this way the toggle works no matter which button variant
  // (.theme-switch or the older .theme-toggle) is present on a given
  // page, and doesn't depend on exact load-order.
  document.addEventListener("click", function (e) {
    if (e.target.closest(".theme-switch") || e.target.closest(".theme-toggle")) {
      toggleTheme();
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    var navToggle = document.querySelector(".nav-toggle");
    var navLinks = document.querySelector(".nav-links");
    if (navToggle && navLinks) {
      navToggle.addEventListener("click", function () {
        navLinks.classList.toggle("open");
      });
    }

    initNavScrollShadow();
    initCarousels();
  });

  function initNavScrollShadow() {
    var nav = document.querySelector(".nav");
    if (!nav) return;

    function updateShadow() {
      if (window.scrollY > 4) {
        nav.classList.add("nav--scrolled");
      } else {
        nav.classList.remove("nav--scrolled");
      }
    }

    updateShadow();
    window.addEventListener("scroll", updateShadow, { passive: true });
  }

  function initCarousels() {
    var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.querySelectorAll(".card-carousel").forEach(function (carousel) {
      var track = carousel.querySelector(".card-track");
      var dots = carousel.querySelectorAll(".dot");
      var slides = track.children;
      var total = slides.length;
      var index = 0;
      var timer = null;
      var intervalMs = parseInt(carousel.getAttribute("data-autoplay") || "4500", 10);

      function goTo(newIndex) {
        index = (newIndex + total) % total;
        track.style.transform = "translateX(-" + index * 100 + "%)";
        dots.forEach(function (dot, i) {
          dot.classList.toggle("active", i === index);
        });
      }

      function startTimer() {
        if (prefersReduced) return;
        clearInterval(timer);
        timer = setInterval(function () {
          goTo(index + 1);
        }, intervalMs);
      }

      dots.forEach(function (dot) {
        dot.addEventListener("click", function () {
          goTo(parseInt(dot.getAttribute("data-index"), 10));
          startTimer();
        });
      });

      carousel.addEventListener("mouseenter", function () {
        clearInterval(timer);
      });
      carousel.addEventListener("mouseleave", startTimer);

      goTo(0);
      startTimer();
    });
  }
})();
