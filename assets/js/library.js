/* ==========================================================================
   کتابخانه — جست‌وجو و فیلتر موضوعی
   ⚠ فهرست زیر نمونهٔ طراحی است و باید با داده‌های واقعی کتابخانه جایگزین شود.
   ========================================================================== */

(function () {
  "use strict";

  var shelf = document.getElementById("shelf");
  if (!shelf) return;

  var input = document.getElementById("bookSearch");
  var clearBtn = document.getElementById("searchClear");
  var goBtn = document.getElementById("searchGo");
  var chipsBox = document.getElementById("catChips");
  var countLine = document.getElementById("resultCount");
  var toast = document.getElementById("toast");

  var FA = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

  function toFa(value) {
    return String(value).replace(/\d/g, function (d) {
      return FA[+d];
    });
  }

  /* هر موضوع رنگ جلد خودش را دارد */
  var PALETTE = {
    "قرآن و تفسیر": ["#12705c", "#063029"],
    "تاریخ اسلام": ["#1c4a6e", "#0f2740"],
    "ادبیات فارسی": ["#8a4a2a", "#4a2314"],
    "کودک و نوجوان": ["#b3862f", "#6d4d13"],
    "دفاع مقدس": ["#3d5a3a", "#1d2f1c"],
    "مهارت و خانواده": ["#5b3d6b", "#2e1c38"]
  };

  var BOOKS = [
    ["ترجمه و شرح دعای کمیل", "گروه پژوهشی مسجد", "قرآن و تفسیر", "free"],
    ["تفسیر موضوعی جزء سی‌ام", "دفتر فرهنگی شباب", "قرآن و تفسیر", "free"],
    ["روخوانی و تجوید قرآن کریم", "واحد آموزش قرآن", "قرآن و تفسیر", "out"],
    ["چهل حدیث برای نوجوان", "واحد تربیتی شباب", "قرآن و تفسیر", "free"],

    ["سیره پیامبر اعظم", "کتابخانه مسجد شباب", "تاریخ اسلام", "free"],
    ["زندگانی امام رضا علیه‌السلام", "هیئت شباب‌الرضا", "تاریخ اسلام", "hold"],
    ["تاریخ تشیع در خوزستان", "پژوهش محلی آبادان", "تاریخ اسلام", "free"],
    ["مسجد در تمدن اسلامی", "گروه پژوهشی مسجد", "تاریخ اسلام", "out"],

    ["گلستان سعدی", "سعدی شیرازی", "ادبیات فارسی", "free"],
    ["دیوان حافظ", "حافظ شیرازی", "ادبیات فارسی", "free"],
    ["مثنوی معنوی — دفتر اول", "مولانا جلال‌الدین", "ادبیات فارسی", "out"],
    ["برگزیده شعر معاصر آبادان", "انجمن ادبی اروند", "ادبیات فارسی", "free"],

    ["قصه‌های شب مسجد", "واحد کودک شباب", "کودک و نوجوان", "free"],
    ["بچه‌های محله ما", "واحد کودک شباب", "کودک و نوجوان", "free"],
    ["دانشنامه کوچک آفرینش", "کتابخانه مسجد شباب", "کودک و نوجوان", "hold"],
    ["راهنمای اردوی نوجوان", "گروه جهادی انصارالمهدی", "کودک و نوجوان", "free"],

    ["روایت اروند", "پایگاه خادم‌الشهدا", "دفاع مقدس", "free"],
    ["یادگاران آبادان", "پایگاه خادم‌الشهدا", "دفاع مقدس", "out"],
    ["خاطرات محاصره", "کتابخانه مسجد شباب", "دفاع مقدس", "free"],

    ["مهارت گفت‌وگو در خانواده", "واحد مشاوره شباب", "مهارت و خانواده", "free"],
    ["تربیت نوجوان امروز", "واحد تربیتی شباب", "مهارت و خانواده", "free"],
    ["مدیریت زمان برای دانش‌آموز", "واحد آموزش شباب", "مهارت و خانواده", "hold"],
    ["راهنمای کار داوطلبانه", "گروه جهادی انصارالمهدی", "مهارت و خانواده", "free"]
  ];

  var STATUS = {
    free: "موجود در قفسه",
    out: "در امانت",
    hold: "رزرو شده"
  };

  var activeCat = "all";
  var query = "";

  function normalize(text) {
    // ی/ک عربی و فارسی را یکسان می‌کند تا جست‌وجو برای کاربر قابل‌اتکا باشد
    return String(text)
      .replace(/[يى]/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/‌/g, " ")
      .trim()
      .toLowerCase();
  }

  function matches(book) {
    if (activeCat !== "all" && book[2] !== activeCat) return false;
    if (!query) return true;
    var q = normalize(query);
    return normalize(book[0]).indexOf(q) !== -1 || normalize(book[1]).indexOf(q) !== -1;
  }

  function cover(book) {
    var colors = PALETTE[book[2]] || ["#0f5a49", "#073329"];
    var el = document.createElement("span");
    el.className = "book-cover";
    el.style.setProperty("--c1", colors[0]);
    el.style.setProperty("--c2", colors[1]);

    var rule = document.createElement("span");
    rule.className = "rule";

    var title = document.createElement("h3");
    title.textContent = book[0];

    var author = document.createElement("em");
    author.textContent = book[1];

    el.appendChild(rule);
    el.appendChild(title);
    el.appendChild(author);
    return el;
  }

  function card(book, index) {
    var article = document.createElement("article");
    article.className = "book";
    article.setAttribute("data-reveal", "");
    article.style.setProperty("--d", String(index % 8));

    article.appendChild(cover(book));

    var meta = document.createElement("div");
    meta.className = "book-meta";

    var tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = book[2];

    var status = document.createElement("span");
    status.className = "status " + book[3];
    status.textContent = STATUS[book[3]];

    meta.appendChild(tag);
    meta.appendChild(status);
    article.appendChild(meta);

    article.addEventListener("click", function () {
      showToast(book[0] + " — " + STATUS[book[3]] + " · " + book[2]);
    });

    return article;
  }

  var toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2600);
  }

  function render() {
    var found = BOOKS.filter(matches);
    shelf.textContent = "";

    if (!found.length) {
      var empty = document.createElement("div");
      empty.className = "shelf-empty";
      var b = document.createElement("b");
      b.textContent = "عنوانی پیدا نشد";
      var p = document.createElement("p");
      p.textContent = "عبارت دیگری را امتحان کنید یا فیلتر موضوعی را بردارید.";
      empty.appendChild(b);
      empty.appendChild(p);
      shelf.appendChild(empty);
    } else {
      var fragment = document.createDocumentFragment();
      found.forEach(function (book, i) {
        fragment.appendChild(card(book, i));
      });
      shelf.appendChild(fragment);
    }

    if (countLine) {
      countLine.innerHTML = "";
      var strong = document.createElement("b");
      strong.textContent = toFa(found.length) + " عنوان";
      countLine.appendChild(strong);
      countLine.appendChild(
        document.createTextNode(
          activeCat === "all" ? " در فهرست نمونه" : " در موضوع «" + activeCat + "»"
        )
      );
    }

    // کارت‌های تازه‌ساخته باید مثل بقیهٔ صفحه ظاهر شوند
    window.requestAnimationFrame(function () {
      shelf.querySelectorAll("[data-reveal]").forEach(function (el) {
        el.classList.add("is-revealed");
      });
    });
  }

  /* ------------------------------------------------------------- رویدادها */

  if (input) {
    input.addEventListener("input", function () {
      query = input.value;
      if (clearBtn) clearBtn.hidden = !query;
      render();
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && input.value) {
        event.preventDefault();
        input.value = "";
        query = "";
        if (clearBtn) clearBtn.hidden = true;
        render();
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      input.value = "";
      query = "";
      clearBtn.hidden = true;
      input.focus();
      render();
    });
  }

  if (goBtn) {
    goBtn.addEventListener("click", function () {
      shelf.scrollIntoView({ block: "nearest", behavior: "smooth" });
      if (input) input.focus();
    });
  }

  if (chipsBox) {
    chipsBox.addEventListener("click", function (event) {
      var chip = event.target.closest(".chip");
      if (!chip) return;

      Array.prototype.forEach.call(chipsBox.querySelectorAll(".chip"), function (other) {
        other.setAttribute("aria-pressed", "false");
      });
      chip.setAttribute("aria-pressed", "true");
      activeCat = chip.getAttribute("data-cat");
      render();
    });
  }

  render();
})();
