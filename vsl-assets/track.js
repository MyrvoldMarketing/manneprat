/* Manneprat: Meta-piksel, Microsoft Clarity + hendelser for VSL-funnelen.
   Pikselen lastes først etter samtykke. Sett KREV_SAMTYKKE = false for å laste den uten å spørre. */
(function () {
  var PIXEL_ID = '1557481308803825';
  var CLARITY_ID = 'yx7p8mx6vi';
  var LOKAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var KREV_SAMTYKKE = true;
  var KEY = 'mp_samtykke';
  var queue = [];
  var loaded = false;

  // Ta vare på hvilken annonse besøket kom fra (utm_*), så det kan følge med skjemaet
  try {
    var q = new URLSearchParams(location.search), utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
      if (q.get(k)) utm[k] = q.get(k);
    });
    if (Object.keys(utm).length) sessionStorage.setItem('mp_utm', JSON.stringify(utm));
  } catch (_) {}

  function loadPixel() {
    if (loaded) return;
    loaded = true;
    // Lokal testing skal ikke sende hendelser til den ekte pikselen
    if (LOKAL && !window.fbq) window.fbq = function () { console.log('[fbq]', [].slice.call(arguments)); };
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    // Microsoft Clarity (opptak og varmekart), lastes også først etter samtykke
    if (!LOKAL) {
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
      })(window, document, 'clarity', 'script', CLARITY_ID);
    }
    fbq('init', PIXEL_ID);
    fbq('track', 'PageView');
    queue.forEach(function (a) { fbq.apply(null, a); });
    queue = [];
  }

  // mpTrack('Lead') = standardhendelse, mpTrack('VSL_25', {...}, true) = egendefinert
  window.mpTrack = function (name, params, custom) {
    var a = [custom ? 'trackCustom' : 'track', name, params || {}];
    if (loaded) fbq.apply(null, a); else queue.push(a);
  };

  function banner() {
    var d = document.createElement('div');
    d.setAttribute('role', 'dialog');
    d.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;max-width:560px;margin:0 auto;background:#161a21;color:#e8e6e1;border:1px solid #2a303a;border-radius:10px;padding:10px 12px;font:12.5px/1.4 Inter,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45);display:flex;gap:10px;align-items:center';
    d.innerHTML = '<div style="flex:1">Vi bruker informasjonskapsler fra Meta og Microsoft Clarity til å måle annonsene og bruken av siden. Greit?</div>' +
      '<div style="display:flex;gap:6px;flex-shrink:0">' +
      '<button type="button" data-v="nei" style="background:none;border:1px solid #3a414d;color:#e8e6e1;border-radius:8px;padding:8px 10px;font:inherit;cursor:pointer">Nei takk</button>' +
      '<button type="button" data-v="ja" style="background:#c9814a;border:0;color:#0e1116;border-radius:8px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer">Godta</button></div>';
    d.addEventListener('click', function (e) {
      var v = e.target && e.target.getAttribute('data-v');
      if (!v) return;
      try { localStorage.setItem(KEY, v); } catch (_) {}
      d.remove();
      if (v === 'ja') loadPixel();
    });
    // På bookingsiden legges banneret øverst, så det aldri dekker knappen
    if (document.body.classList.contains('side-booking')) { d.style.bottom = 'auto'; d.style.top = '8px'; }
    document.body.appendChild(d);
  }

  var valg = null;
  try { valg = localStorage.getItem(KEY); } catch (_) {}
  if (!KREV_SAMTYKKE || valg === 'ja') loadPixel();
  else if (valg !== 'nei') {
    if (document.body) banner(); else document.addEventListener('DOMContentLoaded', banner);
  }

  // ---------- VSL-siden: hvor mye av videoen blir sett ----------
  function vsl(v) {
    var navn = location.pathname.indexOf('vsl-a') > -1 ? 'VSL-A' : 'VSL-B';
    var sendt = {}, maks = 0, sist = 0, sistSendt = 0;   // maks = sekunder som faktisk er spilt av
    function sek() { return Math.round(maks); }
    v.addEventListener('play', function () {
      sist = v.currentTime;
      if (sendt.play) return; sendt.play = 1;
      mpTrack('ViewContent', { content_name: navn, content_category: 'vsl' });
      mpTrack('VSL_Start', { video: navn }, true);
    });
    v.addEventListener('seeked', function () { sist = v.currentTime; });
    v.addEventListener('timeupdate', function () {
      if (!v.duration) return;
      var d = v.currentTime - sist; sist = v.currentTime;
      if (d > 0 && d < 2) maks += d;          // hopp framover telles ikke
      var p = maks / v.duration * 100;
      [25, 50, 75, 95].forEach(function (m) {
        if (p >= m && !sendt[m]) { sendt[m] = 1; mpTrack('VSL_' + m, { video: navn, sekunder: sek() }, true); }
      });
    });
    function tid() {
      if (sek() < 3 || sek() - sistSendt < 5) return;
      sistSendt = sek();
      mpTrack('VSL_Tid', { video: navn, sekunder: sek(), prosent: Math.round(maks / (v.duration || 1) * 100) }, true);
    }
    v.addEventListener('pause', tid);
    v.addEventListener('ended', tid);
    window.addEventListener('pagehide', tid);
    var cta = document.querySelector('.vsl__cta a');
    if (cta) cta.addEventListener('click', function () {
      tid();
      mpTrack('VSL_BookKlikk', { video: navn, sekunder: sek() }, true);
    });
  }

  // ---------- Kontaktskjemaet: startet, fylt ut, sendt ----------
  function skjema(f) {
    var startet = false, utfylt = false;
    mpTrack('Skjema_Vist', {}, true);
    function begynt() {
      if (startet) return; startet = true;
      mpTrack('Skjema_Startet', {}, true);
    }
    f.addEventListener('focusin', begynt);
    f.addEventListener('input', begynt);
    f.addEventListener('change', begynt);
    f.addEventListener('input', function () {
      if (utfylt || !f.checkValidity()) return; utfylt = true;
      mpTrack('Skjema_Utfylt', {}, true);
    });
    f.addEventListener('change', function () {
      if (utfylt || !f.checkValidity()) return; utfylt = true;
      mpTrack('Skjema_Utfylt', {}, true);
    });
  }

  function start() {
    var v = document.querySelector('.vsl video'); if (v) vsl(v);
    var f = document.getElementById('contactForm'); if (f) skjema(f);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
