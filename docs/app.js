/* OCRFlow docs — light interactions (no dependencies) */
(function () {
  'use strict';

  /* --- Theme toggle (default set pre-paint in <head>) --- */
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');

  var syncLogos = function (theme) {
    document.querySelectorAll('.brand-logo').forEach(function (img) {
      var next = img.getAttribute(theme === 'light' ? 'data-light' : 'data-dark');
      if (next && img.getAttribute('src') !== next) img.setAttribute('src', next);
    });
  };
  syncLogos(root.getAttribute('data-theme') || 'dark');

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      syncLogos(next);
      try { localStorage.setItem('ocrflow-theme', next); } catch (e) {}
    });
  }

  /* --- Nav shadow on scroll --- */
  var nav = document.getElementById('nav');
  var onScroll = function () {
    if (window.scrollY > 8) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --- Scroll reveal --- */
  var reveals = document.querySelectorAll('.reveal:not(.in)');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* --- Feature card spotlight follows cursor --- */
  document.querySelectorAll('.feature').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* --- Quickstart code tabs --- */
  var tabs = document.querySelectorAll('.code-tab');
  var panes = document.querySelectorAll('.code-pane');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('data-tab');
      tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
      panes.forEach(function (p) {
        p.classList.toggle('active', p.getAttribute('data-pane') === target);
      });
    });
  });

  /* --- Copy button copies the active pane's text --- */
  var copyBtn = document.querySelector('[data-copy]');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var active = document.querySelector('.code-pane.active pre');
      if (!active) return;
      var text = active.innerText.replace(/^\$ /gm, '');
      navigator.clipboard.writeText(text).then(function () {
        var prev = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(function () { copyBtn.textContent = prev; }, 1400);
      }).catch(function () {});
    });
  }
})();
