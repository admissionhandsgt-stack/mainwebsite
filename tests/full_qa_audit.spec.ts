import { test, expect, Page } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

// ─── Route Inventory ─────────────────────────────────────────────────────────
const ROUTES = [
  '/',
  '/mbbs-india',
  '/mbbs-india/colleges',
  '/mbbs-india/deemed-universities',
  '/services',
  '/know-us',
  '/terms',
  '/neet-ug-process',
  '/nri-quota',
  '/nri-quota/colleges',
  '/nri-quota/documents',
  '/md-ms-india',
  '/videos',
] as const;

type Route = (typeof ROUTES)[number];
type Theme = 'light' | 'dark';
type Device = 'desktop' | 'mobile';
type Severity = 'critical' | 'high' | 'medium' | 'low';
type BugCategory =
  | 'theme/contrast'
  | 'layout/spacing'
  | 'interaction'
  | 'responsive/mobile'
  | 'navigation/state'
  | 'accessibility'
  | 'polish/UAT';

// ─── Bug Type ────────────────────────────────────────────────────────────────
interface Bug {
  id: string;
  severity: Severity;
  route: string;
  device: Device;
  theme: Theme;
  component: string;
  title: string;
  steps: string;
  actual: string;
  expected: string;
  screenshot?: string;
  trace?: string;
  suspectedRootCause: string;
  likelyFixArea: string;
  category: BugCategory;
  status: 'open' | 'fixed' | 'partial' | 'not-fixed';
}

// ─── Global Bug Collector ────────────────────────────────────────────────────
const bugs: Bug[] = [];
let bugCounter = 0;

function logBug(bug: Omit<Bug, 'id' | 'status'>) {
  bugCounter++;
  bugs.push({
    ...bug,
    id: `BUG-${String(bugCounter).padStart(3, '0')}`,
    status: 'open',
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getProjectInfo(projectName: string): { device: Device; theme: Theme } {
  return {
    device: projectName.includes('mobile') ? 'mobile' : 'desktop',
    theme: projectName.includes('dark') ? 'dark' : 'light',
  };
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function screenshot(page: Page, name: string): Promise<string> {
  const dir = path.join('tests', 'evidence');
  await ensureDir(dir);
  const sanitized = name.replace(/[^a-z0-9_-]/gi, '_');
  const file = path.join(dir, `${sanitized}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true });
  } catch (e) {
    try {
      await page.screenshot({ path: file, fullPage: false });
    } catch (innerErr) {
      // Ignore screenshot errors so the test itself doesn't fail
    }
  }
  return file;
}

function parseRGB(rgbStr: string): [number, number, number] {
  const match = rgbStr.match(/\d+/g);
  if (!match) return [0, 0, 0];
  return [Number(match[0]), Number(match[1]), Number(match[2])];
}

function brightnessOf(r: number, g: number, b: number): number {
  // W3C relative luminance-like brightness (simple average)
  return (r + g + b) / 3;
}

// ─── Contrast Scanner ────────────────────────────────────────────────────────
interface ContrastItem {
  text: string;
  color: string;
  backgroundColor: string;
  tag: string;
  cls: string;
  rect: { width: number; height: number; top: number; left: number };
}

async function contrastScan(page: Page): Promise<ContrastItem[]> {
  return await page.locator('body *').evaluateAll((nodes) => {
    const output: ContrastItem[] = [];
    for (const node of nodes) {
      const el = node as HTMLElement;

      // Skip containers without direct text content
      if (el.children.length > 0) {
        const hasDirectText = Array.from(el.childNodes).some(
          (child) =>
            child.nodeType === 3 && (child.textContent || '').trim().length > 0
        );
        if (!hasDirectText) continue;
      }

      const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (!text || text.length < 3) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 8) continue;

      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if (parseFloat(style.opacity) < 0.1) continue;

      // Resolve background by walking up
      let bg = style.backgroundColor;
      let curr: HTMLElement | null = el.parentElement;
      const isTransparent = (colorStr: string) => {
        if (
          colorStr === 'rgba(0, 0, 0, 0)' ||
          colorStr === 'transparent'
        )
          return true;
        const m = colorStr.match(
          /rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/
        );
        if (m && parseFloat(m[1]) < 0.25) return true;
        return false;
      };
      while (isTransparent(bg) && curr) {
        const currStyle = getComputedStyle(curr);
        bg = currStyle.backgroundColor;
        curr = curr.parentElement;
      }

      output.push({
        text: text.slice(0, 100),
        color: style.color,
        backgroundColor: bg,
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 150),
        rect: {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          left: Math.round(rect.left),
        },
      });
    }
    return output.slice(0, 400);
  });
}

// ─── Horizontal Overflow Scanner ─────────────────────────────────────────────
async function checkHorizontalOverflow(page: Page): Promise<{
  hasOverflow: boolean;
  scrollWidth: number;
  clientWidth: number;
  offenders: string[];
}> {
  return await page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const clientWidth = Math.max(docEl.clientWidth, window.innerWidth || 0);
    const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
    const offenders: string[] = [];

    if (scrollWidth > clientWidth + 5) {
      // Find offending elements
      const all = Array.from(document.querySelectorAll('*'));
      for (const el of all) {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.right > clientWidth + 5 || rect.left < -5) {
          const tag = el.tagName.toLowerCase();
          const cls = (el.className || '').toString().slice(0, 80);
          offenders.push(`${tag}.${cls}`);
          if (offenders.length >= 5) break;
        }
      }
    }

    return {
      hasOverflow: scrollWidth > clientWidth + 5,
      scrollWidth,
      clientWidth,
      offenders,
    };
  });
}

// ─── Page Load & Setup ───────────────────────────────────────────────────────
async function loadPage(page: Page, route: string) {
  const resp = await page.goto(route, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(1500); // Let dynamic content hydrate
  return resp;
}

// ─── PHASE 1: Full Page Audit ────────────────────────────────────────────────
// This test validates each route in every project (device × theme).
for (const route of ROUTES) {
  test(`audit: ${route}`, async ({ page }) => {
    const projectName = test.info().project.name;
    const { device, theme } = getProjectInfo(projectName);
    const label = `${projectName}${route === '/' ? '_home' : route.replace(/\//g, '_')}`;

    // 1. Load the page
    const response = await loadPage(page, route);
    const status = response?.status() ?? 0;

    // Take baseline screenshot
    const shot = await screenshot(page, label);

    // If page 404s or errors, log critical bug
    if (status >= 400) {
      logBug({
        severity: 'critical',
        route,
        device,
        theme,
        component: 'page',
        title: `Page returns HTTP ${status}`,
        steps: `Navigate to ${route} in ${projectName}`,
        actual: `HTTP status ${status}`,
        expected: 'HTTP 200',
        screenshot: shot,
        suspectedRootCause: 'Missing page component or routing error',
        likelyFixArea: `src/app${route}/page.tsx`,
        category: 'navigation/state',
      });
      return; // Skip remaining checks
    }

    // 2. Contrast scan
    const contrastItems = await contrastScan(page);

    let contrastBugCount = 0;
    for (const item of contrastItems) {
      const [rc, gc, bc] = parseRGB(item.color);
      const [rb, gb, bb] = parseRGB(item.backgroundColor);
      const brightText = brightnessOf(rc, gc, bc);
      const brightBg = brightnessOf(rb, gb, bb);
      const diff = Math.abs(brightText - brightBg);

      if (diff < 50 && item.text.length > 5) {
        contrastBugCount++;
        if (contrastBugCount <= 5) {
          // Log up to 5 contrast issues per page
          logBug({
            severity: diff < 30 ? 'critical' : 'high',
            route,
            device,
            theme,
            component: `${item.tag}.${(item.cls.split(' ')[0] || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '')}`,
            title: `Low contrast: "${item.text.substring(0, 40)}…"`,
            steps: `Open ${route} in ${projectName}. Find element <${item.tag}> with text.`,
            actual: `fg=${item.color} (brightness ${Math.round(brightText)}) on bg=${item.backgroundColor} (brightness ${Math.round(brightBg)}), diff=${Math.round(diff)}`,
            expected: 'Brightness difference ≥ 50 for readability',
            screenshot: shot,
            suspectedRootCause:
              theme === 'dark'
                ? 'Missing dark mode override or hardcoded light color'
                : 'Text/background color too close in light theme',
            likelyFixArea: 'src/styles/base.css or component file',
            category: 'theme/contrast',
          });
        }
      }
    }

    // 3. Horizontal overflow check
    const overflow = await checkHorizontalOverflow(page);
    if (overflow.hasOverflow) {
      logBug({
        severity: device === 'mobile' ? 'critical' : 'high',
        route,
        device,
        theme,
        component: overflow.offenders[0] || 'body',
        title: `Horizontal overflow (scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth})`,
        steps: `Open ${route} in ${projectName}. Page scrolls horizontally.`,
        actual: `scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}. Offenders: ${overflow.offenders.join(', ')}`,
        expected: 'No horizontal scroll on any viewport',
        screenshot: shot,
        suspectedRootCause: 'Fixed width element or missing overflow-x:hidden',
        likelyFixArea: 'Component layout or src/styles/base.css',
        category: 'responsive/mobile',
      });
    }

    // 4. Check essential page structure
    const hasH1 = await page.locator('h1').count();
    if (hasH1 === 0) {
      logBug({
        severity: 'medium',
        route,
        device,
        theme,
        component: 'page',
        title: 'Missing H1 heading on page',
        steps: `Open ${route} in ${projectName}`,
        actual: 'No H1 element found',
        expected: 'Every page should have exactly one H1 for SEO/accessibility',
        screenshot: shot,
        suspectedRootCause: 'Missing semantic heading',
        likelyFixArea: `src/app${route}/page.tsx`,
        category: 'accessibility',
      });
    }

    // 5. Check images have alt text
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    if (imagesWithoutAlt > 0) {
      logBug({
        severity: 'medium',
        route,
        device,
        theme,
        component: 'img',
        title: `${imagesWithoutAlt} image(s) missing alt text`,
        steps: `Open ${route} in ${projectName}`,
        actual: `${imagesWithoutAlt} images lack alt attribute`,
        expected: 'All images should have descriptive alt text',
        screenshot: shot,
        suspectedRootCause: 'Missing alt attribute on <img> tags',
        likelyFixArea: `src/app${route}/ or component files`,
        category: 'accessibility',
      });
    }

    // 6. Check interactive element tap targets (mobile)
    if (device === 'mobile') {
      const smallTargets = await page
        .locator('a, button, input, select, [role="button"]')
        .evaluateAll((elements) => {
          return elements
            .filter((el) => {
              const rect = el.getBoundingClientRect();
              const style = getComputedStyle(el);
              return (
                rect.width > 0 &&
                rect.height > 0 &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                (rect.width < 40 || rect.height < 40)
              );
            })
            .map((el) => ({
              tag: el.tagName,
              text: (el.textContent || '').trim().slice(0, 30),
              width: Math.round(el.getBoundingClientRect().width),
              height: Math.round(el.getBoundingClientRect().height),
            }))
            .slice(0, 5);
        });

      if (smallTargets.length > 0) {
        logBug({
          severity: 'medium',
          route,
          device,
          theme,
          component: 'interactive-elements',
          title: `${smallTargets.length} tap target(s) too small (< 40px)`,
          steps: `Open ${route} on mobile. Check interactive element sizes.`,
          actual: `Small targets: ${smallTargets.map((t) => `<${t.tag}> "${t.text}" ${t.width}×${t.height}`).join('; ')}`,
          expected: 'All tap targets should be at least 44×44px for touch accessibility',
          screenshot: shot,
          suspectedRootCause: 'Component sizing not adjusted for mobile',
          likelyFixArea: 'Component CSS or padding',
          category: 'responsive/mobile',
        });
      }
    }

    // 7. Check for broken links (visible <a> with empty href)
    const brokenLinks = await page.locator('a[href=""], a:not([href])').count();
    if (brokenLinks > 0) {
      logBug({
        severity: 'medium',
        route,
        device,
        theme,
        component: 'links',
        title: `${brokenLinks} link(s) with empty/missing href`,
        steps: `Open ${route} in ${projectName}`,
        actual: `${brokenLinks} anchor elements lack valid href`,
        expected: 'All links should have valid href attributes',
        screenshot: shot,
        suspectedRootCause: 'Placeholder links not filled in',
        likelyFixArea: `Component files on ${route}`,
        category: 'navigation/state',
      });
    }

    // Soft assertion: page should have visible content
    expect(contrastItems.length).toBeGreaterThan(0);
  });
}

// ─── PHASE 2: Interaction Tests ──────────────────────────────────────────────
test('interactions: mobile nav toggle', async ({ page }) => {
  const projectName = test.info().project.name;
  const { device, theme } = getProjectInfo(projectName);
  if (device !== 'mobile') {
    test.skip();
    return;
  }

  await loadPage(page, '/');

  const menuBtn = page.locator('button[aria-label="Toggle Menu"]').first();
  const menuVisible = await menuBtn.isVisible();

  if (!menuVisible) {
    logBug({
      severity: 'critical',
      route: '/',
      device,
      theme,
      component: 'Header/MobileNav',
      title: 'Mobile menu toggle button not visible',
      steps: 'Open / on mobile. Look for hamburger menu.',
      actual: 'Toggle Menu button not found or not visible',
      expected: 'Mobile nav toggle should be visible on mobile viewport',
      suspectedRootCause: 'Missing aria-label or responsive breakpoint issue',
      likelyFixArea: 'src/components/Header.tsx',
      category: 'responsive/mobile',
    });
    return;
  }

  // Open menu
  await menuBtn.click();
  await page.waitForTimeout(500);

  const shot = await screenshot(page, `${projectName}_mobile_nav_open`);

  // Check that nav links appear
  const navLinks = page.locator('nav a, [role="navigation"] a').filter({ visible: true }).first();
  const linksVisible = await navLinks.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);

  if (!linksVisible) {
    logBug({
      severity: 'high',
      route: '/',
      device,
      theme,
      component: 'MobileNav',
      title: 'Mobile nav links not visible after opening menu',
      steps: 'Open / on mobile. Tap hamburger. Check for nav links.',
      actual: 'Navigation links not visible',
      expected: 'Nav links should appear when mobile menu is opened',
      screenshot: shot,
      suspectedRootCause: 'Mobile drawer not rendering or hidden',
      likelyFixArea: 'src/components/Header.tsx',
      category: 'responsive/mobile',
    });
  }

  // Close menu
  await menuBtn.click({ force: true });
  await page.waitForTimeout(300);
});

// ─── PHASE 3: Theme Toggle Tests ────────────────────────────────────────────
test('theme: toggle and navigate', async ({ page }) => {
  const projectName = test.info().project.name;
  const { device, theme } = getProjectInfo(projectName);

  await loadPage(page, '/');

  // Find theme toggle button
  const themeBtn = page
    .locator(
      'button:has(svg[class*="lucide-moon"]), button:has(svg[class*="lucide-sun"]), button[aria-label*="theme" i], button[aria-label*="Toggle theme" i], button[aria-label*="mode" i]'
    )
    .first();

  const themeToggleVisible = await themeBtn.isVisible().catch(() => false);

  if (!themeToggleVisible) {
    // Not necessarily a bug if on mobile and theme toggle is in the mobile menu
    if (device === 'desktop') {
      logBug({
        severity: 'high',
        route: '/',
        device,
        theme,
        component: 'Header/ThemeToggle',
        title: 'Theme toggle button not visible on desktop',
        steps: 'Open / on desktop. Look for theme toggle.',
        actual: 'Theme toggle button not found',
        expected: 'Theme toggle should be accessible on desktop',
        suspectedRootCause: 'Theme toggle missing or selector mismatch',
        likelyFixArea: 'src/components/Header.tsx',
        category: 'theme/contrast',
      });
    }
    return;
  }

  // Click theme toggle
  await themeBtn.click();
  await page.waitForTimeout(800);

  const shotAfterToggle = await screenshot(page, `${projectName}_after_theme_toggle`);

  // Check that theme class changed
  const htmlClasses = await page.locator('html').getAttribute('class');
  const hasThemeClass =
    htmlClasses?.includes('dark') || htmlClasses?.includes('light');

  if (!hasThemeClass) {
    logBug({
      severity: 'high',
      route: '/',
      device,
      theme,
      component: 'ThemeProvider',
      title: 'Theme class not applied after toggle',
      steps: 'Open / and click theme toggle',
      actual: `HTML classes: "${htmlClasses}"`,
      expected: 'HTML should have "dark" or "light" class',
      screenshot: shotAfterToggle,
      suspectedRootCause: 'ThemeProvider not updating class attribute',
      likelyFixArea: 'src/components/theme-provider.tsx',
      category: 'theme/contrast',
    });
  }

  // Navigate to another page after toggle
  await page.goto('/services', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const shotAfterNav = await screenshot(page, `${projectName}_theme_persisted_after_nav`);

  // Verify theme persisted
  const htmlClassesAfterNav = await page.locator('html').getAttribute('class');
  const themeStillApplied =
    htmlClassesAfterNav?.includes('dark') || htmlClassesAfterNav?.includes('light');

  if (!themeStillApplied) {
    logBug({
      severity: 'high',
      route: '/services',
      device,
      theme,
      component: 'ThemeProvider',
      title: 'Theme state lost after navigation',
      steps: 'Toggle theme on /, then navigate to /services',
      actual: `HTML classes after navigation: "${htmlClassesAfterNav}"`,
      expected: 'Theme should persist across navigation',
      screenshot: shotAfterNav,
      suspectedRootCause: 'Theme state not persisted or next-themes hydration issue',
      likelyFixArea: 'src/components/theme-provider.tsx',
      category: 'navigation/state',
    });
  }
});

// ─── PHASE 4: Footer Checks ─────────────────────────────────────────────────
test('footer: visibility and links', async ({ page }) => {
  const projectName = test.info().project.name;
  const { device, theme } = getProjectInfo(projectName);

  await loadPage(page, '/');

  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  const footer = page.locator('footer').first();
  const footerVisible = await footer.isVisible().catch(() => false);

  if (!footerVisible) {
    logBug({
      severity: 'high',
      route: '/',
      device,
      theme,
      component: 'Footer',
      title: 'Footer not visible',
      steps: 'Open / and scroll to bottom',
      actual: 'Footer element not visible',
      expected: 'Footer should be visible at page bottom',
      suspectedRootCause: 'Footer hidden or not rendered',
      likelyFixArea: 'src/components/Footer.tsx',
      category: 'layout/spacing',
    });
    return;
  }

  const shot = await screenshot(page, `${projectName}_footer`);

  // Check footer links work
  const footerLinks = await footer.locator('a[href]').count();
  if (footerLinks === 0) {
    logBug({
      severity: 'medium',
      route: '/',
      device,
      theme,
      component: 'Footer',
      title: 'Footer has no links',
      steps: 'Open / and scroll to footer',
      actual: 'No anchor elements in footer',
      expected: 'Footer should contain navigation and legal links',
      screenshot: shot,
      suspectedRootCause: 'Footer content not rendered',
      likelyFixArea: 'src/components/Footer.tsx',
      category: 'layout/spacing',
    });
  }
});

// ─── PHASE 5: CTA / Form Checks ─────────────────────────────────────────────
test('forms: contact form presence', async ({ page }) => {
  const projectName = test.info().project.name;
  const { device, theme } = getProjectInfo(projectName);

  // Check services page for a contact form
  await loadPage(page, '/services');

  const formFields = page.locator('input, textarea, select');
  const fieldCount = await formFields.count();

  // Check /know-us too
  await loadPage(page, '/know-us');
  const formFieldsAbout = page.locator('input, textarea, select');
  const fieldCountAbout = await formFieldsAbout.count();

  // Just capture info; forms may not be on every page
  const shot = await screenshot(page, `${projectName}_know_us_forms`);
});

// ─── PHASE 6: Desktop Hover State Tests ─────────────────────────────────────
test('hover: interactive elements on homepage', async ({ page }) => {
  const projectName = test.info().project.name;
  const { device, theme } = getProjectInfo(projectName);
  if (device !== 'desktop') {
    test.skip();
    return;
  }

  await loadPage(page, '/');

  // Hover over first 10 interactive elements
  const interactive = page.locator('a, button, [role="button"]');
  const count = await interactive.count();
  const hoverCount = Math.min(count, 15);

  for (let i = 0; i < hoverCount; i++) {
    const el = interactive.nth(i);
    const isVisible = await el.isVisible().catch(() => false);
    if (!isVisible) continue;

    await el.hover({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(100);

    // Check if hovering caused the element to become invisible or text to disappear
    const opacity = await el.evaluate((e) => getComputedStyle(e).opacity).catch(() => '1');
    if (parseFloat(opacity) < 0.3) {
      logBug({
        severity: 'high',
        route: '/',
        device,
        theme,
        component: `interactive-element-${i}`,
        title: `Element becomes nearly invisible on hover (opacity=${opacity})`,
        steps: `Open / on desktop. Hover over interactive element #${i}`,
        actual: `Element opacity drops to ${opacity} on hover`,
        expected: 'Elements should remain visible on hover',
        suspectedRootCause: 'Hover style too aggressive or missing theme variant',
        likelyFixArea: 'Component CSS',
        category: 'interaction',
      });
    }
  }

  await screenshot(page, `${projectName}_hover_states`);
});

// ─── PHASE 7: Accordion / Tab Tests ─────────────────────────────────────────
test('interactions: accordions and tabs', async ({ page }) => {
  const projectName = test.info().project.name;
  const { device, theme } = getProjectInfo(projectName);

  // Check NEET UG Process page which likely has accordions/tabs
  await loadPage(page, '/neet-ug-process');

  const accordionTriggers = page.locator(
    '[data-radix-accordion-trigger], [role="button"][aria-expanded], button[data-state]'
  );
  const triggerCount = await accordionTriggers.count();

  if (triggerCount > 0) {
    // Click first accordion
    const first = accordionTriggers.first();
    await first.click().catch(() => {});
    await page.waitForTimeout(300);
    await screenshot(page, `${projectName}_neet_accordion_open`);

    // Click to close
    await first.click().catch(() => {});
    await page.waitForTimeout(300);
  }

  // Check tabs
  const tabs = page.locator('[role="tab"]');
  const tabCount = await tabs.count();

  if (tabCount > 1) {
    // Click second tab
    await tabs.nth(1).click().catch(() => {});
    await page.waitForTimeout(300);
    await screenshot(page, `${projectName}_neet_tab_switch`);
  }
});

// ─── PHASE 8: Visual Polish Checks ──────────────────────────────────────────
test('polish: visual hierarchy and spacing', async ({ page }) => {
  const projectName = test.info().project.name;
  const { device, theme } = getProjectInfo(projectName);

  await loadPage(page, '/');

  // Check that the hero section has adequate height
  const hero = page.locator('section').first();
  const heroBox = await hero.boundingBox();

  if (heroBox && heroBox.height < 300) {
    logBug({
      severity: 'medium',
      route: '/',
      device,
      theme,
      component: 'Hero',
      title: 'Hero section too short (< 300px)',
      steps: `Open / in ${projectName}`,
      actual: `Hero height: ${Math.round(heroBox.height)}px`,
      expected: 'Hero section should be at least 400px for visual impact',
      suspectedRootCause: 'Hero min-height too small or content not filling',
      likelyFixArea: 'src/components/Hero.tsx',
      category: 'polish/UAT',
    });
  }

  // Check font loading
  const fontsLoaded = await page.evaluate(() => {
    return document.fonts.ready.then(() => document.fonts.size > 0);
  });

  if (!fontsLoaded) {
    logBug({
      severity: 'low',
      route: '/',
      device,
      theme,
      component: 'typography',
      title: 'Custom fonts may not be loading',
      steps: `Open / in ${projectName}`,
      actual: 'No custom fonts detected',
      expected: 'Inter and Plus Jakarta Sans should be loaded',
      suspectedRootCause: 'Font loading failure or slow CDN',
      likelyFixArea: 'src/app/layout.tsx',
      category: 'polish/UAT',
    });
  }

  await screenshot(page, `${projectName}_visual_polish`);
});

// ─── PHASE 9: College Listing Page Deep Check ────────────────────────────────
test('colleges: listing page cards', async ({ page }) => {
  const projectName = test.info().project.name;
  const { device, theme } = getProjectInfo(projectName);

  await loadPage(page, '/mbbs-india/colleges');

  // Check that college cards are present
  const cards = page.locator('[class*="card"], [class*="Card"], article, [data-college]');
  const cardCount = await cards.count();

  const shot = await screenshot(page, `${projectName}_college_listing`);

  // Check search/filter if present
  const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]');
  const hasSearch = (await searchInput.count()) > 0;

  if (hasSearch) {
    await searchInput.first().fill('AIIMS');
    await page.waitForTimeout(500);
    await screenshot(page, `${projectName}_college_search_aiims`);

    // Clear search
    await searchInput.first().clear();
    await page.waitForTimeout(300);
  }

  // Check filters if present
  const filterBtns = page.locator('button:has-text("Filter"), select, [role="combobox"]');
  const filterCount = await filterBtns.count();
});

// ─── PHASE 10: Keyboard Navigation ──────────────────────────────────────────
test('accessibility: keyboard navigation', async ({ page }) => {
  const projectName = test.info().project.name;
  const { device, theme } = getProjectInfo(projectName);
  if (device !== 'desktop') {
    test.skip();
    return;
  }

  await loadPage(page, '/');

  // Tab through first 10 focusable elements
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
  }

  // Check if a focus ring is visible on the active element
  const focusedInfo = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    if (!el || el === document.body) return null;
    const style = getComputedStyle(el);
    return {
      tag: el.tagName,
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
      boxShadow: style.boxShadow.slice(0, 50),
    };
  });

  if (focusedInfo && focusedInfo.outlineStyle === 'none' && focusedInfo.boxShadow === 'none') {
    logBug({
      severity: 'medium',
      route: '/',
      device,
      theme,
      component: `${focusedInfo.tag}`,
      title: 'No visible focus indicator on keyboard navigation',
      steps: 'Open / and tab through elements',
      actual: `Focused element <${focusedInfo.tag}> has no outline or box-shadow`,
      expected: 'Focused elements should have visible focus indicators',
      suspectedRootCause: 'Focus styles removed or not defined',
      likelyFixArea: 'src/styles/base.css',
      category: 'accessibility',
    });
  }

  await screenshot(page, `${projectName}_keyboard_focus`);
});

// ─── REPORT GENERATION ──────────────────────────────────────────────────────
test.afterAll(async () => {
  const artifactDir =
    'C:/Users/91971/.gemini/antigravity/brain/76d57c4a-cfc9-47e9-82c5-a8c634217066';
  await ensureDir(artifactDir);

  // ── Group bugs ──────────────────────────────────────
  const byRoute: Record<string, Bug[]> = {};
  const byCategory: Record<string, Bug[]> = {};
  const bySeverity: Record<string, Bug[]> = {};
  const byTheme: Record<string, Bug[]> = {};

  for (const bug of bugs) {
    (byRoute[bug.route] ??= []).push(bug);
    (byCategory[bug.category] ??= []).push(bug);
    (bySeverity[bug.severity] ??= []).push(bug);
    (byTheme[bug.theme] ??= []).push(bug);
  }

  // ── Build audit report ──────────────────────────────
  const md = [
    '# Theme & UI Audit Report',
    '',
    '## Scope',
    `- **Routes tested**: ${ROUTES.join(', ')}`,
    `- **Projects**: desktop-light, desktop-dark, mobile-light, mobile-dark`,
    `- **Total bugs found**: ${bugs.length}`,
    `- **Audit date**: ${new Date().toISOString().split('T')[0]}`,
    '',
    '## Bug Summary by Severity',
    `- Critical: ${bySeverity['critical']?.length ?? 0}`,
    `- High: ${bySeverity['high']?.length ?? 0}`,
    `- Medium: ${bySeverity['medium']?.length ?? 0}`,
    `- Low: ${bySeverity['low']?.length ?? 0}`,
    '',
    '## Bug Summary by Category',
    ...Object.entries(byCategory).map(
      ([cat, b]) => `- ${cat}: ${b.length} bugs`
    ),
    '',
    '## Bug Summary by Theme',
    ...Object.entries(byTheme).map(
      ([t, b]) => `- ${t}: ${b.length} bugs`
    ),
    '',
    '## Bugs by Route',
    ...Object.entries(byRoute).flatMap(([route, routeBugs]) => [
      '',
      `### ${route}`,
      ...routeBugs.map(
        (b) =>
          `- **${b.id}** [${b.severity}] [${b.device}/${b.theme}] ${b.title}`
      ),
    ]),
    '',
    '## Root Cause Clusters',
    '',
    '### Theme/Contrast',
    ...(byCategory['theme/contrast'] || []).map(
      (b) =>
        `- ${b.id}: ${b.suspectedRootCause}`
    ),
    '',
    '### Layout/Spacing',
    ...(byCategory['layout/spacing'] || []).map(
      (b) =>
        `- ${b.id}: ${b.suspectedRootCause}`
    ),
    '',
    '### Responsive/Mobile',
    ...(byCategory['responsive/mobile'] || []).map(
      (b) =>
        `- ${b.id}: ${b.suspectedRootCause}`
    ),
    '',
    '### Accessibility',
    ...(byCategory['accessibility'] || []).map(
      (b) =>
        `- ${b.id}: ${b.suspectedRootCause}`
    ),
    '',
    '### Interaction',
    ...(byCategory['interaction'] || []).map(
      (b) =>
        `- ${b.id}: ${b.suspectedRootCause}`
    ),
    '',
    '### Navigation/State',
    ...(byCategory['navigation/state'] || []).map(
      (b) =>
        `- ${b.id}: ${b.suspectedRootCause}`
    ),
    '',
    '### Polish/UAT',
    ...(byCategory['polish/UAT'] || []).map(
      (b) =>
        `- ${b.id}: ${b.suspectedRootCause}`
    ),
    '',
    '## Full Bug Details',
    ...bugs.map(
      (b) =>
        `\n### ${b.id} — ${b.title}\n| Field | Value |\n|-------|-------|\n| Severity | ${b.severity} |\n| Route | ${b.route} |\n| Device | ${b.device} |\n| Theme | ${b.theme} |\n| Component | ${b.component} |\n| Category | ${b.category} |\n| Status | ${b.status} |\n| Steps | ${b.steps} |\n| Actual | ${b.actual} |\n| Expected | ${b.expected} |\n| Root Cause | ${b.suspectedRootCause} |\n| Fix Area | ${b.likelyFixArea} |${b.screenshot ? `\n| Screenshot | ${b.screenshot} |` : ''}`
    ),
  ].join('\n');

  const json = JSON.stringify(bugs, null, 2);

  const fixSummary = [
    '# Fix Summary',
    '',
    '## Audit Phase',
    `- Total bugs discovered: ${bugs.length}`,
    `- Critical: ${bySeverity['critical']?.length ?? 0}`,
    `- High: ${bySeverity['high']?.length ?? 0}`,
    `- Medium: ${bySeverity['medium']?.length ?? 0}`,
    `- Low: ${bySeverity['low']?.length ?? 0}`,
    '',
    '## Status',
    '- Phase: AUDIT COMPLETE — bugs logged, fixes pending',
    '',
    '## Root Cause Clusters Identified',
    ...Object.entries(byCategory).map(
      ([cat, b]) => `- **${cat}**: ${b.length} issues`
    ),
    '',
    '## Files Likely Needing Fixes',
    '- src/styles/base.css (theme tokens, dark mode overrides)',
    '- src/components/Hero.tsx',
    '- src/components/Header.tsx',
    '- src/components/Footer.tsx',
    '- src/components/Stats.tsx',
    '- src/components/CTA.tsx',
    '- Various page-level components',
    '',
    '## Validation',
    '- Full retest required after fixes',
    '- All 4 projects must pass',
  ].join('\n');

  await fs.writeFile(path.join(artifactDir, 'theme-ui-audit-report.md'), md);
  await fs.writeFile(path.join(artifactDir, 'theme-ui-bugs.json'), json);
  await fs.writeFile(path.join(artifactDir, 'fix-summary.md'), fixSummary);
});
