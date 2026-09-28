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
    velocitySkew: true,   // the page leans into the direction of scroll
    cursor:       true,   // a dot that lags the pointer and swells on links
    heroShader:   true,   // the hero reel warps under the cursor
    speed:        1.15    // 1 = as tuned. 1.4 = slower, 0.7 = snappier
  };

  /* A switch for judging feel, because feel cannot be measured from here.
       ?motion=noscroll   native scrolling, everything else intact
       ?motion=off        no motion layer at all
       ?motion=on         back to normal
     The choice is remembered, otherwise you would have to re-add the
     parameter on every page and a transition is the thing being judged. */
  try {
    var _q = new URLSearchParams(location.search).get('motion');
    if (_q) localStorage.setItem('nz-motion', _q);
    var _pick = _q || localStorage.getItem('nz-motion');
    if (_pick === 'on') { localStorage.removeItem('nz-motion'); }
    else if (_pick === 'off') {
      Object.keys(MOTION).forEach(function (k) {
        if (typeof MOTION[k] === 'boolean') MOTION[k] = false;
      });
    } else if (_pick === 'noscroll') { MOTION.smoothScroll = false; }
  } catch (e) {}

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
      // Deliberately NOT multiplied by MOTION.speed. How cinematic the
      // reveals are and how responsive the wheel feels are different
      // questions, and tying them together pushed this to 1.1s, which is
      // past the 1.2 default and reads as judder on every page you land on.
      duration: 0.7,
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
    var LEAVE = 200;                          // fade out, then go
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
  /* ---- 7. Velocity skew ---------------------------------
     The page leans into the direction of travel and settles when you
     stop. It goes on <main>, never on <body>: a transform makes the
     element a containing block, which would strand the fixed header,
     the flying preview and the page-cut overlay. */
  if (MOTION.velocitySkew) {
    var mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.style.willChange = 'transform';
      mainEl.style.transformOrigin = '50% 0';
      var lastY = window.scrollY, svel = 0, running = false;
      function lean() {
        var y = window.scrollY, d = y - lastY; lastY = y;
        svel += (d - svel) * 0.14;
        if (Math.abs(svel) < 0.01) svel = 0;
        var deg = Math.max(-6, Math.min(6, svel * 0.26));
        mainEl.style.transform = deg ? 'skewY(' + deg.toFixed(2) + 'deg)' : '';
        // Settle, then stop asking for frames. A page that is not being
        // scrolled should not hold the main thread awake for a transform
        // that is already none — it costs battery for nothing.
        if (svel === 0 && d === 0) { running = false; return; }
        requestAnimationFrame(lean);
      }
      window.addEventListener('scroll', function () {
        if (!running) { running = true; requestAnimationFrame(lean); }
      }, { passive: true });
    }
  }

  /* ---- 8. Cursor ----------------------------------------
     A dot that trails the pointer, swells over anything clickable and
     names itself over media. The pointer velocity it tracks is read by
     the hero shader below, so this runs whenever hover is available. */
  var pv = { x: 0, y: 0, speed: 0 }, cxp = 0, cyp = 0;
  if (canHover) {
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    dot.innerHTML = '<span></span>';
    if (MOTION.cursor) document.body.appendChild(dot);
    cxp = window.innerWidth / 2; cyp = window.innerHeight / 2;
    var txp = cxp, typ = cyp, pxp = cxp, pyp = cyp;
    window.addEventListener('pointermove', function (e) {
      txp = e.clientX; typ = e.clientY;
    }, { passive: true });
    (function ring() {
      requestAnimationFrame(ring);
      cxp += (txp - cxp) * 0.18; cyp += (typ - cyp) * 0.18;
      pv.x = txp - pxp; pv.y = typ - pyp;
      pv.speed += (Math.min(1, Math.sqrt(pv.x * pv.x + pv.y * pv.y) / 34) - pv.speed) * 0.12;
      pxp = txp; pyp = typ;
      if (MOTION.cursor) {
        dot.style.transform = 'translate3d(' + cxp.toFixed(1) + 'px,' +
          cyp.toFixed(1) + 'px,0) translate(-50%,-50%)';
      }
    })();
    if (MOTION.cursor) {
      document.querySelectorAll('a,button,[data-cursor]').forEach(function (el) {
        var label = el.getAttribute('data-cursor') || '';
        el.addEventListener('pointerenter', function () {
          dot.classList.add('on');
          dot.classList.toggle('lbl', !!label);
          dot.firstChild.textContent = label;
        });
        el.addEventListener('pointerleave', function () {
          dot.classList.remove('on', 'lbl');
          dot.firstChild.textContent = '';
        });
      });
    }
  }

  /* ---- 9. Hero reel shader ------------------------------
     The one WebGL moment on the site, and deliberately on the reel
     rather than on any project image: the reel is a teaser, so warping
     it costs the work nothing. Raw WebGL, one quad, one context. */
  if (MOTION.heroShader && canHover) (function () {
    var wrap = document.querySelector('[data-gl-hero]');
    if (!wrap) return;
    var vid = wrap.querySelector('video');
    if (!vid) return;
    var cv = document.createElement('canvas');
    cv.className = 'hero-gl';
    var gl = cv.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;
    function sh(t, src) {
      var o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o);
      return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null;
    }
    var vsh = sh(gl.VERTEX_SHADER,
      'attribute vec2 p;varying vec2 v;' +
      'void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}');
    var fsh = sh(gl.FRAGMENT_SHADER, [
      'precision mediump float;varying vec2 v;uniform sampler2D t;',
      'uniform vec2 m;uniform vec2 vel;uniform float sp;uniform float a;',
      'void main(){',
      ' vec2 uv=v;',
      ' float d=distance(uv,m);',
      ' float f=exp(-d*3.4);',
      ' uv+=vel*f*0.10;',
      ' uv.y+=sin(uv.x*11.0-a*2.2)*f*sp*0.020;',
      ' uv.x+=cos(uv.y*9.0-a*1.7)*f*sp*0.014;',
      ' float s=f*sp*0.010;',
      ' vec4 c;',
      ' c.r=texture2D(t,uv+vec2(s,0.)).r;',
      ' c.g=texture2D(t,uv).g;',
      ' c.b=texture2D(t,uv-vec2(s,0.)).b;',
      ' c.a=1.0;gl_FragColor=c;}'
    ].join(''));
    if (!vsh || !fsh) return;
    var pr = gl.createProgram();
    gl.attachShader(pr, vsh); gl.attachShader(pr, fsh); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    var bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    var lp = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    var uM = gl.getUniformLocation(pr, 'm'), uV = gl.getUniformLocation(pr, 'vel'),
        uS = gl.getUniformLocation(pr, 'sp'), uA = gl.getUniformLocation(pr, 'a');
    var ready = false, t0 = performance.now(), live = true;
    function size() {
      var r = wrap.getBoundingClientRect(),
          dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, cv.width, cv.height);
    }
    window.addEventListener('resize', size, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { live = es[0].isIntersecting; }).observe(wrap);
    }
    (function frame() {
      requestAnimationFrame(frame);
      if (!live || vid.readyState < 2) return;
      if (!ready) {
        wrap.appendChild(cv); wrap.classList.add('hero-gl-on'); size(); ready = true;
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, vid);
      var r = wrap.getBoundingClientRect();
      gl.uniform2f(uM,
        Math.max(-0.6, Math.min(1.6, (cxp - r.left) / r.width)),
        Math.max(-0.6, Math.min(1.6, (cyp - r.top) / r.height)));
      gl.uniform2f(uV, Math.max(-1, Math.min(1, pv.x / 90)),
                       Math.max(-1, Math.min(1, pv.y / 90)));
      gl.uniform1f(uS, pv.speed);
      gl.uniform1f(uA, (performance.now() - t0) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    })();
  })();

})();
