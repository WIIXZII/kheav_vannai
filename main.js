document.documentElement.classList.add("js-ready");

(() => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );
  const header = document.querySelector("header");
  const sections = Array.from(document.querySelectorAll("section[id]"));
  const navLinks = Array.from(document.querySelectorAll('nav a[href^="#"]'));
  let isProgrammaticScroll = false;

  const setActiveNav = (id) => {
    navLinks.forEach((link) => {
      const isMatch = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("active", isMatch);
    });
  };

  // Passive frosted-header toggle on scroll
  let headerTicking = false;
  const updateHeaderState = () => {
    if (header) {
      header.classList.toggle("scrolled", window.scrollY > 24);
    }
    if (
      !isProgrammaticScroll &&
      sections.length > 0 &&
      window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4
    ) {
      setActiveNav(sections[sections.length - 1].id);
    }
    headerTicking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!headerTicking) {
        headerTicking = true;
        window.requestAnimationFrame(updateHeaderState);
      }
    },
    { passive: true }
  );
  updateHeaderState();

  // Smooth section reveal via IntersectionObserver (zero scroll-jank)
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show-animate");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -60px 0px",
      }
    );

    sections.forEach((section) => {
      if (!section.classList.contains("show-animate")) {
        revealObserver.observe(section);
      }
    });

    // Active nav link sync while scrolling
    const activeSectionObserver = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveNav(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-35% 0px -55% 0px",
        threshold: 0,
      }
    );

    sections.forEach((section) => activeSectionObserver.observe(section));
  } else {
    sections.forEach((section) => section.classList.add("show-animate"));
  }

  // Smooth eased scrolling when clicking nav links
  let scrollRafId = null;

  const cancelSmoothScroll = () => {
    if (scrollRafId !== null) {
      window.cancelAnimationFrame(scrollRafId);
      scrollRafId = null;
    }
    isProgrammaticScroll = false;
    document.documentElement.style.scrollBehavior = "";
  };

  window.addEventListener("wheel", cancelSmoothScroll, { passive: true });
  window.addEventListener("touchstart", cancelSmoothScroll, { passive: true });

  const smoothScrollTo = (targetY, duration = 650) => {
    cancelSmoothScroll();

    if (prefersReducedMotion.matches) {
      window.scrollTo(0, targetY);
      return;
    }

    const startY = window.scrollY;
    const distance = targetY - startY;
    if (Math.abs(distance) < 1) return;

    const startTime = performance.now();
    isProgrammaticScroll = true;
    document.documentElement.style.scrollBehavior = "auto";

    // Ease-out cubic for silky deceleration
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + distance * easeOutCubic(progress));

      if (progress < 1) {
        scrollRafId = window.requestAnimationFrame(step);
      } else {
        cancelSmoothScroll();
      }
    };

    scrollRafId = window.requestAnimationFrame(step);
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      setActiveNav(target.id);

      const headerHeight = header ? header.offsetHeight : 0;
      const targetTop = Math.max(
        0,
        target.getBoundingClientRect().top + window.scrollY - headerHeight + 8
      );

      smoothScrollTo(targetTop);
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", href);
      }
    });
  });

  // Tactile ripple feedback when clicking buttons and social icon buttons
  const spawnRipple = (element, event) => {
    if (prefersReducedMotion.matches) return;

    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement("span");
    ripple.className = "btn-ripple";
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;

    const clientX =
      typeof event.clientX === "number" && event.clientX !== 0
        ? event.clientX
        : rect.left + rect.width / 2;
    const clientY =
      typeof event.clientY === "number" && event.clientY !== 0
        ? event.clientY
        : rect.top + rect.height / 2;

    ripple.style.left = `${clientX - rect.left - size / 2}px`;
    ripple.style.top = `${clientY - rect.top - size / 2}px`;

    element.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), {
      once: true,
    });
  };

  document.querySelectorAll(".btn, .social-icons a").forEach((button) => {
    button.addEventListener("click", (event) => spawnRipple(button, event));
  });
})();
