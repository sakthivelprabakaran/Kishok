/* =========================================
   YOURSGIFTS — ADMIN PANEL LOGIC
   Controls STL export parameters
   ========================================= */

(function() {
    'use strict';

    // Only run if admin mode is active
    if (!window.location.search.includes('admin=true')) return;

    // ===== DOM REFERENCES =====
    var panel       = document.getElementById('adminPanel');
    var toggleBtn   = document.getElementById('adminToggleBtn');
    var closeBtn    = document.getElementById('adminCloseBtn');
    var exportBtn   = document.getElementById('adminExportSTL');
    var resetBtn    = document.getElementById('adminResetBtn');
    var filenameIn  = document.getElementById('adminFilename');

    // Unhide the gear icon
    if (toggleBtn) toggleBtn.style.display = '';

    // Dimension readout
    var dimWidth    = document.getElementById('dimWidth');
    var dimHeight   = document.getElementById('dimHeight');
    var dimDepth    = document.getElementById('dimDepth');

    // Slider elements (maps to param paths)
    var sliders = {
        scaleFactor:       { el: document.getElementById('adminScaleFactor'),       valEl: document.getElementById('adminScaleVal'),           suffix: '×' },
        baseDepth:         { el: document.getElementById('adminBaseDepth'),         valEl: document.getElementById('adminBaseDepthVal'),       suffix: '' },
        baseBevelThk:      { el: document.getElementById('adminBaseBevelThk'),      valEl: document.getElementById('adminBaseBevelThkVal'),    suffix: '' },
        baseBevelSize:     { el: document.getElementById('adminBaseBevelSize'),     valEl: document.getElementById('adminBaseBevelSizeVal'),   suffix: '' },
        baseBevelSeg:      { el: document.getElementById('adminBaseBevelSeg'),      valEl: document.getElementById('adminBaseBevelSegVal'),    suffix: '' },
        outlineDepth:      { el: document.getElementById('adminOutlineDepth'),      valEl: document.getElementById('adminOutlineDepthVal'),    suffix: '' },
        outlineBevelThk:   { el: document.getElementById('adminOutlineBevelThk'),   valEl: document.getElementById('adminOutlineBevelThkVal'), suffix: '' },
        outlineBevelSize:  { el: document.getElementById('adminOutlineBevelSize'),  valEl: document.getElementById('adminOutlineBevelSizeVal'),suffix: '' },
        fontDepth:         { el: document.getElementById('adminFontDepth'),         valEl: document.getElementById('adminFontDepthVal'),       suffix: '' },
        fontBevelThk:      { el: document.getElementById('adminFontBevelThk'),      valEl: document.getElementById('adminFontBevelThkVal'),    suffix: '' },
        fontBevelSize:     { el: document.getElementById('adminFontBevelSize'),     valEl: document.getElementById('adminFontBevelSizeVal'),   suffix: '' },
        ringOuter:         { el: document.getElementById('adminRingOuter'),         valEl: document.getElementById('adminRingOuterVal'),       suffix: '' },
        ringInner:         { el: document.getElementById('adminRingInner'),         valEl: document.getElementById('adminRingInnerVal'),       suffix: '' },
    };

    // ===== PRESETS =====
    var PRESETS = {
        thin: {
            scaleFactor: 0.7,
            base:    { depth: 2,   bevelThickness: 1,   bevelSize: 3,   bevelSegments: 6 },
            outline: { depth: 0.8, bevelThickness: 0.3, bevelSize: 1,   bevelSegments: 3 },
            font:    { depth: 0.8, bevelThickness: 0.3, bevelSize: 0,   bevelSegments: 3 },
            ring:    { outerRadius: 6,  innerRadius: 2.5, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 4 },
        },
        standard: {
            scaleFactor: 1.0,
            base:    { depth: 4,   bevelThickness: 2,   bevelSize: 4.5, bevelSegments: 8 },
            outline: { depth: 1.5, bevelThickness: 0.5, bevelSize: 1.5, bevelSegments: 3 },
            font:    { depth: 1.5, bevelThickness: 0.5, bevelSize: 0,   bevelSegments: 3 },
            ring:    { outerRadius: 8,  innerRadius: 3.5, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 4 },
        },
        thick: {
            scaleFactor: 1.4,
            base:    { depth: 6,   bevelThickness: 3,   bevelSize: 5.5, bevelSegments: 10 },
            outline: { depth: 2.5, bevelThickness: 0.8, bevelSize: 2,   bevelSegments: 4 },
            font:    { depth: 2,   bevelThickness: 0.6, bevelSize: 0,   bevelSegments: 4 },
            ring:    { outerRadius: 10, innerRadius: 4.5, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 5 },
        },
    };

    // ===== PANEL OPEN/CLOSE =====
    var panelOpen = false;

    function openPanel() {
        panelOpen = true;
        panel.classList.add('open');
        toggleBtn.classList.add('hidden');
    }

    function closePanel() {
        panelOpen = false;
        panel.classList.remove('open');
        toggleBtn.classList.remove('hidden');
    }

    // Toggle button is now a link to admin.html, no click handler needed
    // toggleBtn click navigates to admin.html automatically
    closeBtn.addEventListener('click', closePanel);

    // ===== ACCORDION SECTIONS =====
    document.querySelectorAll('.admin-section-title').forEach(function(title) {
        title.addEventListener('click', function() {
            var section = title.closest('.admin-section');
            if (section.classList.contains('expanded')) {
                section.classList.remove('expanded');
            } else {
                section.classList.add('expanded');
            }
        });
    });

    // ===== COLLECT PARAMS FROM SLIDERS =====
    function collectParams() {
        return {
            scaleFactor: parseFloat(sliders.scaleFactor.el.value),
            base: {
                depth:          parseFloat(sliders.baseDepth.el.value),
                bevelThickness: parseFloat(sliders.baseBevelThk.el.value),
                bevelSize:      parseFloat(sliders.baseBevelSize.el.value),
                bevelSegments:  parseInt(sliders.baseBevelSeg.el.value, 10),
            },
            outline: {
                depth:          parseFloat(sliders.outlineDepth.el.value),
                bevelThickness: parseFloat(sliders.outlineBevelThk.el.value),
                bevelSize:      parseFloat(sliders.outlineBevelSize.el.value),
                bevelSegments:  3,
            },
            font: {
                depth:          parseFloat(sliders.fontDepth.el.value),
                bevelThickness: parseFloat(sliders.fontBevelThk.el.value),
                bevelSize:      parseFloat(sliders.fontBevelSize.el.value),
                bevelSegments:  3,
            },
            ring: {
                outerRadius:    parseFloat(sliders.ringOuter.el.value),
                innerRadius:    parseFloat(sliders.ringInner.el.value),
                bevelThickness: 0.5,
                bevelSize:      0.5,
                bevelSegments:  4,
            },
        };
    }

    // ===== UPDATE SLIDER VALUE LABELS =====
    function updateSliderLabels() {
        for (var key in sliders) {
            var s = sliders[key];
            var val = parseFloat(s.el.value);
            if (key === 'baseBevelSeg') {
                s.valEl.textContent = parseInt(val, 10);
            } else {
                s.valEl.textContent = val.toFixed(1) + s.suffix;
            }
        }
    }

    // ===== SET SLIDERS FROM PARAMS =====
    function setSliders(p) {
        sliders.scaleFactor.el.value   = p.scaleFactor;
        sliders.baseDepth.el.value     = p.base.depth;
        sliders.baseBevelThk.el.value  = p.base.bevelThickness;
        sliders.baseBevelSize.el.value = p.base.bevelSize;
        sliders.baseBevelSeg.el.value  = p.base.bevelSegments;
        sliders.outlineDepth.el.value     = p.outline.depth;
        sliders.outlineBevelThk.el.value  = p.outline.bevelThickness;
        sliders.outlineBevelSize.el.value = p.outline.bevelSize;
        sliders.fontDepth.el.value     = p.font.depth;
        sliders.fontBevelThk.el.value  = p.font.bevelThickness;
        sliders.fontBevelSize.el.value = p.font.bevelSize;
        sliders.ringOuter.el.value     = p.ring.outerRadius;
        sliders.ringInner.el.value     = p.ring.innerRadius;
        updateSliderLabels();
    }

    // ===== UPDATE DIMENSION READOUT =====
    function updateDimensions() {
        // Dispatch a custom event that the module script picks up
        window.dispatchEvent(new CustomEvent('admin-request-dimensions'));
    }

    // Listen for the response from the module script
    window.addEventListener('admin-dimensions-response', function(e) {
        var d = e.detail;
        dimWidth.textContent  = d.width.toFixed(1);
        dimHeight.textContent = d.height.toFixed(1);
        dimDepth.textContent  = d.depth.toFixed(1);
    });

    // ===== DEBOUNCED REBUILD =====
    var _rebuildTimer = null;

    function debouncedRebuild() {
        clearTimeout(_rebuildTimer);
        _rebuildTimer = setTimeout(function() {
            var params = collectParams();
            // Save to localStorage
            try { localStorage.setItem('adminSTLParams', JSON.stringify(params)); } catch(e) {}

            // Dispatch event for the module script to rebuild
            window.dispatchEvent(new CustomEvent('admin-rebuild', { detail: params }));

            // Request updated dimensions after a short delay to let the 3D rebuild finish
            setTimeout(updateDimensions, 200);
        }, 300);
    }

    // ===== WIRE UP ALL SLIDERS =====
    for (var key in sliders) {
        (function(k) {
            sliders[k].el.addEventListener('input', function() {
                updateSliderLabels();
                debouncedRebuild();
            });
        })(key);
    }

    // ===== PRESETS =====
    document.querySelectorAll('.admin-preset-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var preset = PRESETS[btn.dataset.preset];
            if (!preset) return;

            document.querySelectorAll('.admin-preset-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');

            setSliders(preset);
            debouncedRebuild();
        });
    });

    // ===== EXPORT STL =====
    exportBtn.addEventListener('click', function() {
        var filename = (filenameIn.value.trim() || 'keychain_3d_print') + '.stl';
        window.dispatchEvent(new CustomEvent('admin-export-stl', { detail: { filename: filename } }));
    });

    // ===== RESET =====
    resetBtn.addEventListener('click', function() {
        setSliders(PRESETS.standard);
        document.querySelectorAll('.admin-preset-btn').forEach(function(b) {
            b.classList.toggle('active', b.dataset.preset === 'standard');
        });
        debouncedRebuild();
    });

    // ===== RESTORE FROM LOCALSTORAGE =====
    try {
        var saved = JSON.parse(localStorage.getItem('adminSTLParams'));
        if (saved && saved.base && saved.font) {
            setSliders(saved);
        }
    } catch(e) {}

    // ===== SYNC OUTLINE SECTION WITH 2L/3L TOGGLE =====
    var outlineSection = document.getElementById('adminOutlineSection');
    // Check current state on load
    function syncOutlineVisibility() {
        // Read from the main script's state
        var layerToggle = document.getElementById('layerToggle');
        if (!layerToggle) return;
        var activeOpt = layerToggle.querySelector('.layer-opt.active');
        if (activeOpt && activeOpt.dataset.val === '2L') {
            outlineSection.style.display = 'none';
        } else {
            outlineSection.style.display = '';
        }
    }

    // Observe layer toggle clicks
    var layerToggleEl = document.getElementById('layerToggle');
    if (layerToggleEl) {
        layerToggleEl.addEventListener('click', function() {
            setTimeout(syncOutlineVisibility, 50);
        });
    }
    syncOutlineVisibility();

})();
