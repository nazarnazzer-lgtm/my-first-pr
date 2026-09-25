/* ==========================================================
   MOTION LAYER
   Delete the <script src="assets/js/motion.js"> tag from the
   pages and the site works exactly as before, just static.
   ========================================================== */
(function () {
  'use strict';

  /* ---- SETTINGS. Dial these. ---------------------------- */
  var MOTION = {
    smoothScroll: true,   // weighted, inertial scrolling
    textReveal:   true,   // headings rise word by word from a mask
    imageReveal:  true,   // images wipe open instead of appearing
    parallax:     true,   // large editorial images drift as you scroll
    magnetic:     true,   // buttons lean toward the cursor
    pageCut:      true,   // pages cut to black and back on navigation
    speed:        1.3     // 1 = as tuned. 1.4 = slower, 0.7 = snappier
  };

  /* ---- Widows ------------------------------------------- 
     Binds the last two words of a block so one can never be left alone
     on a final line. Runs before anything else, and before the word
     splitting below, which would otherwise defeat text-wrap: balance. */
  (function () {
    function noWidow(el) {
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      var nodes = [], n;
      while ((n = walker.nextNode())) { if (n.textContent.trim()) nodes.push(n); }
      for (var k = nodes.length - 1; k >= 0; k--) {
        var raw = nodes[k].textContent;
        // Keep whatever trailed. Writing the trimmed string back was eating
        // the space in front of an inline element, so "Award <span>2026" and
        // "Heinz <span>(spec)" rendered with the two run together.
        var tail = (raw.match(/\s+$/) || [''])[0];
        var t = raw.slice(0, raw.length - tail.length);
        var i = t.lastIndexOf(' ');
        if (i > 0) {                       // bind here and stop
          nodes[k].textContent = t.slice(0, i) + '\u00A0' + t.slice(i + 1) + tail;
          return;
        }
        // A lone word ahead of an inline element (a year, a tag) has nothing
        // to bind to in its own node, so bind it across to the word before.
        if (k > 0 && /\s$/.test(nodes[k - 1].textContent)) {
          nodes[k - 1].textContent =
            nodes[k - 1].textContent.replace(/\s+$/, '\u00A0');
          return;
        }
      }
    }
    document.querySelectorAll(
      'p, li, .lead, h1, h2, h3, figcaption, dd, .card__idea, .stat__note, .case-idea, .index-row__title'
    ).forEach(noWidow);
  })();

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reduced) return;                       // nothing below runs

  var root = document.documentElement;
  root.classList.add('motion-ready');         // CSS hooks gate on this, so
                                              // no JS means nothing is hidden

  /* ---- 1. Smooth scroll --------------------------------- */
  if (MOTION.smoothScroll && window.Lenis) {
    root.style.scrollBehavior = 'auto';       // Lenis owns scrolling now
    var lenis = new window.Lenis({
      duration: 0.85 * MOTION.speed,          // deliberately quicker than
                                              // the 1.2 default: a recruiter
                                              // skimming should never feel
                                              // like they are fighting it
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.8
    });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })();
    window.__lenis = lenis;                   // main.js uses this to jump to top

    // in-page anchors
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -80 });
    });
  }

  /* ---- 2. Word-mask reveal for headings ------------------ */
  // Each word gets its own mask, so there is no line measuring and
  // nothing to recompute on resize.
  function wrapWords(node, out) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {                       // text node
        if (!child.textContent.trim()) return;
        var frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(function (chunk) {
          if (!chunk) return;
          if (/^\s+$/.test(chunk)) { frag.appendChild(document.createTextNode(' ')); return; }
          var mask = document.createElement('span');
          var inner = document.createElement('span');
          mask.className = 'wm'; inner.className = 'wi';
          inner.textContent = chunk;
          mask.appendChild(inner);
          frag.appendChild(mask);
          out.push(inner);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1 && child.tagName !== 'BR') {
        wrapWords(child, out);                          // keeps <strong>, <span>
      }
    });
  }

  if (MOTION.textReveal) {
    document.querySelectorAll('[data-split]').forEach(function (el) {
      el.removeAttribute('data-reveal');   // the word mask IS the reveal
      var words = [];
      wrapWords(el, words);
      words.forEach(function (w, i) {
        w.style.transitionDelay = (i * 0.03 * MOTION.speed).toFixed(3) + 's';
      });
      el.__words = words;

      /* The name goes one level further: letter by letter, so the accent
         can cascade across it on arrival and answer the cursor. */
      if (el.classList.contains('hero-name')) {
        var n = 0;
        words.forEach(function (w) {
          var text = w.textContent;
          w.textContent = '';
          text.split('').forEach(function (ch) {
            var l = document.createElement('span');
            l.className = 'ltr';
            l.textContent = ch;
            l.style.transitionDelay = (n * 0.035).toFixed(3) + 's';
            w.appendChild(l);
            n++;
          });
        });
        var letters = el.querySelectorAll('.ltr');
        // one pass of colour on arrival, then it settles to ink
        setTimeout(function () {
          letters.forEach(function (l) { l.classList.add('lit'); });
          setTimeout(function () {
            letters.forEach(function (l) { l.classList.remove('lit'); });
          }, 900 + letters.length * 35);
        }, 420);
      }
    });
  }

  /* ---- 3. Play everything on scroll into view ----------- */
  // A masked element is clipped to zero height, and Chromium reports zero
  // intersection area for an element clipped by its own clip-path. Observing
  // it directly deadlocks: it never intersects, so it never unclips. So the
  // masked element is watched through an unclipped proxy, its parent.
  var marks = new Map();                       // observed element -> [targets]

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      (marks.get(entry.target) || []).forEach(function (t) { t.classList.add('m-in'); });
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });

  function watch(el, proxy) {
    var key = proxy || el;
    if (!marks.has(key)) { marks.set(key, []); io.observe(key); }
    marks.get(key).push(el);
  }

  if (MOTION.textReveal) {
    document.querySelectorAll('[data-split]').forEach(function (el) { watch(el); });
  }
  if (MOTION.imageReveal) {
    var hs=document.querySelector('.hero-scatter'); if(hs) watch(hs, hs.parentElement||hs);
    document.querySelectorAll('[data-mask]').forEach(function (el) {
      watch(el, el.parentElement || el);
    });
  }

  /* ---- 4. Parallax on large editorial images ------------ */
  // Only on images with no hover state of their own, so nothing
  // fights over the transform property.
  if (MOTION.parallax && canHover) {
    var items = [].slice.call(document.querySelectorAll('[data-parallax] img'));
    if (items.length) {
      var ticking = false;
      var apply = function () {
        var vh = window.innerHeight;
        items.forEach(function (img) {
          var r = img.parentElement.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          var progress = (r.top + r.height / 2 - vh / 2) / vh;   // -1 .. 1
          img.style.transform = 'translate3d(0,' + (progress * -26).toFixed(1) + 'px,0) scale(1.12)';
        });
        ticking = false;
      };
      var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(apply); } };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      apply();
    }
  }

  /* ---- 6. Cut to dark between pages ----------------------
     Opacity on a promoted layer and nothing else, so the fade stays on the
     compositor. The earlier version blurred the whole viewport through a
     backdrop-filter, which is what made it stutter.

     The gap that actually reads as lag is between the screen going black and
     the next page painting, so internal links are prefetched on hover and the
     black is only held for as long as the fade needs. */
  if (MOTION.pageCut) {
    var cut = document.createElement('div');
    cut.className = 'page-cut';
    cut.innerHTML = '<span class="page-cut__n" aria-hidden="true">N</span>';
    document.body.appendChild(cut);

    var LEAVE = 380;                          // fade out, then go
    var primed = {};
    var prime = function (href) {             // warm the next page on hover
      if (primed[href]) return;
      primed[href] = 1;
      var l = document.createElement('link');
      l.rel = 'prefetch'; l.href = href; l.as = 'document';
      document.head.appendChild(l);
    };

    var pageHref = function (a) {
      if (!a || a.hasAttribute('download')) return null;
      if (a.target && a.target !== '_self') return null;
      var url;
      try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return null; }
      if (url.origin !== location.origin) return null;              // offsite
      if (url.pathname === location.pathname) return null;          // anchor or self
      if (!/(^\/$|\.html?$|\/$)/.test(url.pathname)) return null;   // pdf, image, asset
      return url.href;
    };

    document.addEventListener('mouseover', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      var href = pageHref(a);
      if (href) prime(href);
    }, { passive: true });

    var leaving = false;
    document.addEventListener('click', function (e) {
      if (leaving || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var href = pageHref(e.target.closest ? e.target.closest('a[href]') : null);
      if (!href) return;

      e.preventDefault();
      leaving = true;
      // Lenis keeps running its rAF through the fade and competes for frames.
      if (window.__lenis && window.__lenis.stop) window.__lenis.stop();
      document.documentElement.classList.add('is-leaving');
      setTimeout(function () { location.href = href; }, LEAVE);
    });

    // Coming back through history can restore a page mid-fade.
    window.addEventListener('pageshow', function (ev) {
      if (ev.persisted) {
        leaving = false;
        document.documentElement.classList.remove('is-leaving');
        if (window.__lenis && window.__lenis.start) window.__lenis.start();
      }
    });
  }

  /* ---- 5. Magnetic buttons ------------------------------ */
  if (MOTION.magnetic && canHover) {
    document.querySelectorAll('.btn, .filter, .view-btn').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.22;
        var y = (e.clientY - r.top - r.height / 2) * 0.32;
        el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }
})();
