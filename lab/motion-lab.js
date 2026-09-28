/* Motion lab - techniques built from scratch, no libraries beyond the
   Lenis the site already ships. Nothing here is lifted; each is the
   standard technique written against this site's own markup. */
(function () {
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- A. Character-level reveal --------------------------------
     The site already rises headings word by word. Splitting to
     characters and staggering inside the word reads finer. */
  function splitChars(el) {
    var txt = el.textContent, out = '';
    for (var i = 0; i < txt.length; i++) {
      var c = txt[i];
      if (c === ' ') { out += ' '; continue; }
      out += '<span class="ch"><i style="--d:' + (i * 18) + 'ms">' + c + '</i></span>';
    }
    el.innerHTML = out;
  }
  document.querySelectorAll('[data-chars]').forEach(function (el) {
    splitChars(el);
    if (reduced) { el.classList.add('in'); return; }
    new IntersectionObserver(function (es, o) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); o.unobserve(e.target); } });
    }, { threshold: .2 }).observe(el);
  });

  /* ---- B. Scroll-velocity skew ----------------------------------
     Content leans into the direction of travel and settles. This is
     what makes weighted scrolling feel physical rather than just slow. */
  if (!reduced) {
    var last = 0, vel = 0, skewEls = document.querySelectorAll('[data-skew]');
    (function loop() {
      var y = window.scrollY;
      var d = y - last; last = y;
      vel += (d - vel) * 0.14;
      var s = Math.max(-7, Math.min(7, vel * 0.32));
      skewEls.forEach(function (el) {
        el.style.transform = 'skewY(' + s.toFixed(2) + 'deg) scaleY(' + (1 - Math.abs(s) * 0.004).toFixed(4) + ')';
      });
      requestAnimationFrame(loop);
    })();
  }

  /* ---- C. Custom cursor ------------------------------------------
     A dot that lags the pointer, swells over anything interactive and
     turns into a word over media. Pointer-fine only: on a phone there
     is no cursor to replace. */
  if (!reduced && matchMedia('(pointer:fine)').matches) {
    var cur = document.createElement('div');
    cur.className = 'cur'; cur.innerHTML = '<span></span>';
    document.body.appendChild(cur);
    var cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function ring() {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) translate(-50%,-50%)';
      requestAnimationFrame(ring);
    })();
    document.querySelectorAll('a,button,[data-cursor]').forEach(function (el) {
      var label = el.getAttribute('data-cursor') || '';
      el.addEventListener('pointerenter', function () {
        cur.classList.add('on'); cur.classList.toggle('lbl', !!label);
        cur.firstChild.textContent = label;
      });
      el.addEventListener('pointerleave', function () {
        cur.classList.remove('on', 'lbl'); cur.firstChild.textContent = '';
      });
    });
  }
})();

/* ---- D. WebGL hover displacement --------------------------------
   The effect the reference site is known for, written against raw
   WebGL rather than pulling in a 150KB scene library for one quad.
   The image is drawn to a single full-quad shader; the cursor warps
   the sample coordinates and splits the channels slightly as it
   passes. Falls back to the plain <img> wherever WebGL is missing. */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var VERT = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  var FRAG = [
    'precision mediump float;varying vec2 v;uniform sampler2D t;',
    'uniform vec2 m;uniform float h;uniform float a;',
    'void main(){',
    ' vec2 uv=v;',
    ' float d=distance(uv,m);',
    ' float f=h*exp(-d*3.2);',                         // bulge falls off from the cursor
    ' vec2 dir=normalize(uv-m+1e-5);',
    ' uv-=dir*f*0.055;',                               // pull pixels toward the cursor
    ' uv.y+=sin(uv.x*9.0+a)*f*0.012;',                 // slow travelling ripple
    ' float s=f*0.012;',                               // channel split scales with the bulge
    ' vec4 c;',
    ' c.r=texture2D(t,uv+vec2(s,0.)).r;',
    ' c.g=texture2D(t,uv).g;',
    ' c.b=texture2D(t,uv-vec2(s,0.)).b;',
    ' c.a=1.0;',
    ' gl_FragColor=c;}'
  ].join('');

  function sh(gl, type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }

  var POOL = [], MAX = 8;
  document.querySelectorAll('[data-gl]').forEach(function (wrap) {
    var img = wrap.querySelector('img'); if (!img) return;
    var run = function () {
      var cv = document.createElement('canvas');
      cv.className = 'glc';
      var gl = cv.getContext('webgl', { antialias: false, alpha: false });
      if (!gl) return;                                  // keep the plain img
      var vs = sh(gl, gl.VERTEX_SHADER, VERT), fs = sh(gl, gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) return;
      var pr = gl.createProgram();
      gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
      gl.useProgram(pr);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, 'p');
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      var uM = gl.getUniformLocation(pr, 'm'), uH = gl.getUniformLocation(pr, 'h'),
          uA = gl.getUniformLocation(pr, 'a');
      wrap.appendChild(cv); wrap.classList.add('gl-on');
      POOL.push({ wrap: wrap, cv: cv, gl: gl });
      while (POOL.length > MAX) {
        var old = POOL.shift();
        if (old.wrap === wrap) { POOL.push(old); break; }
        old.wrap.classList.remove('gl-on');
        old.cv.remove();
        var lose = old.gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      }

      var mx = .5, my = .5, want = 0, hov = 0, t0 = performance.now(), live = false;
      function size() {
        var r = wrap.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
        cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
        gl.viewport(0, 0, cv.width, cv.height);
      }
      size(); addEventListener('resize', size, { passive: true });
      wrap.addEventListener('pointermove', function (e) {
        var r = wrap.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width; my = (e.clientY - r.top) / r.height;
      }, { passive: true });
      wrap.addEventListener('pointerenter', function () { want = 1; });
      wrap.addEventListener('pointerleave', function () { want = 0; });
      // only burn frames while the tile is on screen
      new IntersectionObserver(function (es) { live = es[0].isIntersecting; })
        .observe(wrap);
      function paint() {
        gl.uniform2f(uM, mx, my);
        gl.uniform1f(uH, hov);
        gl.uniform1f(uA, (performance.now() - t0) / 420);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      // Paint the undistorted frame straight away. The canvas covers the
      // img from this point, so skipping this leaves the tile blank until
      // the pointer first touches it.
      paint();
      (function draw() {
        requestAnimationFrame(draw);
        if (!live) return;
        var prev = hov;
        hov += (want - hov) * 0.09;
        // at rest the canvas already holds the right pixels, so stop
        if (want === 0 && hov < 0.002 && Math.abs(hov - prev) < 0.0005) return;
        paint();
      })();
    };
    // Lazy: a tile gets a GL context the first time it is hovered, and the
    // pool evicts the least recently used one. Browsers cap live contexts
    // near 16 and silently drop the oldest, which would blank tiles on a
    // gallery page carrying twenty-four of them.
    var started = false;
    wrap.addEventListener('pointerenter', function () {
      if (started) return;
      started = true;
      if (img.complete && img.naturalWidth) run(); else img.addEventListener('load', run, { once: true });
    }, { once: false });
  });
})();
