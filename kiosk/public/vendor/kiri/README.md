# Kiri:Moto browser slicer assets

These files are self-hosted so customer STL data remains in the browser and is
not sent to a third-party slicing service.

- Project: GridSpace/Kiri:Moto
- Version: 4.7.0
- Upstream source commit inspected for this integration:
  `d138275bbe9d4e4030d8cb8b2dcf66607da9295a`
- Runtime files: `engine.js`, `worker.js`, `minion.js`
- Optional geometry runtime: `/wasm/manifold.wasm` and the worker-relative
  `/vendor/wasm/manifold.wasm`
- License: MIT; see `LICENSE.md`
- Manifold dependency license: Apache-2.0; see `MANIFOLD-LICENSE.txt`

The assets are loaded lazily only when the local Classic Keychain pricing
benchmark is explicitly started.
