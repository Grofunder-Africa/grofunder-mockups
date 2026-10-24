/* auth.js: what the member app's signed-out screens share (phase 9, UI-18).
 * Loaded after proto.js (defer) on member/auth/ pages. Not product code.
 *
 *   MemberAuth.keypad(el, opts)  wires a .pinpad to its .pin-dots: 4 digits,
 *                                 then opts.done(pin); Delete removes one
 *   MemberAuth.weak(pin)          note 06's PIN rule; the reason, or ""
 *   MemberAuth.otp(el, done)      a 6-box code: typing moves on, the 6th calls done
 *   MemberAuth.countdown(el, s)   "You can ask for another in 0:42"
 */
(function () {
  "use strict";

  /* 06, MemberPinValidator: exactly 4 digits; not one digit repeated, not a
   * run up or down, not a repeated pair. */
  function weak(pin) {
    if (!/^\d{4}$/.test(pin)) return "Use exactly 4 digits.";
    var d = pin.split("").map(Number);
    if (d.every(function (x) { return x === d[0]; })) return "Don't use the same digit four times.";
    var up = d.every(function (x, i) { return i === 0 || x === d[i - 1] + 1; });
    var down = d.every(function (x, i) { return i === 0 || x === d[i - 1] - 1; });
    if (up || down) return "Don't use digits in a row, like 1234 or 9876.";
    if (pin.slice(0, 2) === pin.slice(2)) return "Don't repeat a pair, like 1212.";
    return "";
  }

  function keypad(root, opts) {
    var dots = root.querySelector(".pin-dots"), pad = root.querySelector(".pinpad"), pin = "";
    if (!dots || !pad) return;
    function draw() {
      dots.querySelectorAll("span").forEach(function (s, i) { s.classList.toggle("on", i < pin.length); });
      dots.setAttribute("aria-label", pin.length + " of 4 digits entered");
    }
    pad.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-del")) { pin = pin.slice(0, -1); dots.classList.remove("error"); draw(); return; }
      var k = b.getAttribute("data-key"); if (k === null) return;
      if (pin.length >= 4) return;
      pin += k; dots.classList.remove("error"); draw();
      if (pin.length === 4) { var done = pin; setTimeout(function () { pin = ""; draw(); opts.done(done); }, 150); }
    });
    draw();
  }

  /* The keypad's markup, so every screen has the same one. */
  function padHtml(left) {
    var keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button type="button" data-key="' + n + '">' + n + "</button>"; }).join("");
    return '<div class="pin-dots" aria-live="polite"><span></span><span></span><span></span><span></span></div>' +
      '<div class="pinpad" role="group" aria-label="PIN keypad">' + keys + (left || '<span></span>') +
      '<button type="button" data-key="0">0</button>' +
      '<button type="button" class="key-plain" data-del aria-label="Delete the last digit"><span class="mdi mdi-backspace-outline" aria-hidden="true"></span></button></div>';
  }

  function otp(root, done) {
    var boxes = [].slice.call(root.querySelectorAll("input"));
    boxes.forEach(function (b, i) {
      b.addEventListener("input", function () {
        b.value = b.value.replace(/\D/g, "").slice(-1);
        if (b.value && boxes[i + 1]) boxes[i + 1].focus();
        if (boxes.every(function (x) { return x.value; })) done(boxes.map(function (x) { return x.value; }).join(""));
      });
      b.addEventListener("keydown", function (e) { if (e.key === "Backspace" && !b.value && boxes[i - 1]) boxes[i - 1].focus(); });
    });
  }
  function otpHtml(label) {
    var s = "";
    for (var i = 1; i <= 6; i++) s += '<input inputmode="numeric" maxlength="1" autocomplete="one-time-code" aria-label="Digit ' + i + '">';
    return '<div class="otp" role="group" aria-label="' + (label || "6-digit code") + '">' + s + "</div>";
  }

  /* 06: a new code after 60 s. */
  function countdown(el, secs) {
    if (!el) return;
    var left = secs, btn = el.querySelector("button"), txt = el.querySelector("[data-left]");
    if (btn) btn.disabled = true;
    var tick = function () {
      if (left <= 0) { if (txt) txt.textContent = ""; if (btn) btn.disabled = false; return; }
      if (txt) txt.textContent = " in 0:" + String(left).padStart(2, "0");
      left -= 1; setTimeout(tick, 1000);
    };
    tick();
  }

  window.MemberAuth = { weak: weak, keypad: keypad, padHtml: padHtml, otp: otp, otpHtml: otpHtml, countdown: countdown,
    /* Signed in: the member app's own pages take over. */
    finish: function () { try { localStorage.setItem("gf.role.member", "in"); } catch (e) {} location.href = "../home/index.html"; } };
})();
