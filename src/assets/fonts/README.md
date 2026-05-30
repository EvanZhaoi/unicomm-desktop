# Bundled Fonts

The desktop app bundles the common UI weights used by the Chinese and Japanese interfaces.

| Font | Weight | File |
| --- | --- | --- |
| Alibaba PuHuiTi 3.0 | 400 Regular | `AlibabaPuHuiTi-3-55-Regular.woff2` |
| Alibaba PuHuiTi 3.0 | 500 Medium | `AlibabaPuHuiTi-3-65-Medium.woff2` |
| Alibaba PuHuiTi 3.0 | 700 Bold | `AlibabaPuHuiTi-3-85-Bold.woff2` |
| Alibaba Sans JP | 400 Regular | `AlibabaSansJP-Regular.woff2` |
| Alibaba Sans JP | 500 Medium | `AlibabaSansJP-Medium.woff2` |
| Alibaba Sans JP | 700 Bold | `AlibabaSansJP-Bold.woff2` |

Source: official Alibaba Fonts CDN under `https://fonts.alibabadesign.com/`.

Usage:

- `src/styles/globals.css` defines `@font-face` rules for these files.
- `zh-CN` uses `Alibaba PuHuiTi 3.0` first.
- `ja-JP` uses `Alibaba Sans JP` first, then falls back to `Alibaba PuHuiTi 3.0` and system Japanese fonts.
