# Open-source acknowledgements and third-party notices

Original SpikeSim code is GPL-3.0-only. Third-party components retain their own
licenses and copyright notices. This inventory records installed production npm
dependencies from package-lock.json; it is not a blanket license for artwork.
Regenerate it with `npm run licenses:collect` after changing dependencies.

## Main foundations

- **Gears** — Cort Wee / A Posteriori and contributors; GPL-3.0. Upstream:
  https://github.com/QuirkyCort/gears, source revision
  `20b8e874ab9c3e08a37dfbcb6b10bbef94f90921`. Preserve its source, individual
  asset notices, LICENSE and SPIKESIM-NOTICE.md with applicable distributions.
- **Blockly** — Google LLC and contributors; Apache-2.0. The student editor uses
  11.2.2; Gears also retains its own bundled Blockly versions and notices.
- **Babylon.js 4.2.1** — Microsoft and contributors; Apache-2.0.
  License: `public/licenses/vendor/Babylon-4.2.1-LICENSE.txt`.
- **Ammo.js / Bullet** — their respective contributors; zlib license.
  License: `public/licenses/vendor/Ammo-LICENSE.txt`.
- **Skulpt 0.11.0** — Skulpt contributors; MIT and its retained license exceptions.
  License: `public/licenses/vendor/Skulpt-0.11.0-LICENSE.txt`.
- **Electron 45.0.0** — OpenJS Foundation and contributors; MIT.
  `public/licenses/electron/` includes its license and Chromium's bundled notices.
- **React, React DOM, Zod** — MIT; **Rapier** — Apache-2.0;
  **Lucide** — ISC, including retained Feather notices. Full texts appear below.
- **Lexend, Atkinson Hyperlegible, JetBrains Mono** — SIL OFL-1.1, with their
  individual copyright notices included below and alongside the brand assets.

Gears also includes Ace, jQuery, JSZip, pointer-event support and asset collections
from Kenney, Quaternius, KayKit, Creazilla and other credited creators. Their local
headers and individual license files remain authoritative for those files.
Code licenses do not establish permission for all FLL/WRO artwork or trademarks.
Unresolved artwork must be omitted or cleared before a public distribution.

The development toolchain includes TypeScript, Vite, esbuild, electron-builder,
ESLint, Vitest and Playwright. Thank you to their maintainers and contributors.

## Production npm dependencies

Versions below describe the current Windows dependency graph, including runtime
transitive dependencies. Some modules are bundled at build time; preserving all
of their notices avoids omitting the notices of a bundled dependency.

| Component | Version | Declared license | Full notice files |
| --- | --- | --- | --- |
| @asamuzakjp/css-color | 3.2.0 | MIT | [LICENSE](public/licenses/npm/_asamuzakjp_css-color_3.2.0/LICENSE) |
| @csstools/color-helpers | 5.1.0 | MIT-0 | [LICENSE.md](public/licenses/npm/_csstools_color-helpers_5.1.0/LICENSE.md) |
| @csstools/css-calc | 2.1.4 | MIT | [LICENSE.md](public/licenses/npm/_csstools_css-calc_2.1.4/LICENSE.md) |
| @csstools/css-color-parser | 3.1.0 | MIT | [LICENSE.md](public/licenses/npm/_csstools_css-color-parser_3.1.0/LICENSE.md) |
| @csstools/css-parser-algorithms | 3.0.5 | MIT | [LICENSE.md](public/licenses/npm/_csstools_css-parser-algorithms_3.0.5/LICENSE.md) |
| @csstools/css-tokenizer | 3.0.4 | MIT | [LICENSE.md](public/licenses/npm/_csstools_css-tokenizer_3.0.4/LICENSE.md) |
| @dimforge/rapier2d-deterministic-compat | 0.21.0 | Apache-2.0 | [LICENSE](public/licenses/npm/_dimforge_rapier2d-deterministic-compat_0.21.0/LICENSE) |
| @fontsource/atkinson-hyperlegible | 5.3.0 | OFL-1.1 | [LICENSE](public/licenses/npm/_fontsource_atkinson-hyperlegible_5.3.0/LICENSE) |
| @fontsource/jetbrains-mono | 5.3.0 | OFL-1.1 | [LICENSE](public/licenses/npm/_fontsource_jetbrains-mono_5.3.0/LICENSE) |
| @fontsource/lexend | 5.3.0 | OFL-1.1 | [LICENSE](public/licenses/npm/_fontsource_lexend_5.3.0/LICENSE) |
| @types/react | 19.3.0 | MIT | [LICENSE](public/licenses/npm/_types_react_19.3.0/LICENSE) |
| agent-base | 7.1.4 | MIT | [LICENSE](public/licenses/npm/agent-base_7.1.4/LICENSE) |
| asynckit | 0.4.0 | MIT | [LICENSE](public/licenses/npm/asynckit_0.4.0/LICENSE) |
| blockly | 11.2.2 | Apache-2.0 | [Apache-2.0.txt](public/licenses/npm/blockly_11.2.2/Apache-2.0.txt), [Blockly-NOTICE.txt](public/licenses/npm/blockly_11.2.2/Blockly-NOTICE.txt) |
| call-bind-apply-helpers | 1.0.2 | MIT | [LICENSE](public/licenses/npm/call-bind-apply-helpers_1.0.2/LICENSE) |
| combined-stream | 1.0.8 | MIT | [License](public/licenses/npm/combined-stream_1.0.8/License) |
| cssstyle | 4.6.0 | MIT | [LICENSE](public/licenses/npm/cssstyle_4.6.0/LICENSE) |
| csstype | 3.2.3 | MIT | [LICENSE](public/licenses/npm/csstype_3.2.3/LICENSE) |
| data-urls | 5.0.0 | MIT | [LICENSE.txt](public/licenses/npm/data-urls_5.0.0/LICENSE.txt) |
| debug | 4.4.3 | MIT | [LICENSE](public/licenses/npm/debug_4.4.3/LICENSE) |
| decimal.js | 10.6.0 | MIT | [LICENCE.md](public/licenses/npm/decimal.js_10.6.0/LICENCE.md) |
| delayed-stream | 1.0.0 | MIT | [License](public/licenses/npm/delayed-stream_1.0.0/License) |
| dunder-proto | 1.0.1 | MIT | [LICENSE](public/licenses/npm/dunder-proto_1.0.1/LICENSE) |
| entities | 6.0.1 | BSD-2-Clause | [LICENSE](public/licenses/npm/entities_6.0.1/LICENSE) |
| es-define-property | 1.0.1 | MIT | [LICENSE](public/licenses/npm/es-define-property_1.0.1/LICENSE) |
| es-errors | 1.3.0 | MIT | [LICENSE](public/licenses/npm/es-errors_1.3.0/LICENSE) |
| es-object-atoms | 1.1.2 | MIT | [LICENSE](public/licenses/npm/es-object-atoms_1.1.2/LICENSE) |
| es-set-tostringtag | 2.1.0 | MIT | [LICENSE](public/licenses/npm/es-set-tostringtag_2.1.0/LICENSE) |
| form-data | 4.0.6 | MIT | [License](public/licenses/npm/form-data_4.0.6/License) |
| function-bind | 1.1.2 | MIT | [LICENSE](public/licenses/npm/function-bind_1.1.2/LICENSE) |
| get-intrinsic | 1.3.0 | MIT | [LICENSE](public/licenses/npm/get-intrinsic_1.3.0/LICENSE) |
| get-proto | 1.0.1 | MIT | [LICENSE](public/licenses/npm/get-proto_1.0.1/LICENSE) |
| gopd | 1.2.0 | MIT | [LICENSE](public/licenses/npm/gopd_1.2.0/LICENSE) |
| has-symbols | 1.1.0 | MIT | [LICENSE](public/licenses/npm/has-symbols_1.1.0/LICENSE) |
| has-tostringtag | 1.0.2 | MIT | [LICENSE](public/licenses/npm/has-tostringtag_1.0.2/LICENSE) |
| hasown | 2.0.4 | MIT | [LICENSE](public/licenses/npm/hasown_2.0.4/LICENSE) |
| html-encoding-sniffer | 4.0.0 | MIT | [LICENSE.txt](public/licenses/npm/html-encoding-sniffer_4.0.0/LICENSE.txt) |
| http-proxy-agent | 7.0.2 | MIT | [LICENSE](public/licenses/npm/http-proxy-agent_7.0.2/LICENSE) |
| https-proxy-agent | 7.0.6 | MIT | [LICENSE](public/licenses/npm/https-proxy-agent_7.0.6/LICENSE) |
| iconv-lite | 0.6.3 | MIT | [LICENSE](public/licenses/npm/iconv-lite_0.6.3/LICENSE) |
| is-potential-custom-element-name | 1.0.1 | MIT | [LICENSE-MIT.txt](public/licenses/npm/is-potential-custom-element-name_1.0.1/LICENSE-MIT.txt) |
| jsdom | 25.0.1 | MIT | [LICENSE.txt](public/licenses/npm/jsdom_25.0.1/LICENSE.txt) |
| lru-cache | 10.4.3 | ISC | [LICENSE](public/licenses/npm/lru-cache_10.4.3/LICENSE) |
| lucide-react | 1.61.0 | ISC | [LICENSE](public/licenses/npm/lucide-react_1.61.0/LICENSE) |
| math-intrinsics | 1.1.0 | MIT | [LICENSE](public/licenses/npm/math-intrinsics_1.1.0/LICENSE) |
| mime-db | 1.52.0 | MIT | [LICENSE](public/licenses/npm/mime-db_1.52.0/LICENSE) |
| mime-types | 2.1.35 | MIT | [LICENSE](public/licenses/npm/mime-types_2.1.35/LICENSE) |
| ms | 2.1.3 | MIT | [license.md](public/licenses/npm/ms_2.1.3/license.md) |
| nwsapi | 2.2.28 | MIT | [LICENSE](public/licenses/npm/nwsapi_2.2.28/LICENSE) |
| parse5 | 7.3.0 | MIT | [LICENSE](public/licenses/npm/parse5_7.3.0/LICENSE) |
| punycode | 2.3.1 | MIT | [LICENSE-MIT.txt](public/licenses/npm/punycode_2.3.1/LICENSE-MIT.txt) |
| react | 19.3.1 | MIT | [LICENSE](public/licenses/npm/react_19.3.1/LICENSE) |
| react-dom | 19.3.1 | MIT | [LICENSE](public/licenses/npm/react-dom_19.3.1/LICENSE) |
| rrweb-cssom | 0.7.1 | MIT | [LICENSE.txt](public/licenses/npm/rrweb-cssom_0.7.1/LICENSE.txt) |
| rrweb-cssom | 0.8.0 | MIT | [LICENSE.txt](public/licenses/npm/rrweb-cssom_0.8.0/LICENSE.txt) |
| safer-buffer | 2.1.2 | MIT | [LICENSE](public/licenses/npm/safer-buffer_2.1.2/LICENSE) |
| saxes | 6.0.0 | ISC | [LICENSE](public/licenses/npm/saxes_6.0.0/LICENSE) |
| scheduler | 0.28.0 | MIT | [LICENSE](public/licenses/npm/scheduler_0.28.0/LICENSE) |
| symbol-tree | 3.2.4 | MIT | [LICENSE](public/licenses/npm/symbol-tree_3.2.4/LICENSE) |
| tldts | 6.1.86 | MIT | [LICENSE](public/licenses/npm/tldts_6.1.86/LICENSE) |
| tldts-core | 6.1.86 | MIT | [LICENSE](public/licenses/npm/tldts-core_6.1.86/LICENSE) |
| tough-cookie | 5.1.2 | BSD-3-Clause | [LICENSE](public/licenses/npm/tough-cookie_5.1.2/LICENSE) |
| tr46 | 5.1.1 | MIT | [LICENSE.md](public/licenses/npm/tr46_5.1.1/LICENSE.md) |
| w3c-xmlserializer | 5.0.0 | MIT | [LICENSE.md](public/licenses/npm/w3c-xmlserializer_5.0.0/LICENSE.md) |
| webidl-conversions | 7.0.0 | BSD-2-Clause | [LICENSE.md](public/licenses/npm/webidl-conversions_7.0.0/LICENSE.md) |
| whatwg-encoding | 3.1.1 | MIT | [LICENSE.txt](public/licenses/npm/whatwg-encoding_3.1.1/LICENSE.txt) |
| whatwg-mimetype | 4.0.0 | MIT | [LICENSE.txt](public/licenses/npm/whatwg-mimetype_4.0.0/LICENSE.txt) |
| whatwg-url | 14.2.0 | MIT | [LICENSE.txt](public/licenses/npm/whatwg-url_14.2.0/LICENSE.txt) |
| ws | 8.22.0 | MIT | [LICENSE](public/licenses/npm/ws_8.22.0/LICENSE) |
| xml-name-validator | 5.0.0 | Apache-2.0 | [LICENSE.txt](public/licenses/npm/xml-name-validator_5.0.0/LICENSE.txt) |
| xmlchars | 2.2.0 | MIT | [LICENSE](public/licenses/npm/xmlchars_2.2.0/LICENSE) |
| zod | 4.6.7 | MIT | [LICENSE](public/licenses/npm/zod_4.6.7/LICENSE) |
