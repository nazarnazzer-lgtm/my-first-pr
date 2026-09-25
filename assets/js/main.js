/* ==========================================================
   PORTFOLIO. Behaviour
   Vanilla JS, no dependencies, no build step.
   ========================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 0. Always open a page at the top ----------------- */
  // html has scroll-behavior:smooth for in-page anchors, so the jump is
  // made with it temporarily off, otherwise it animates on arrival.
  function jumpTop() {
    if (location.hash) return;          // respect deep links like #work
    if (window.__lenis) { window.__lenis.scrollTo(0, { immediate: true }); return; }
    var root = document.documentElement;
    var prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = prev;
  }
  jumpTop();
  // pageshow also fires when a page comes back from the back/forward cache,
  // where a plain load handler would not run at all.
  window.addEventListener('pageshow', jumpTop);
  window.addEventListener('load', jumpTop);

  // Briefly hold the top after arriving. Some browsers restore a remembered
  // offset late, after scripts have already run. Any real input from the
  // reader cancels the hold immediately, so this can never fight a scroll.
  var readerMoved = false;
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
    window.addEventListener(ev, function () { readerMoved = true; },
                            { passive: true, once: true });
  });
  var holdUntil = Date.now() + 1200;
  (function hold() {
    if (readerMoved || location.hash || Date.now() > holdUntil) return;
    if (window.scrollY !== 0) jumpTop();
    requestAnimationFrame(hold);
  })();

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
      // Grid cards and index rows both carry data-tags. Count one set only,
      // or every project is counted twice.
      if (match && item.classList.contains('card')) shown++;
    });
    if (countEl) countEl.textContent = String(shown).padStart(2, '0');
  }

  // Derive the count on load so it stays correct as projects are added.
  if (items.length) applyFilter('all');

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

  /* ---- 5. Flying preview on the index list --------------- */
  /* The panel trails the cursor rather than tracking it, and banks into
     the direction of travel. Both come out of the same lerp: the residual
     between where it is and where it is going IS the velocity. */
  var rows = document.querySelectorAll('[data-preview]');
  var canHover = window.matchMedia('(hover: hover) and (min-width: 901px)').matches;
  if (rows.length && canHover && !reduced) {
    var pv = document.createElement('div');
    pv.className = 'hover-preview';
    pv.innerHTML = '<img alt="" src="' + rows[0].getAttribute('data-preview') + '">';
    document.body.appendChild(pv);
    var pvImg = pv.querySelector('img');

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;   // where the cursor is
    var px = tx, py = ty;                                          // where the panel is
    var vx = 0, on = false, raf = null;

    var frame = function () {
      var nx = px + (tx - px) * 0.11;
      var ny = py + (ty - py) * 0.11;
      vx = vx * 0.86 + (nx - px) * 0.14;
      px = nx; py = ny;
      var tilt = Math.max(-13, Math.min(13, vx * 1.1));
      pv.style.transform =
        'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0)' +
        ' translate(-50%,-50%) rotate(' + tilt.toFixed(2) + 'deg)' +
        ' scale(' + (on ? 1 : 0.82) + ')';
      // keep going while it is still catching up, then stop burning frames
      if (on || Math.abs(tx - px) > 0.4 || Math.abs(ty - py) > 0.4 || Math.abs(vx) > 0.05) {
        raf = requestAnimationFrame(frame);
      } else { raf = null; }
    };
    var kick = function () { if (!raf) raf = requestAnimationFrame(frame); };

    rows.forEach(function (row) {
      row.addEventListener('mouseenter', function () {
        var src = row.getAttribute('data-preview');
        if (pvImg.getAttribute('src') !== src) {
          // decode first, so the swap never shows a half-painted frame
          pv.classList.add('is-swapping');
          var next = new Image();
          next.onload = next.onerror = function () {
            pvImg.src = src;
            pv.classList.remove('is-swapping');
          };
          next.src = src;
        }
        on = true; pv.classList.add('is-on'); kick();
      });
      row.addEventListener('mouseleave', function () {
        on = false; pv.classList.remove('is-on'); kick();
      });
    });
    document.addEventListener('mousemove', function (e) {
      tx = e.clientX + 170; ty = e.clientY; kick();
    }, { passive: true });
  }

  /* ---- 6. Video: play in view, pause out, sound toggle --- */
  // preload="none" keeps the page light with several films on it; the
  // poster shows until the video is actually scrolled to.
  var vids = document.querySelectorAll('video[data-autoplay]');
  if (vids.length && 'IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.play().catch(function () {}); }
        else { e.target.pause(); }
      });
    }, { threshold: 0.25 });
    vids.forEach(function (v) { vio.observe(v); });
  }

  document.querySelectorAll('[data-sound]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var v = btn.parentElement.querySelector('video');
      if (!v) return;
      v.muted = !v.muted;
      btn.textContent = v.muted ? 'Sound on' : 'Sound off';
      if (!v.muted) v.play().catch(function () {});
    });
  });

  /* ---- 7. Cycling card previews -------------------------- */
  // Advances only while the card is on screen, so nothing runs in the
  // background, and stands still under reduced motion.
  var shows = document.querySelectorAll('[data-slideshow]');
  if (shows.length && 'IntersectionObserver' in window &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    shows.forEach(function (el) {
      var frames = el.querySelectorAll('img'), i = 0, timer = null;
      if (frames.length < 2) return;
      var step = function () {
        frames[i].classList.remove('on');
        i = (i + 1) % frames.length;
        frames[i].classList.add('on');
      };
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !timer) { timer = setInterval(step, 1600); }
          else if (!e.isIntersecting && timer) { clearInterval(timer); timer = null; }
        });
      }, { threshold: 0.35 }).observe(el);
    });
  }

  /* ---- 8. Footer year ------------------------------------ */
  var yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
