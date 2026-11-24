# Starter templates

Copy this folder, keep `logo.config.example.json`, and replace the drawings in `symbol.svg`
and `wordmark.svg` with your own. The starter drawings are the Loam example masters: they are
original, and they are here only so the build works before you draw.

The manifest points `out` at `dist` relative to itself. Run:

```bash
node ../../skills/logodeck/scripts/build.mjs logo.config.example.json --palette cobalt-mint
```

`symbolSmall` is optional. Add a simplified master when the favicon needs thicker negative
space than the symbol. `altPalette` and `altOut` are optional too: when present, the example
build writes a second complete deck from the same masters. The wordmark must remain paths:
never put `<text>` in a master.

The template is deliberately not a finished brand. Do not ship it as a logo.
