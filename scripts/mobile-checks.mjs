// The phone checks of scripts/a11y.mjs (docs/guidelines/mobile.md): at 375×812 with touch emulated, every
// interactive element has a hit area of at least 44×44px, every text field is at least 16px (so iOS
// doesn't zoom in on it), and no visible text is clipped by an ellipsis.

export const PHONE = { width: 375, height: 812 };
export const TOUCH_TARGET = 44;

// Interactive elements allowed under 44px, each with its reason. `selector` matches the element.
// Add { selector, reason } here rather than loosening the check.
export const TOUCH_TARGET_EXCEPTIONS = [];

/** Lets a page script mark where in the page a finding is, as "tag#id.class.class". */
const NAME_SOURCE = `(el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") +
  (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/).slice(0, 3).join(".") : "")`;

/**
 * Switches Chrome to a phone: 375×812, mobile, touch (so `pointer: coarse` styles apply).
 * `setTouchEmulationEnabled` is what makes `(pointer: coarse)` match in Chrome.
 */
export async function emulatePhone(chrome) {
  await chrome.send("Emulation.setDeviceMetricsOverride", { ...PHONE, deviceScaleFactor: 2, mobile: true });
  await chrome.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
}

/** Back to a desktop of `size` with a mouse. */
export async function emulateDesktop(chrome, size) {
  await chrome.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await chrome.send("Emulation.setDeviceMetricsOverride", { ...size, deviceScaleFactor: 1, mobile: false });
}

/** One line per interactive element whose hit area is under 44×44px, inline text links excepted. */
export async function touchTargetProblems(chrome) {
  const { result, exceptionDetails } = await chrome.send("Runtime.evaluate", {
    expression: `(() => {
      const name = ${NAME_SOURCE};
      const min = ${TOUCH_TARGET};
      const exceptions = ${JSON.stringify(TOUCH_TARGET_EXCEPTIONS.map((e) => e.selector))};
      const interactive = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="menuitem"], [role="tab"], [tabindex]:not([tabindex="-1"])';
      const visible = (el) => el.checkVisibility({ visibilityProperty: true, opacityProperty: true });
      // A control's hit area includes its label's: a click on the label toggles it.
      const rectOf = (el) => {
        const boxes = [el, ...(el.labels ?? [])].map((e) => e.getBoundingClientRect());
        const left = Math.min(...boxes.map((b) => b.left)), top = Math.min(...boxes.map((b) => b.top));
        const right = Math.max(...boxes.map((b) => b.right)), bottom = Math.max(...boxes.map((b) => b.bottom));
        return { left, top, right, bottom, width: right - left, height: bottom - top };
      };
      // Pseudo-elements (a stretched link's ::after) enlarge the hit area without enlarging the box, so probe
      // what the pointer reaches around the element: the area of points that land on it or inside it.
      const reached = (el, r) => {
        const pad = min;
        let l = Infinity, t = Infinity, rr = -Infinity, b = -Infinity;
        for (let x = Math.floor(r.left - pad); x <= Math.ceil(r.right + pad); x += 2) {
          for (let y = Math.floor(r.top - pad); y <= Math.ceil(r.bottom + pad); y += 2) {
            if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
            const hit = document.elementFromPoint(x, y);
            if (hit && (hit === el || el.contains(hit) || (el.labels && [...el.labels].some((lb) => lb.contains(hit))))) {
              l = Math.min(l, x); t = Math.min(t, y); rr = Math.max(rr, x); b = Math.max(b, y);
            }
          }
        }
        return rr < 0 ? { width: 0, height: 0 } : { width: rr - l + 2, height: b - t + 2 };
      };
      // An inline text link sits in a run of other text; a nav link alone in its list item is not one.
      const isInlineLink = (el) => el.matches("a[href]") && getComputedStyle(el).display === "inline" &&
        !!el.parentElement && el.parentElement.innerText.trim() !== el.innerText.trim();
      const found = [];
      for (const el of document.querySelectorAll(interactive)) {
        if (!visible(el) || el.disabled || el.closest("[inert], [aria-hidden='true']")) continue;
        if (el.matches("a.skip-link, [href='#main']")) continue;
        if (isInlineLink(el) || exceptions.some((s) => el.matches(s))) continue;
        const r = rectOf(el);
        if (r.width <= 1 || r.height <= 1) continue; // visually hidden until focused
        if (r.width >= min && r.height >= min) continue;
      // cspell:disable-next-line -- "center" and "behavior" are the DOM API's own values.
        el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
        const area = reached(el, rectOf(el));
        if (area.width >= min && area.height >= min) continue;
        const label = (el.getAttribute("aria-label") || el.innerText || el.value || "").trim().replace(/\\s+/g, " ").slice(0, 40);
        found.push(\`touch target under \${min}×\${min}px (\${Math.round(Math.max(r.width, area.width))}×\${Math.round(Math.max(r.height, area.height))}): \${name(el)} "\${label}"\`);
      }
      // cspell:disable-next-line -- "center" and "behavior" are the DOM API's own values.
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      return found;
    })()`,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(`touch target check failed: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
  return result.value;
}

/** Under this, iOS Safari zooms in on a focused field and stays zoomed (BIG-204). */
export const FIELD_FONT_SIZE = 16;

/** One line per visible text field whose font is under 16px, so a phone would zoom in on it. */
export async function fieldZoomProblems(chrome) {
  const { result, exceptionDetails } = await chrome.send("Runtime.evaluate", {
    expression: `(() => {
      const name = ${NAME_SOURCE};
      const found = [];
      for (const el of document.querySelectorAll('select, textarea, input:not([type="checkbox"], [type="radio"], [type="hidden"])')) {
        if (!el.checkVisibility({ visibilityProperty: true })) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size >= ${FIELD_FONT_SIZE}) continue;
        found.push(\`field under ${FIELD_FONT_SIZE}px (\${size}px), so a phone zooms in on it: \${name(el)}\`);
      }
      return found;
    })()`,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(`field zoom check failed: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
  return result.value;
}

/** One line per visible element whose text is cut off by `text-overflow: ellipsis`. */
export async function clippedTextProblems(chrome) {
  const { result, exceptionDetails } = await chrome.send("Runtime.evaluate", {
    expression: `(() => {
      const name = ${NAME_SOURCE};
      const found = [];
      for (const el of document.body.querySelectorAll("*")) {
        if (getComputedStyle(el).textOverflow !== "ellipsis") continue;
        if (!el.checkVisibility({ visibilityProperty: true })) continue;
        if (el.scrollWidth <= el.clientWidth) continue;
        found.push(\`text cut off with an ellipsis: \${name(el)} "\${el.textContent.trim().replace(/\\s+/g, " ").slice(0, 40)}"\`);
      }
      return found;
    })()`,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(`clipped text check failed: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
  return result.value;
}
