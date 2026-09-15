/* ==========================================================================
   تفکرناب آینده اروند — رفتار صفحه
   همه‌ی تعامل‌ها به‌صورت «بهبود تدریجی» نوشته شده‌اند: بدون جاوااسکریپت هم
   محتوای کامل صفحه در دسترس است.
   ========================================================================== */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  var FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

  /** تبدیل عدد لاتین به فارسی، با جداکننده اعشار فارسی */
  function toFa(value) {
    return String(value)
      .replace(/\d/g, function (d) {
        return FA_DIGITS[+d];
      })
      .replace(/\./g, "٫");
  }

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  /* ------------------------------------------------------ ۱. سربرگ چسبان */

  (function stickyTopbar() {
    var topbar = $("#topbar");
    if (!topbar) return;

    var ticking = false;

    function update() {
      topbar.classList.toggle("is-stuck", window.scrollY > 24);
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );

    update();
  })();

  /* ---------------------------------------------------------- ۲. منوی کشویی */

  (function mobileMenu() {
    var button = $("#menuButton");
    var panel = $("#menuPanel");
    var backdrop = $("#menuBackdrop");
    var closeBtn = $("#menuClose");
    if (!button || !panel || !backdrop) return;

    var lastFocus = null;

    function focusables() {
      return $$("a[href], button:not([disabled])", panel);
    }

    function open() {
      lastFocus = document.activeElement;
      panel.hidden = false;
      backdrop.hidden = false;
      // یک فریم صبر می‌کنیم تا ترنزیشن اجرا شود
      window.requestAnimationFrame(function () {
        panel.classList.add("is-open");
        backdrop.classList.add("is-open");
      });
      button.setAttribute("aria-expanded", "true");
      button.setAttribute("aria-label", "بستن منو");
      document.body.classList.add("is-locked");
      var first = focusables()[0];
      if (first) first.focus();
    }

    function close() {
      panel.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "باز کردن منو");
      document.body.classList.remove("is-locked");

      window.setTimeout(
        function () {
          if (!panel.classList.contains("is-open")) {
            panel.hidden = true;
            backdrop.hidden = true;
          }
        },
        reduced.matches ? 0 : 420
      );

      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }

    function isOpen() {
      return button.getAttribute("aria-expanded") === "true";
    }

    button.addEventListener("click", function () {
      if (isOpen()) close();
      else open();
    });

    if (closeBtn) closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);

    $$("a", panel).forEach(function (link) {
      link.addEventListener("click", close);
    });

    document.addEventListener("keydown", function (event) {
      if (!isOpen()) return;

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab") return;

      var items = focusables();
      if (!items.length) return;

      var first = items[0];
      var last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    // بستن خودکار هنگام بازگشت به نمای دسکتاپ
    var desktop = window.matchMedia("(min-width: 901px)");
    var onChange = function (event) {
      if (event.matches && isOpen()) close();
    };
    if (desktop.addEventListener) desktop.addEventListener("change", onChange);
    else if (desktop.addListener) desktop.addListener(onChange);
  })();

  /* ----------------------------------------------- ۳. نمایش تدریجی بخش‌ها */

  (function revealOnScroll() {
    var items = $$("[data-reveal]");
    if (!items.length) return;

    if (reduced.matches || !("IntersectionObserver" in window)) {
      items.forEach(function (item) {
        item.classList.add("is-revealed");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });
  })();

  /* ------------------------------------------------------- ۴. اثر پارالاکس */

  (function heroParallax() {
    var media = $(".hero-media img");
    var hero = $(".hero");
    if (!media || !hero || reduced.matches) return;

    var ticking = false;

    function update() {
      var offset = Math.min(window.scrollY, hero.offsetHeight);
      media.style.setProperty("--parallax", (offset * 0.14).toFixed(1) + "px");
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );

    update();
  })();

  /* ------------------------------------------------- ۵. آکاردئون کاربری‌ها */

  (function usesAccordion() {
    var grid = $("#usesGrid");
    if (!grid) return;

    var items = $$(".use", grid);

    items.forEach(function (item) {
      var trigger = $(".use-trigger", item);
      if (!trigger) return;

      trigger.addEventListener("click", function () {
        var willOpen = !item.classList.contains("is-open");

        // مطابق نسخه اصلی، هر بار فقط یک مورد باز می‌ماند
        items.forEach(function (other) {
          other.classList.remove("is-open");
          var otherTrigger = $(".use-trigger", other);
          if (otherTrigger) otherTrigger.setAttribute("aria-expanded", "false");
        });

        if (willOpen) {
          item.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
        }
      });
    });
  })();

  /* ------------------------------------------------ ۶. آکاردئون بخش‌های کلی */

  (function sectionAccordions() {
    $$(".accordion-title").forEach(function (trigger) {
      var target = document.getElementById(trigger.getAttribute("aria-controls"));
      if (!target) return;

      trigger.addEventListener("click", function () {
        var open = trigger.getAttribute("aria-expanded") === "true";
        trigger.setAttribute("aria-expanded", open ? "false" : "true");
        target.classList.toggle("is-open", !open);
      });
    });
  })();

  /* ----------------------------------------------------------- ۷. پانوراما */

  (function panoramaTabs() {
    var tabs = $("#panoTabs");
    var frame = $(".panorama-frame");
    var image = $("#panoImage");
    var index = $("#panoIndex");
    var caption = $("#panoCaption");
    if (!tabs || !frame || !image) return;

    // هر نما با جابه‌جایی و بزرگ‌نمایی متفاوتی از همان تصویر ساخته می‌شود
    var views = [
      { scale: 1.02, x: "0%", y: "0%" },
      { scale: 1.16, x: "6%", y: "-4%" },
      { scale: 1.1, x: "-7%", y: "3%" },
      { scale: 1.24, x: "3%", y: "6%" },
      { scale: 1.3, x: "-4%", y: "-6%" },
      { scale: 1.12, x: "8%", y: "4%" },
      { scale: 1.06, x: "-6%", y: "-2%" }
    ];

    var buttons = $$("button", tabs);

    buttons.forEach(function (button, i) {
      button.addEventListener("click", function () {
        buttons.forEach(function (other) {
          other.classList.remove("active");
          other.setAttribute("aria-selected", "false");
        });
        button.classList.add("active");
        button.setAttribute("aria-selected", "true");

        var view = views[i] || views[0];
        frame.classList.add("is-swapping");

        window.setTimeout(
          function () {
            image.style.setProperty("--pano-scale", view.scale);
            image.style.setProperty("--pano-x", view.x);
            image.style.setProperty("--pano-y", view.y);
            image.alt = "نمای " + toFa(i + 1) + " از پروژه مسجد شباب";
            if (index) index.textContent = toFa(i + 1);
            if (caption) caption.textContent = button.getAttribute("data-view") || "";
            frame.classList.remove("is-swapping");
          },
          reduced.matches ? 0 : 200
        );

        button.scrollIntoView({
          behavior: reduced.matches ? "auto" : "smooth",
          block: "nearest",
          inline: "center"
        });
      });
    });
  })();

  /* ---------------------------------------------------- ۸. طرح‌های مشارکت */

  (function planTabs() {
    var tabs = $("#planTabs");
    var copy = $("#planCopy");
    var title = $("#planTitle");
    var text = $("#planText");
    if (!tabs || !copy || !title || !text) return;

    var plans = [
      [
        "صدقه ماندگار",
        "با مشارکت در ساخت مسجد، سهمی ماندگار از عبادت، آموزش و خدمت‌رسانی این خانه خدا برای خود یا درگذشتگان ثبت کنید."
      ],
      ["سجاده بهشتی", "هزینه تهیه و تجهیز بخشی از فضای عبادی مسجد را تقبل کنید."],
      ["تُنْفِقُوا مِمَّا تُحِبُّونَ", "از آنچه دوست دارید برای ساخت و آبادانی خانه خدا هدیه کنید."],
      ["بلوک بهشتی", "در تأمین مصالح و دیوارچینی بخش‌های مختلف مجتمع سهیم شوید."],
      [
        "یک ستون تا بهشت",
        "با مشارکت در تکمیل سازه، بخشی از بنای ماندگار مسجد را پشتیبانی کنید."
      ]
    ];

    var buttons = $$("button", tabs);

    buttons.forEach(function (button, i) {
      button.addEventListener("click", function () {
        if (button.classList.contains("active")) return;

        buttons.forEach(function (other) {
          other.classList.remove("active");
          other.setAttribute("aria-selected", "false");
        });
        button.classList.add("active");
        button.setAttribute("aria-selected", "true");

        copy.classList.add("is-swapping");

        window.setTimeout(
          function () {
            title.textContent = plans[i][0];
            text.textContent = plans[i][1];
            copy.classList.remove("is-swapping");
          },
          reduced.matches ? 0 : 200
        );

        button.scrollIntoView({
          behavior: reduced.matches ? "auto" : "smooth",
          block: "nearest",
          inline: "center"
        });
      });
    });
  })();

  /* --------------------------------------------- ۹. حلقه و نوارهای پیشرفت */

  (function progressAnimation() {
    var ring = $("#progressRing");
    var bars = $$(".bar");
    var counters = $$("[data-count]");

    var RADIUS = 52;
    var CIRCUMFERENCE = 2 * Math.PI * RADIUS;

    function fillRing() {
      if (!ring) return;
      var value = parseFloat(ring.getAttribute("data-value")) || 0;
      var circle = $(".ring-value", ring);
      if (!circle) return;
      circle.style.strokeDasharray = CIRCUMFERENCE.toFixed(2);
      circle.style.strokeDashoffset = (CIRCUMFERENCE * (1 - value / 100)).toFixed(2);
    }

    function fillBars() {
      bars.forEach(function (bar) {
        bar.classList.add("is-filled");
      });
    }

    function runCounters() {
      counters.forEach(function (node) {
        var target = parseFloat(node.getAttribute("data-count")) || 0;
        var decimals = parseInt(node.getAttribute("data-decimals"), 10) || 0;

        if (reduced.matches) {
          node.textContent = toFa(target.toFixed(decimals)) + "٪";
          return;
        }

        var start = null;
        var duration = 1500;

        function step(now) {
          if (start === null) start = now;
          var progress = Math.min((now - start) / duration, 1);
          // easeOutCubic
          var eased = 1 - Math.pow(1 - progress, 3);
          node.textContent = toFa((target * eased).toFixed(decimals)) + "٪";
          if (progress < 1) window.requestAnimationFrame(step);
        }

        window.requestAnimationFrame(step);
      });
    }

    function play() {
      fillRing();
      fillBars();
      runCounters();
    }

    var anchor = ring || bars[0];
    if (!anchor) return;

    if (reduced.matches || !("IntersectionObserver" in window)) {
      play();
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          play();
          observer.disconnect();
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(anchor);
  })();

  /* ------------------------------------------------ ۱۰. کپی شماره حساب‌ها */

  (function copyFields() {
    var toast = $("#toast");
    var toastTimer = null;

    function showToast(message) {
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add("is-visible");
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(function () {
        toast.classList.remove("is-visible");
      }, 2200);
    }

    function legacyCopy(value) {
      var field = document.createElement("textarea");
      field.value = value;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (error) {
        ok = false;
      }
      document.body.removeChild(field);
      return ok;
    }

    $$(".copy-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        var value = (button.getAttribute("data-copy") || "").replace(/\s+/g, "");

        function done(ok) {
          if (!ok) {
            showToast("کپی انجام نشد؛ لطفاً دستی کپی کنید.");
            return;
          }
          button.classList.add("is-done");
          button.textContent = "کپی شد";
          showToast("شماره در حافظه کپی شد.");
          window.setTimeout(function () {
            button.classList.remove("is-done");
            button.textContent = "کپی";
          }, 1800);
        }

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(value).then(
            function () {
              done(true);
            },
            function () {
              done(legacyCopy(value));
            }
          );
        } else {
          done(legacyCopy(value));
        }
      });
    });
  })();

  /* ------------------------------------------------- ۱۱. نشانه‌گذاری منو */

  (function scrollSpy() {
    var links = $$(".desktop-links a");
    if (!links.length || !("IntersectionObserver" in window)) return;

    var map = {};
    var targets = [];

    links.forEach(function (link) {
      var id = link.getAttribute("href");
      if (!id || id.charAt(0) !== "#") return;
      var section = document.querySelector(id);
      if (!section) return;
      map[id.slice(1)] = link;
      targets.push(section);
    });

    if (!targets.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var link = map[entry.target.id];
          if (!link) return;
          if (entry.isIntersecting) {
            links.forEach(function (other) {
              other.classList.remove("is-active");
            });
            link.classList.add("is-active");
          }
        });
      },
      { rootMargin: "-25% 0px -60% 0px" }
    );

    targets.forEach(function (target) {
      observer.observe(target);
    });
  })();

  /* ---------------------------------------------------- ۱۲. بازگشت به بالا */

  (function backToTop() {
    var button = $("#toTop");
    if (!button) return;

    var ticking = false;

    function update() {
      button.classList.toggle("is-visible", window.scrollY > 700);
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );

    button.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduced.matches ? "auto" : "smooth" });
    });

    update();
  })();
})();
