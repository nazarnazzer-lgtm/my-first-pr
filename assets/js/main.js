/* ==========================================================
   PORTFOLIO — behaviour
   Vanilla JS, no dependencies, no build step.
   ========================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 1. Sticky header hairline ------------------------- */
  var head = document.querySelector('.site-head');
  if (head) {
    var onScroll = function () {
      head.classList.toggle('is-stuck', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- 2. Mobile nav ------------------------------------- */
  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.textContent = open ? 'Close' : 'Menu';
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.textContent = 'Menu';
      }
    });
  }

  /* ---- 3. Reveal on scroll ------------------------------- */
  var revealables = document.querySelectorAll('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
        setTimeout(function () { el.classList.add('is-in'); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ---- 4. Work page: filter + view toggle ---------------- */
  var filterBtns = document.querySelectorAll('[data-filter]');
  var items = document.querySelectorAll('[data-tags]');
  var countEl = document.querySelector('[data-count]');

  function applyFilter(key) {
    var shown = 0;
    items.forEach(function (item) {
      var tags = (item.getAttribute('data-tags') || '').toLowerCase();
      var match = key === 'all' || tags.indexOf(key) !== -1;
      item.classList.toggle('is-hidden', !match);
      if (match) shown++;
    });
    if (countEl) countEl.textContent = String(shown).padStart(2, '0');
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      btn.setAttribute('aria-pressed', 'true');
      applyFilter((btn.getAttribute('data-filter') || 'all').toLowerCase());
    });
  });

  var viewBtns = document.querySelectorAll('[data-view]');
  viewBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var view = btn.getAttribute('data-view');
      viewBtns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      btn.setAttribute('aria-pressed', 'true');
      var grid = document.querySelector('[data-view-grid]');
      var list = document.querySelector('[data-view-list]');
      if (grid) grid.classList.toggle('is-hidden', view !== 'grid');
      if (list) list.classList.toggle('is-hidden', view !== 'list');
    });
  });

  /* ---- 5. Cursor-follow preview on the index list -------- */
  var rows = document.querySelectorAll('[data-preview]');
  var canHover = window.matchMedia('(hover: hover) and (min-width: 901px)').matches;
  if (rows.length && canHover && !reduced) {
    var pv = document.createElement('div');
    pv.className = 'hover-preview';
    pv.innerHTML = '<img alt="" src="' + rows[0].getAttribute('data-preview') + '">';
    document.body.appendChild(pv);
    var pvImg = pv.querySelector('img');
    var x = 0, y = 0, raf = null;

    var move = function () {
      pv.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%)' +
        (pv.classList.contains('is-on') ? ' scale(1)' : ' scale(.9)');
      raf = null;
    };

    rows.forEach(function (row) {
      row.addEventListener('mouseenter', function () {
        pvImg.src = row.getAttribute('data-preview');
        pv.classList.add('is-on');
      });
      row.addEventListener('mouseleave', function () { pv.classList.remove('is-on'); });
    });
    document.addEventListener('mousemove', function (e) {
      x = e.clientX + 150; y = e.clientY;
      if (!raf) raf = requestAnimationFrame(move);
    }, { passive: true });
  }

  /* ---- 6. Footer year ------------------------------------ */
  var yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
