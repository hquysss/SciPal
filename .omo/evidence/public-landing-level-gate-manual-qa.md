# Manual QA — no-JavaScript host/origin reproduction

## Scope

Hypothesis H1: the no-JavaScript education-level form failed because the browser opened `http://127.0.0.1:3102` while Next normalized the request URL/redirect to `http://localhost:3102`, so origin validation rejected the request. Product code and Supabase were not modified or accessed by this QA run.

Server surface: running Next production server on port `3102`.

## manualQa

### surfaceEvidence

| scenario id | criterion reference | surface | exact invocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| H1-LOCALHOST-JS0 | H1 / Task 5 Step 4, native form with JavaScript disabled | Browser UI, Chromium via Playwright, `http://localhost:3102/` | `node .omo/evidence/nojs-host-repro-playwright.cjs`; context `javaScriptEnabled:false`; click `button[name="level"][value="upper_secondary"]` | PASS | A1, A2 |
| H1-LOOPBACK-JS0 | H1 / Task 5 Step 4, host consistency adversarial reproduction | Browser UI, Chromium via Playwright, `http://127.0.0.1:3102/` | Same invocation and selector as H1-LOCALHOST-JS0, second fresh context, `javaScriptEnabled:false` | PASS (failure path reproduced) | A1, A3 |
| H1-LOCALHOST-RAW | H1 / HTTP response header confirmation | HTTP API | `node .omo/evidence/nojs-host-repro-curl.cjs` (which invokes `curl.exe -i -X POST "http://localhost:3102/api/preferences/education-level" -H "Origin: http://localhost:3102" -H "Content-Type: application/x-www-form-urlencoded" --data "scope=device&level=upper_secondary"`) | PASS | A4 |
| H1-LOOPBACK-RAW | H1 / HTTP response header confirmation | HTTP API | Same `node .omo/evidence/nojs-host-repro-curl.cjs` invocation; loopback case uses `curl.exe -i -X POST "http://127.0.0.1:3102/api/preferences/education-level" -H "Origin: http://127.0.0.1:3102" -H "Content-Type: application/x-www-form-urlencoded" --data "scope=device&level=upper_secondary"` | PASS (failure path reproduced) | A5 |

### Observed request and response facts

- Consistent `localhost` browser request: POST URL `http://localhost:3102/api/preferences/education-level`; request `Origin: http://localhost:3102`; form body `scope=device&level=upper_secondary`; response `303`; `Location: http://localhost:3102/#landing-title`; final URL `http://localhost:3102/#landing-title`; gate absent and `#landing-title` present; cookie `scipal_education_level=upper_secondary`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
- Comparative `127.0.0.1` browser request: POST URL `http://127.0.0.1:3102/api/preferences/education-level`; request `Origin: http://127.0.0.1:3102`; form body identical; response `303`; `Location: http://localhost:3102/?chooseLevel=1&saveError=1`; final URL exactly that error URL; gate remains and `#landing-title` is absent; no level cookie.
- Playwright's browser-exposed response headers reported no `set-cookie` entry, so the raw `curl -i` artifacts are the authoritative Set-Cookie evidence. The browser context cookie jar independently observed the successful localhost cookie and no loopback cookie.

### adversarialCases

| scenario id | criterion reference | adversarial class | expected behavior | verdict | artifactRefs |
|---|---|---|---|---|---|
| ADV-HOST-ORIGIN-MISMATCH | H1 / origin validation | host/origin mismatch (`127.0.0.1` request against server-normalized `localhost` URL) | Reject save, preserve previous device state, return gate with `saveError=1`, and omit preference cookie | PASS | A1, A3, A5 |
| ADV-JS-OFF-NATIVE-FORM | H1 / Task 5 Step 4 | JavaScript disabled | Native form remains usable and successful on a consistent origin | PASS | A1, A2, A4 |
| ADV-COOKIE-SET | H1 / device persistence | response cookie persistence | Successful same-origin device save emits the level cookie and subsequent page is the landing | PASS | A1, A2, A4 |

## artifactRefs

| id | kind | description | path |
|---|---|---|---|
| A1 | browser-action-log | Playwright JSON with both origins, request Origin/referer/body, response status/Location, final URLs, DOM state, and cookie jar | `.omo/evidence/nojs-host-repro-playwright.json` |
| A2 | browser-screenshot | JavaScript-disabled localhost gate before submit | `.omo/evidence/nojs-host-1-localhost-before.png` |
| A3 | browser-screenshot | JavaScript-disabled 127.0.0.1 error result after rejected submit | `.omo/evidence/nojs-host-2-loopback-after.png` |
| A4 | http-headers | Raw localhost `curl -i` output including `303`, `Location`, and `Set-Cookie` | `.omo/evidence/nojs-host-repro-curl-localhost-raw.txt` |
| A5 | http-headers | Raw 127.0.0.1 `curl -i` output including normalized error `Location` and absent `Set-Cookie` | `.omo/evidence/nojs-host-repro-curl-loopback-raw.txt` |
| A6 | browser-screenshot | JavaScript-disabled localhost successful landing after submit | `.omo/evidence/nojs-host-1-localhost-after.png` |

## Verdict

H1 is **CONFIRMED** by a paired real-browser reproduction. The same native no-JavaScript form succeeds on `localhost:3102` and fails only when opened on `127.0.0.1:3102`; the failing response normalizes its redirect to `localhost:3102`, carries `saveError=1`, and sets no cookie. This is evidence of host/origin mismatch behavior at the route boundary. No product fix was made in this QA subtask.
