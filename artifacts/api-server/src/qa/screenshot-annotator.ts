import path from 'path';
import { chromium } from 'playwright';
import type { UIIssue, FormIssue, PageScanned, BrokenLink } from './types.js';
import { playwrightEnv } from './playwright-env.js';

const SEVERITY_COLOR: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f97316',
  Low: '#eab308',
};

interface IssueAnnotation {
  selector: string;
  label: string;
  color: string;
}

/**
 * Re-opens each affected page URL in Playwright, injects visible red/orange/yellow
 * bounding-box overlays at exact document coordinates, then takes a full-page
 * screenshot that replaces the original PNG.  Because we work on the live DOM
 * (not a static image), element positions are always accurate regardless of
 * page height or layout complexity.
 */
export async function annotatePageScreenshots(
  pages: PageScanned[],
  uiIssues: UIIssue[],
  formIssues: FormIssue[],
  brokenLinks: BrokenLink[],
  screenshotsDir: string,
): Promise<void> {
  // ── Collect annotations grouped by page URL ──────────────────────────────
  const annotationsByUrl = new Map<string, IssueAnnotation[]>();

  for (const issue of uiIssues) {
    if (!issue.selector && issue.issueType !== 'Console Error') continue;
    const color = SEVERITY_COLOR[issue.severity] ?? '#ef4444';
    const list = annotationsByUrl.get(issue.page) ?? [];
    list.push({
      selector: issue.selector || 'body',
      label: `[${issue.severity}] ${issue.issueType}${issue.issueType === 'Console Error' ? ': ' + issue.description : ''}`,
      color,
    });
    annotationsByUrl.set(issue.page, list);
  }

  for (const issue of formIssues) {
    if (!issue.formSelector) continue;
    const color = SEVERITY_COLOR[issue.severity] ?? '#ef4444';
    const list = annotationsByUrl.get(issue.page) ?? [];
    list.push({
      selector: issue.formSelector,
      label: `[${issue.severity}] Form: ${issue.issueType}`,
      color,
    });
    annotationsByUrl.set(issue.page, list);
  }

  for (const link of brokenLinks) {
    if (!link.linkUrl) continue;
    const color = SEVERITY_COLOR['High'] ?? '#ef4444';
    const list = annotationsByUrl.get(link.sourcePage) ?? [];

    // We try multiple selectors for broken links/resources
    // 1. A links with href
    // 2. Img with src if it's a resource
    // 3. Any element with [src] or [href] matching
    const resourceType = link.error?.toLowerCase().includes('resource') ? 'Resource' : 'Link';

    list.push({
      selector: `a[href="${link.linkUrl}"], img[src="${link.linkUrl}"], [src*="${link.linkUrl}"], [href*="${link.linkUrl}"]`,
      label: `[High] Broken ${resourceType} (${link.statusCode})`,
      color,
    });
    annotationsByUrl.set(link.sourcePage, list);
  }

  if (annotationsByUrl.size === 0) return;

  // ── Launch browser once and process every affected page ──────────────────
  let browser = null;
  try {
    browser = await chromium.launch({ headless: true, env: playwrightEnv() });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

    // Inject __name shim to prevent esbuild-injected helper errors in browser context
    await context.addInitScript(() => {
      // @ts-ignore
      window.__name = (f, n) => f;
    });

    const annotationPromises = Array.from(annotationsByUrl.entries()).map(async ([pageUrl, annotations]) => {
      const pageInfo = pages.find((p) => p.url === pageUrl);
      if (!pageInfo?.screenshotFile) return;

      const screenshotPath = path.join(screenshotsDir, pageInfo.screenshotFile);

      const page = await context.newPage();
      try {
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch { }
        // Give the page a moment to render completely
        await page.waitForTimeout(2000);

        // Inject annotation overlay container + one box+label per issue
        await page.evaluate((items: IssueAnnotation[]) => {
          // Single fixed overlay container anchored to document top-left
          const container = document.createElement('div');
          container.id = '__qa_overlay';
          container.style.cssText = [
            'position:absolute',
            'top:0',
            'left:0',
            'width:0',
            'height:0',
            'overflow:visible',
            'pointer-events:none',
            'z-index:2147483647',
          ].join(';');
          document.body.appendChild(container);

          const scrollX = window.pageXOffset || 0;
          const scrollY = window.pageYOffset || 0;

          let idx = 0;
          for (const item of items) {
            let el: Element | null = null;
            try {
              el = document.querySelector(item.selector);
            } catch {
              // try matching partials if complex selector fails
              try {
                const selectors = item.selector.split(',');
                for (const s of selectors) {
                  el = document.querySelector(s.trim());
                  if (el) break;
                }
              } catch { }
            }
            if (!el) {
              // Special case for Console Error or global issues - show fixed at top
              if (item.label.includes('Console Error') || item.label.includes('Page Level')) {
                const banner = document.createElement('div');
                banner.textContent = `${idx + 1}. ${item.label}`;
                banner.style.cssText = [
                  'position:fixed',
                  'top:' + (10 + (idx * 30)) + 'px',
                  'right:10px',
                  `background:${item.color}`,
                  'color:#fff',
                  'font-weight: 700',
                  'font-family: system-ui, sans-serif',
                  'font-size: 13px',
                  'padding: 4px 10px',
                  'border-radius: 4px',
                  'border: 2px solid #fff',
                  'box-shadow: 0 4px 12px rgba(0,0,0,0.5)',
                  'z-index:2147483647',
                  'white-space:nowrap',
                  'max-width:600px',
                  'overflow:hidden',
                  'text-overflow:ellipsis',
                  'pointer-events:auto'
                ].join(';');
                container.appendChild(banner);
                idx++;
              }
              continue;
            }

            const r = el.getBoundingClientRect();
            // If it's a hidden element but has children or we want to show it anyway
            if (r.width === 0 && r.height === 0) {
              // See if it has children with size
              const children = el.children;
              let foundVisible = false;
              for (let i = 0; i < children.length; i++) {
                const cr = children[i].getBoundingClientRect();
                if (cr.width > 0 && cr.height > 0) {
                  // Use this child's rect for the highlight
                  const x = cr.left + scrollX;
                  const y = cr.top + scrollY;
                  drawHighlight(x, y, cr.width, cr.height, item, idx);
                  idx++;
                  foundVisible = true;
                  break;
                }
              }
              continue;
            }

            // Document-absolute coordinates
            const x = r.left + scrollX;
            const y = r.top + scrollY;
            const w = r.width;
            const h = r.height;

            drawHighlight(x, y, w, h, item, idx);
            idx++;
          }

          function drawHighlight(x: number, y: number, w: number, h: number, item: any, index: number) {
            // ── Bounding box (Translucent fill with thick borders) ───
            const box = document.createElement('div');
            box.style.cssText = [
              'position:absolute',
              `left:${x - 2}px`,
              `top:${y - 2}px`,
              `width:${w + 4}px`,
              `height:${h + 4}px`,
              `border:4px solid ${item.color}`,
              `background-color:${item.color}22`,
              'box-sizing:border-box',
              'box-shadow: 0 0 0 2px white, 0 8px 20px rgba(0,0,0,0.4)',
              'border-radius: 4px'
            ].join(';');
            container.appendChild(box);

            // ── Label badge (Premium glassmorphism-ish look) ────────────────────────
            const badgeHeight = 28;
            const labelY = y > badgeHeight + 5 ? y - badgeHeight - 5 : y + h + 5;
            const badge = document.createElement('div');
            badge.textContent = `${index + 1}. ${item.label}`;
            badge.style.cssText = [
              'position:absolute',
              `left:${Math.max(0, x)}px`,
              `top:${labelY}px`,
              `background:${item.color}`,
              'color:#fff',
              'font-weight: 800',
              'font-family: system-ui, -apple-system, sans-serif',
              'font-size: 14px',
              'padding: 4px 12px',
              'border-radius: 6px',
              'border: 2px solid #fff',
              'box-shadow: 0 4px 15px rgba(0,0,0,0.5)',
              'white-space:nowrap',
              'max-width:500px',
              'overflow:hidden',
              'text-overflow:ellipsis',
              'z-index:2147483647'
            ].join(';');
            container.appendChild(badge);
          }
        }, annotations);

        // Take full-page screenshot — replaces the original crawler screenshot
        await page.screenshot({ path: screenshotPath, fullPage: true });
      } catch (e) {
        console.error("Annotation error for page:", pageUrl, e);
        // Non-fatal: if page can't load, keep original screenshot
      } finally {
        await page.close();
      }
    });

    await Promise.all(annotationPromises);
    await context.close();
  } finally {
    if (browser) await browser.close();
  }
}

