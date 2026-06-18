/* =========================================================
   YOURSGIFTS — "The Print Bed"
   Live CSS-3D landing engine. No dependencies, no WebGL.
   Builds a layered keychain in real 3D space, prints it
   layer-by-layer on load, then responds to cursor + scroll.
   Fully gated behind prefers-reduced-motion.
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var keychain = document.getElementById('keychain');
  var kcRig    = document.getElementById('kcRig');
  var scene    = document.getElementById('scene');
  var stage    = document.getElementById('stage');
  var printHead= document.getElementById('printHead');
  var layerTick= document.getElementById('layerTick');
  var heroHint = document.getElementById('heroHint');

  if (!keychain) return;

  var LAYERS = parseInt(keychain.getAttribute('data-layers'), 10) || 26;
  var LAYER_H = 4;            // px of translateZ per layer (depth)
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };

  /* ---------- 1. BUILD: stack N extruded layers ---------- */
  // Each .kc-layer is a flat keychain silhouette pushed back in Z.
  // Stacked, they read as one solid extruded object that shows its
  // sides when the rig rotates.
  var frag = document.createDocumentFragment();
  for (var i = 0; i < LAYERS; i++) {
    var layer = document.createElement('div');
    layer.className = 'kc-layer';
    layer.style.transform = 'translateZ(' + (i * LAYER_H) + 'px)';
    // top + bottom layers are the visible "faces"; tint mids slightly
    // darker so the extrusion reads with depth.
    var t = i / (LAYERS - 1);
    layer.style.setProperty('--depth', t.toFixed(3));
    if (i === LAYERS - 1) layer.classList.add('kc-face-top');
    frag.appendChild(layer);
  }
  keychain.appendChild(frag);
  var layerEls = keychain.querySelectorAll('.kc-layer');

  /* ---------- 2. PRINT: reveal layers bottom→top ---------- */
  function instantShow() {
    for (var i = 0; i < layerEls.length; i++) layerEls[i].classList.add('printed');
    if (layerTick) layerTick.textContent = pad(LAYERS);
    if (printHead) printHead.style.display = 'none';
    keychain.classList.add('built');
  }

  function printSequence() {
    var i = 0;
    var stepMs = 70;
    (function step() {
      if (i >= layerEls.length) {
        if (printHead) printHead.classList.add('done');
        keychain.classList.add('built');
        return;
      }
      layerEls[i].classList.add('printed');
      if (layerTick) layerTick.textContent = pad(i + 1);
      // move the nozzle line up with the current layer height
      if (printHead) {
        printHead.style.bottom = (i * LAYER_H) + 'px';
      }
      i++;
      setTimeout(step, stepMs);
    })();
  }

  if (reduceMotion) {
    instantShow();
  } else {
    // small delay so fonts/layout settle, then print
    setTimeout(printSequence, 350);
  }

  /* ---------- 3. INTERACT: cursor tilt + scroll rotate ---------- */
  if (!reduceMotion) {
    var targetRX = -18, targetRY = -22;   // resting pose
    var curRX = -55, curRY = 0;            // start laid-flatter, eases in
    var spin = 0;                          // continuous idle spin
    var pointerRX = 0, pointerRY = 0;      // cursor contribution
    var scrollRX = 0;

    // pointer parallax (desktop)
    window.addEventListener('pointermove', function (e) {
      var cx = window.innerWidth / 2;
      var cy = window.innerHeight / 2;
      pointerRY = ((e.clientX - cx) / cx) * 16;   // left/right
      pointerRX = ((e.clientY - cy) / cy) * -10;  // up/down
      if (heroHint) heroHint.style.opacity = '0';
    }, { passive: true });

    // device tilt (mobile) — best-effort, no permission nag
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma == null) return;
      pointerRY = Math.max(-20, Math.min(20, e.gamma));
      pointerRX = Math.max(-14, Math.min(14, (e.beta || 0) - 45)) * -0.4;
    }, { passive: true });

    // scroll rotates the piece as it leaves the stage
    window.addEventListener('scroll', function () {
      var h = stage ? stage.offsetHeight : window.innerHeight;
      var p = Math.min(1, Math.max(0, window.scrollY / h));
      scrollRX = p * 40;
      if (kcRig) kcRig.style.opacity = String(1 - p * 0.85);
    }, { passive: true });

    // idle auto-spin + eased follow — one rAF loop
    var raf = function (fn) {
      return (window.requestAnimationFrame || function (cb) { return setTimeout(cb, 16); })(fn);
    };
    (function loop() {
      spin += 0.18;
      var wantRY = targetRY + pointerRY + Math.sin(spin * 0.02) * 14;
      var wantRX = targetRX + pointerRX + scrollRX;
      // critically-damped-ish easing
      curRY += (wantRY - curRY) * 0.06;
      curRX += (wantRX - curRX) * 0.06;
      if (kcRig) {
        kcRig.style.transform =
          'rotateX(' + curRX.toFixed(2) + 'deg) rotateY(' + curRY.toFixed(2) + 'deg)';
      }
      raf(loop);
    })();
  } else {
    // static, readable pose
    if (kcRig) kcRig.style.transform = 'rotateX(-20deg) rotateY(-24deg)';
  }

  /* ---------- 4. Card tilt micro-interaction ---------- */
  if (!reduceMotion) {
    var tiltCards = document.querySelectorAll('[data-tilt]');
    tiltCards.forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          'perspective(700px) rotateY(' + (px * 10).toFixed(2) + 'deg) rotateX(' +
          (-py * 10).toFixed(2) + 'deg) translateZ(8px)';
      });
      card.addEventListener('pointerleave', function () {
        card.style.transform = '';
      });
    });
  }
})();
