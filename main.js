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
      if (href === "#skill" && typeof triggerSkillsFromNav === "function") {
        triggerSkillsFromNav();
      }
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", href);
      }
    });
  });

  // Animate My Skills bars and percentages smoothly from 0% to each noted target
  let triggerSkillsFromNav = null;

  const initSkillCounters = () => {
    const skillSection = document.getElementById("skill");
    const skillBars = Array.from(
      document.querySelectorAll("#skill .inline[data-target]")
    );
    if (!skillSection || skillBars.length === 0) return;

    const skillItems = skillBars.map((bar) => ({
      bar,
      target: Math.max(0, Math.min(100, Number(bar.dataset.target) || 0)),
      startTime: 0,
      duration: 1200,
      active: false,
    }));

    let skillsRafId = null;
    let skillsInView = false;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const setBarProgress = (bar, percent) => {
      const clamped = Math.max(0, Math.min(100, percent));
      bar.style.width = `${clamped.toFixed(2)}%`;
      bar.dataset.percent = `${Math.round(clamped)}%`;
    };

    const stopSkillsRaf = () => {
      if (skillsRafId !== null) {
        window.cancelAnimationFrame(skillsRafId);
        skillsRafId = null;
      }
    };

    const stepSkills = (now) => {
      let anyActive = false;

      for (let i = 0; i < skillItems.length; i += 1) {
        const item = skillItems[i];
        if (!item.active) continue;

        if (now < item.startTime) {
          anyActive = true;
          continue;
        }

        const progress = Math.min((now - item.startTime) / item.duration, 1);
        const current = item.target * easeOutCubic(progress);
        setBarProgress(item.bar, current);

        if (progress < 1) {
          anyActive = true;
        } else {
          setBarProgress(item.bar, item.target);
          item.active = false;
        }
      }

      if (anyActive) {
        skillsRafId = window.requestAnimationFrame(stepSkills);
      } else {
        skillsRafId = null;
      }
    };

    const animateItems = (items, staggerMs = 75) => {
      if (prefersReducedMotion.matches) {
        stopSkillsRaf();
        items.forEach((item) => {
          item.active = false;
          setBarProgress(item.bar, item.target);
        });
        return;
      }

      const now = performance.now();
      items.forEach((item, index) => {
        setBarProgress(item.bar, 0);
        item.startTime = now + index * staggerMs;
        item.active = true;
      });

      if (skillsRafId === null) {
        skillsRafId = window.requestAnimationFrame(stepSkills);
      }
    };

    const resetAllSkills = () => {
      stopSkillsRaf();
      skillItems.forEach((item) => {
        item.active = false;
        setBarProgress(item.bar, prefersReducedMotion.matches ? item.target : 0);
      });
    };

    resetAllSkills();

    triggerSkillsFromNav = () => {
      if (skillsInView) {
        animateItems(skillItems, 75);
      } else {
        resetAllSkills();
      }
    };

    // Replay all skills when clicking the "My Skills" heading
    const skillsHeading = skillSection.querySelector(".header-style");
    if (skillsHeading) {
      skillsHeading.addEventListener("click", () => {
        animateItems(skillItems, 75);
      });
    }

    // Replay a single skill bar from 0% to target when clicking its card
    skillItems.forEach((item) => {
      const card = item.bar.closest(".my-skill");
      if (card) {
        card.addEventListener("click", () => {
          animateItems([item], 0);
        });
      }
    });

    if ("IntersectionObserver" in window) {
      const skillObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.15) {
              if (!skillsInView) {
                skillsInView = true;
                animateItems(skillItems, 75);
              }
            } else if (!entry.isIntersecting) {
              skillsInView = false;
              resetAllSkills();
            }
          });
        },
        {
          threshold: [0, 0.15],
        }
      );

      skillObserver.observe(skillSection);
    } else {
      skillsInView = true;
      animateItems(skillItems, 75);
    }

    if (typeof prefersReducedMotion.addEventListener === "function") {
      prefersReducedMotion.addEventListener("change", () => {
        if (prefersReducedMotion.matches) {
          animateItems(skillItems, 0);
        } else if (skillsInView) {
          animateItems(skillItems, 75);
        } else {
          resetAllSkills();
        }
      });
    }
  };

  initSkillCounters();

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

  // Active flying background boxes (small + big, single color per box)
  // and small colored boxes that fly and follow the mouse cursor
  const initFlyingBoxes = () => {
    const canvas = document.getElementById("bg-boxes-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const BOX_COLORS = [
      "#96eefe",
      "#38bdf8",
      "#6366f1",
      "#a855f7",
      "#f472b6",
      "#ff5e7e",
      "#fb923c",
      "#fbbf24",
      "#34d399",
      "#2dd4bf",
    ];

    const rand = (min, max) => min + Math.random() * (max - min);
    const pickColor = () =>
      BOX_COLORS[Math.floor(Math.random() * BOX_COLORS.length)];

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    let ambientBoxes = [];
    let followerBoxes = [];
    const trailBoxes = [];
    const MAX_TRAIL_BOXES = 60;

    const pointer = {
      x: width / 2,
      y: height / 2,
      vx: 0,
      vy: 0,
      lastX: null,
      lastY: null,
      distanceSinceSpawn: 0,
      active: false,
      initialized: false,
    };

    const createAmbientBox = () => {
      const roll = Math.random();
      let size;
      let fillAlpha;
      let strokeAlpha;
      let speedScale;

      if (roll < 0.45) {
        // Small boxes
        size = rand(10, 22);
        fillAlpha = rand(0.28, 0.48);
        strokeAlpha = rand(0.65, 0.9);
        speedScale = rand(28, 56);
      } else if (roll < 0.8) {
        // Medium boxes
        size = rand(28, 48);
        fillAlpha = rand(0.18, 0.32);
        strokeAlpha = rand(0.45, 0.72);
        speedScale = rand(18, 36);
      } else {
        // Big boxes
        size = rand(58, 96);
        fillAlpha = rand(0.12, 0.22);
        strokeAlpha = rand(0.32, 0.55);
        speedScale = rand(11, 24);
      }

      const angle = rand(0, Math.PI * 2);
      return {
        x: rand(-size, width + size),
        y: rand(-size, height + size),
        size,
        color: pickColor(),
        fillAlpha,
        strokeAlpha,
        vx: Math.cos(angle) * speedScale,
        vy: Math.sin(angle) * speedScale - rand(6, 18),
        rotation: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.65, 0.65),
        swayAmp: rand(6, 18),
        swayFreq: rand(0.5, 1.4),
        swayPhase: rand(0, Math.PI * 2),
      };
    };

    const createFollowerBoxes = () => {
      const count = 8;
      followerBoxes = Array.from({ length: count }, (_, idx) => ({
        x: width / 2,
        y: height / 2,
        vx: 0,
        vy: 0,
        size: rand(7, 13),
        color: BOX_COLORS[idx % BOX_COLORS.length],
        alpha: 0,
        rotation: rand(0, Math.PI * 2),
        rotSpeed: rand(-2.2, 2.2),
        orbitRadius: rand(14, 40),
        orbitSpeed: rand(1.4, 2.8) * (idx % 2 === 0 ? 1 : -1),
        orbitAngle: (idx / count) * Math.PI * 2,
        spring: rand(4.5, 9.5),
        damping: rand(0.76, 0.86),
      }));
    };

    const spawnTrailBox = (x, y, vx, vy) => {
      if (trailBoxes.length >= MAX_TRAIL_BOXES) {
        trailBoxes.shift();
      }
      trailBoxes.push({
        x: x + rand(-10, 10),
        y: y + rand(-10, 10),
        vx: vx * 0.22 + rand(-38, 38),
        vy: vy * 0.22 + rand(-48, 24),
        size: rand(6, 14),
        color: pickColor(),
        rotation: rand(0, Math.PI * 2),
        rotSpeed: rand(-3.2, 3.2),
        life: 0,
        maxLife: rand(0.65, 1.15),
      });
    };

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetCount = Math.max(
        22,
        Math.min(48, Math.round((width * height) / 36000))
      );
      while (ambientBoxes.length < targetCount) {
        ambientBoxes.push(createAmbientBox());
      }
      if (ambientBoxes.length > targetCount) {
        ambientBoxes.length = targetCount;
      }
    };

    const traceRoundedRect = (half, radius) => {
      const x = -half;
      const y = -half;
      const w = half * 2;
      const r = Math.min(radius, half);
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, w, w, r);
      } else {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + w - r);
        ctx.quadraticCurveTo(x + w, y + w, x + w - r, y + w);
        ctx.lineTo(x + r, y + w);
        ctx.quadraticCurveTo(x, y + w, x, y + w - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      }
    };

    const drawBox = (x, y, size, rotation, color, fillAlpha, strokeAlpha) => {
      if (size <= 0.5 || (fillAlpha <= 0.01 && strokeAlpha <= 0.01)) return;
      const half = size / 2;
      const radius = Math.max(2, size * 0.2);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      // Soft matching single-color outer glow
      if (fillAlpha > 0.04) {
        ctx.globalAlpha = fillAlpha * 0.28;
        ctx.fillStyle = color;
        traceRoundedRect(half + 3, radius + 2);
        ctx.fill();
      }

      // Main single-color box body
      traceRoundedRect(half, radius);
      ctx.globalAlpha = fillAlpha;
      ctx.fillStyle = color;
      ctx.fill();

      // Crisp matching single-color border
      ctx.globalAlpha = strokeAlpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = size > 45 ? 1.8 : 1.3;
      ctx.stroke();

      ctx.restore();
    };

    const renderFrame = (dt, elapsed) => {
      ctx.clearRect(0, 0, width, height);

      // 1. Update & draw ambient flying small/medium/big boxes
      for (let i = 0; i < ambientBoxes.length; i += 1) {
        const box = ambientBoxes[i];
        const swayX =
          Math.sin(elapsed * box.swayFreq + box.swayPhase) * box.swayAmp;

        box.x += (box.vx + swayX) * dt;
        box.y += box.vy * dt;
        box.rotation += box.rotSpeed * dt;

        const margin = box.size + 24;
        if (box.x < -margin) box.x = width + margin;
        else if (box.x > width + margin) box.x = -margin;

        if (box.y < -margin) box.y = height + margin;
        else if (box.y > height + margin) box.y = -margin;

        drawBox(
          box.x,
          box.y,
          box.size,
          box.rotation,
          box.color,
          box.fillAlpha,
          box.strokeAlpha
        );
      }

      // 2. Update & draw small boxes flying in a trail behind the mouse
      for (let i = trailBoxes.length - 1; i >= 0; i -= 1) {
        const box = trailBoxes[i];
        box.life += dt;
        if (box.life >= box.maxLife) {
          trailBoxes.splice(i, 1);
          continue;
        }

        // Gently pull trail boxes slightly toward active cursor as they fly
        if (pointer.active) {
          const dx = pointer.x - box.x;
          const dy = pointer.y - box.y;
          box.vx += dx * 0.9 * dt;
          box.vy += dy * 0.9 * dt;
        }

        box.vx *= Math.pow(0.28, dt);
        box.vy *= Math.pow(0.28, dt);
        box.vy -= 18 * dt;

        box.x += box.vx * dt;
        box.y += box.vy * dt;
        box.rotation += box.rotSpeed * dt;

        const progress = box.life / box.maxLife;
        const fade = 1 - progress;
        const currentSize = box.size * (0.45 + 0.55 * fade);

        drawBox(
          box.x,
          box.y,
          currentSize,
          box.rotation,
          box.color,
          fade * 0.65,
          fade * 0.95
        );
      }

      // 3. Update & draw small magnetic boxes that fly and follow the cursor
      for (let i = 0; i < followerBoxes.length; i += 1) {
        const box = followerBoxes[i];
        const targetAlpha = pointer.active ? 1 : 0;
        box.alpha += (targetAlpha - box.alpha) * Math.min(1, dt * 7);

        if (box.alpha <= 0.01) continue;

        box.orbitAngle += box.orbitSpeed * dt;
        const targetX = pointer.x + Math.cos(box.orbitAngle) * box.orbitRadius;
        const targetY = pointer.y + Math.sin(box.orbitAngle) * box.orbitRadius;

        box.vx += (targetX - box.x) * box.spring * dt;
        box.vy += (targetY - box.y) * box.spring * dt;

        const damp = Math.pow(box.damping, dt * 60);
        box.vx *= damp;
        box.vy *= damp;

        box.x += box.vx * dt * 8;
        box.y += box.vy * dt * 8;
        box.rotation += box.rotSpeed * dt;

        drawBox(
          box.x,
          box.y,
          box.size,
          box.rotation,
          box.color,
          box.alpha * 0.62,
          box.alpha * 0.95
        );
      }
    };

    const drawStaticSnapshot = () => {
      ctx.clearRect(0, 0, width, height);
      ambientBoxes.forEach((box) => {
        drawBox(
          box.x,
          box.y,
          box.size,
          box.rotation,
          box.color,
          box.fillAlpha,
          box.strokeAlpha
        );
      });
    };

    const handlePointerMove = (event) => {
      if (prefersReducedMotion.matches) return;

      const x = event.clientX;
      const y = event.clientY;

      if (!pointer.initialized) {
        pointer.initialized = true;
        followerBoxes.forEach((box) => {
          box.x = x + rand(-24, 24);
          box.y = y + rand(-24, 24);
        });
      }

      const dx = pointer.lastX === null ? 0 : x - pointer.lastX;
      const dy = pointer.lastY === null ? 0 : y - pointer.lastY;
      const dist = Math.hypot(dx, dy);

      pointer.x = x;
      pointer.y = y;
      pointer.vx = dx * 12;
      pointer.vy = dy * 12;
      pointer.lastX = x;
      pointer.lastY = y;
      pointer.active = event.pointerType !== "touch";

      pointer.distanceSinceSpawn += dist;
      if (pointer.distanceSinceSpawn >= 14) {
        const count = Math.min(3, Math.floor(pointer.distanceSinceSpawn / 14));
        for (let i = 0; i < count; i += 1) {
          spawnTrailBox(x, y, pointer.vx, pointer.vy);
        }
        pointer.distanceSinceSpawn = 0;
      }
    };

    const handlePointerLeave = () => {
      pointer.active = false;
      pointer.lastX = null;
      pointer.lastY = null;
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    document.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("blur", handlePointerLeave);

    let resizeRafId = null;
    window.addEventListener(
      "resize",
      () => {
        if (resizeRafId !== null) return;
        resizeRafId = window.requestAnimationFrame(() => {
          resizeRafId = null;
          resizeCanvas();
          if (prefersReducedMotion.matches) {
            drawStaticSnapshot();
          }
        });
      },
      { passive: true }
    );

    resizeCanvas();
    createFollowerBoxes();

    let animationId = null;
    let lastTime = 0;
    let elapsed = 0;

    const tick = (now) => {
      if (document.hidden || prefersReducedMotion.matches) {
        animationId = null;
        return;
      }
      if (!lastTime) lastTime = now;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      renderFrame(dt, elapsed);
      animationId = window.requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (prefersReducedMotion.matches) {
        drawStaticSnapshot();
        return;
      }
      if (animationId === null && !document.hidden) {
        lastTime = 0;
        animationId = window.requestAnimationFrame(tick);
      }
    };

    const stopLoop = () => {
      if (animationId !== null) {
        window.cancelAnimationFrame(animationId);
        animationId = null;
      }
    };

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopLoop();
      } else {
        startLoop();
      }
    });

    if (typeof prefersReducedMotion.addEventListener === "function") {
      prefersReducedMotion.addEventListener("change", () => {
        if (prefersReducedMotion.matches) {
          stopLoop();
          drawStaticSnapshot();
        } else {
          startLoop();
        }
      });
    }

    startLoop();
  };

  initFlyingBoxes();
})();
