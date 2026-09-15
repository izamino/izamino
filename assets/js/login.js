/* ==========================================================================
   ورود و عضویت — رفتار فرم
   ⚠ این یک نمونهٔ طراحی است: هیچ درخواستی به شبکه فرستاده نمی‌شود و هیچ
     اطلاعاتی ذخیره نمی‌شود. برای راه‌اندازی واقعی باید به سرویس پیامک و
     پایگاه دادهٔ اعضا وصل شود.
   ========================================================================== */

(function () {
  "use strict";

  var card = document.querySelector(".auth-card");
  if (!card) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  var FA = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

  function toFa(value) {
    return String(value).replace(/\d/g, function (d) {
      return FA[+d];
    });
  }

  /** ارقام فارسی و عربی را به لاتین برمی‌گرداند تا اعتبارسنجی کار کند */
  function toLatinDigits(value) {
    return String(value)
      .replace(/[۰-۹]/g, function (d) {
        return String(d.charCodeAt(0) - 0x06f0);
      })
      .replace(/[٠-٩]/g, function (d) {
        return String(d.charCodeAt(0) - 0x0660);
      });
  }

  function $(id) {
    return document.getElementById(id);
  }

  function setError(fieldId, errorId, show, message) {
    var field = $(fieldId);
    var error = $(errorId);
    if (field) field.classList.toggle("invalid", !!show);
    if (error) {
      if (message) error.textContent = message;
      error.hidden = !show;
      error.style.display = show ? "" : "none";
    }
  }

  function note(html) {
    var box = $("formNote");
    if (!box) return;
    box.innerHTML = "";
    var b = document.createElement("b");
    b.textContent = "نمونهٔ طراحی — ";
    box.appendChild(b);
    box.appendChild(document.createTextNode(html));
    box.hidden = false;
    box.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "nearest" });
  }

  function isValidMobile(raw) {
    var value = toLatinDigits(raw).replace(/[\s-]/g, "");
    return /^09\d{9}$/.test(value);
  }

  /* --------------------------------------------------------- ۱. تب‌ها */

  var tabs = [
    { tab: $("tabLogin"), pane: $("paneLogin") },
    { tab: $("tabJoin"), pane: $("paneJoin") }
  ];

  function selectTab(index) {
    tabs.forEach(function (entry, i) {
      if (!entry.tab || !entry.pane) return;
      var on = i === index;
      entry.tab.setAttribute("aria-selected", on ? "true" : "false");
      entry.pane.hidden = !on;
    });
    var box = $("formNote");
    if (box) box.hidden = true;
  }

  tabs.forEach(function (entry, i) {
    if (!entry.tab) return;
    entry.tab.addEventListener("click", function () {
      selectTab(i);
    });
  });

  // جابه‌جایی بین تب‌ها با کلیدهای جهت‌دار
  var tabList = card.querySelector('[role="tablist"]');
  if (tabList) {
    tabList.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      var current = tabs.findIndex(function (entry) {
        return entry.tab && entry.tab.getAttribute("aria-selected") === "true";
      });
      // در چیدمان راست‌به‌چپ، فلش چپ یعنی تب بعدی
      var next = event.key === "ArrowLeft" ? current + 1 : current - 1;
      if (next < 0) next = tabs.length - 1;
      if (next >= tabs.length) next = 0;
      selectTab(next);
      if (tabs[next].tab) tabs[next].tab.focus();
    });
  }

  var goLogin = $("goLogin");
  if (goLogin) {
    goLogin.addEventListener("click", function () {
      selectTab(0);
      var phone = $("loginPhone");
      if (phone) phone.focus();
    });
  }

  /* ------------------------------------------------- ۲. ورود: گام یکم */

  var step1 = $("loginStep1");
  var step2 = $("loginStep2");
  var phoneInput = $("loginPhone");
  var sendCode = $("sendCode");

  function showStep2(phone) {
    if (!step1 || !step2) return;
    step1.hidden = true;
    step2.hidden = false;
    var sent = $("sentTo");
    if (sent) {
      // شماره در متن راست‌به‌چپ باید جداسازی دوجهته شود تا درست بنشیند
      sent.textContent = "";
      sent.appendChild(document.createTextNode("کد پنج‌رقمی به شمارهٔ "));
      var bdi = document.createElement("bdi");
      bdi.textContent = toFa(phone);
      sent.appendChild(bdi);
      sent.appendChild(document.createTextNode(" پیامک شد."));
    }
    startCountdown();
    var first = $("otp1");
    if (first) first.focus();
  }

  if (sendCode) {
    sendCode.addEventListener("click", function () {
      var value = phoneInput ? phoneInput.value : "";
      if (!isValidMobile(value)) {
        setError("fieldPhone", "phoneError", true, "شمارهٔ موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.");
        if (phoneInput) phoneInput.focus();
        return;
      }
      setError("fieldPhone", "phoneError", false);
      showStep2(toLatinDigits(value).replace(/[\s-]/g, ""));
    });
  }

  if (phoneInput) {
    phoneInput.addEventListener("input", function () {
      setError("fieldPhone", "phoneError", false);
    });
    phoneInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && sendCode) {
        event.preventDefault();
        sendCode.click();
      }
    });
  }

  var changePhone = $("changePhone");
  if (changePhone) {
    changePhone.addEventListener("click", function () {
      if (!step1 || !step2) return;
      step2.hidden = true;
      step1.hidden = false;
      stopCountdown();
      if (phoneInput) phoneInput.focus();
    });
  }

  /* ------------------------------------------------- ۳. خانه‌های کد */

  var otpBox = $("otpBox");
  var otpInputs = otpBox ? Array.prototype.slice.call(otpBox.querySelectorAll("input")) : [];

  otpInputs.forEach(function (input, index) {
    input.addEventListener("input", function () {
      var digits = toLatinDigits(input.value).replace(/\D/g, "");
      input.value = digits.slice(-1);
      setError("fieldOtp", "otpError", false);
      if (input.value && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Backspace" && !input.value && index > 0) {
        event.preventDefault();
        otpInputs[index - 1].focus();
        otpInputs[index - 1].value = "";
      }
      if (event.key === "ArrowLeft" && index < otpInputs.length - 1) {
        event.preventDefault();
        otpInputs[index + 1].focus();
      }
      if (event.key === "ArrowRight" && index > 0) {
        event.preventDefault();
        otpInputs[index - 1].focus();
      }
    });

    // چسباندن کل کد در هر خانه‌ای، خانه‌ها را پر می‌کند
    input.addEventListener("paste", function (event) {
      event.preventDefault();
      var text = (event.clipboardData || window.clipboardData).getData("text");
      var digits = toLatinDigits(text).replace(/\D/g, "").split("");
      otpInputs.forEach(function (box, i) {
        if (digits[i] !== undefined) box.value = digits[i];
      });
      var next = Math.min(digits.length, otpInputs.length - 1);
      otpInputs[next].focus();
    });
  });

  var verify = $("verifyCode");
  if (verify) {
    verify.addEventListener("click", function () {
      var complete = otpInputs.every(function (input) {
        return input.value !== "";
      });
      if (!complete) {
        setError("fieldOtp", "otpError", true, "هر پنج رقم کد را وارد کنید.");
        var empty = otpInputs.find(function (input) {
          return !input.value;
        });
        if (empty) empty.focus();
        return;
      }
      setError("fieldOtp", "otpError", false);
      stopCountdown();
      note("کد کامل است. در سامانهٔ واقعی، اینجا کد با سرویس پیامک بررسی و کاربر وارد حسابش می‌شود.");
    });
  }

  /* ------------------------------------------------ ۴. شمارش معکوس */

  var countdownEl = $("countdown");
  var resendBtn = $("resendBtn");
  var timer = null;
  var remaining = 120;

  function paint() {
    if (!countdownEl) return;
    var m = Math.floor(remaining / 60);
    var s = remaining % 60;
    countdownEl.textContent = toFa(("0" + m).slice(-2) + ":" + ("0" + s).slice(-2));
  }

  function stopCountdown() {
    window.clearInterval(timer);
    timer = null;
  }

  function startCountdown() {
    stopCountdown();
    remaining = 120;
    paint();
    if (resendBtn) resendBtn.disabled = true;
    timer = window.setInterval(function () {
      remaining -= 1;
      paint();
      if (remaining <= 0) {
        stopCountdown();
        if (resendBtn) resendBtn.disabled = false;
        if (countdownEl) countdownEl.textContent = "۰۰:۰۰";
      }
    }, 1000);
  }

  if (resendBtn) {
    resendBtn.addEventListener("click", function () {
      if (resendBtn.disabled) return;
      startCountdown();
      note("کد دوباره فرستاده شد (در این نمونه، پیامکی ارسال نمی‌شود).");
    });
  }

  /* ------------------------------------------------------ ۵. عضویت */

  var submitJoin = $("submitJoin");
  if (submitJoin) {
    submitJoin.addEventListener("click", function () {
      var name = $("joinName");
      var phone = $("joinPhone");
      var terms = $("joinTerms");
      var ok = true;

      if (!name || name.value.trim().split(/\s+/).length < 2) {
        setError("fieldName", "nameError", true);
        ok = false;
      } else {
        setError("fieldName", "nameError", false);
      }

      if (!phone || !isValidMobile(phone.value)) {
        setError("fieldJoinPhone", "joinPhoneError", true, "شمارهٔ موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.");
        ok = false;
      } else {
        setError("fieldJoinPhone", "joinPhoneError", false);
      }

      var termsError = $("termsError");
      if (!terms || !terms.checked) {
        if (termsError) {
          termsError.hidden = false;
          termsError.style.display = "";
        }
        ok = false;
      } else if (termsError) {
        termsError.hidden = true;
        termsError.style.display = "none";
      }

      if (!ok) return;

      var group = $("joinGroup");
      note(
        "اطلاعات کامل است (" +
          name.value.trim() +
          " · " +
          (group ? group.value : "") +
          "). در سامانهٔ واقعی، اینجا کد تأیید پیامک و عضویت ثبت می‌شود."
      );
    });
  }

  [$("joinName"), $("joinPhone")].forEach(function (input) {
    if (!input) return;
    input.addEventListener("input", function () {
      var wrap = input.closest(".field");
      if (wrap) wrap.classList.remove("invalid");
    });
  });

  var termsBox = $("joinTerms");
  if (termsBox) {
    termsBox.addEventListener("change", function () {
      var termsError = $("termsError");
      if (termsBox.checked && termsError) {
        termsError.hidden = true;
        termsError.style.display = "none";
      }
    });
  }

  /* اگر کاربر با #join آمده، مستقیم تب عضویت باز شود */
  if (window.location.hash === "#join") selectTab(1);
})();
