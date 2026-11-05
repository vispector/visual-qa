---
name: vis-list-areas
description: Discover candidate UI areas in a local screenshot without saving a specification.
---

Require an image path and active Vispector context. Resolve ambiguity before inspection. Run the shared runtime:

```sh
node "${CODEX_HOME:-$HOME/.codex}/skills/vispector-visual-qa-runtime/upload-image.mjs" decompose <image-path> "<useful area hint>" [x-min,y-min,x-max,y-max]
```

The runtime reads local PNG/JPEG/WebP bytes and invokes authenticated `decompose_ui`, then polls the returned inspection ID. Focus bounds are optional normalized integers from 0 to 1000.

Show only returned candidate names, descriptions, attributes, attention features, text, and boxes. Compare them with paginated `list_specs` as suggestions; do not infer omitted attributes, persist results, merge or restructure taxonomy, or create specs without the user's selection and confirmation. If execution fails or evidence is incomplete, report that state. See `docs/usage.md`.
