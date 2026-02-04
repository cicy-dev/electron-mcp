// snapshot-utils.js
// Snapshot utilities for Electron MCP server
// Provides page snapshot capture with screenshots and element references
const { clipboard,nativeImage} = require('electron');
const SNAPSHOT_PRESETS = {
  shorten: { domDepth: 64, maxChildren: 240, maxInteractive: 800 },
  all: {
    domDepth: Number.POSITIVE_INFINITY,
    maxChildren: Number.POSITIVE_INFINITY,
    maxInteractive: Number.POSITIVE_INFINITY,
  },
};

function getSnapshotLimits(detailLevel = 'shorten') {
  const key = typeof detailLevel === 'string' ? detailLevel.toLowerCase() : 'shorten';
  return SNAPSHOT_PRESETS[key] || SNAPSHOT_PRESETS.shorten;
}

const INTERACTIVE_ROLE_KEYS = new Set(
  [
    'button', 'link', 'textbox', 'textfield', 'searchbox', 'combobox',
    'menuitem', 'menuitemcheckbox', 'menuitemradio', 'menu', 'menubar',
    'listitem', 'listboxoption', 'option', 'treeitem', 'gridcell', 'row',
    'cell', 'switch', 'checkbox', 'radiobutton', 'slider', 'tab', 'tabpanel',
    'togglebutton', 'buttonmenu', 'text'
  ].map((role) => role.toLowerCase())
);

const LANDMARK_ROLE_KEYS = new Set(
  [
    'banner', 'navigation', 'main', 'contentinfo', 'complementary',
    'search', 'region', 'form', 'aside', 'footer', 'header'
  ].map((role) => role.toLowerCase())
);

let currentAxRefMap = new Map();
let currentAxRefCounter = 1;
let currentSnapshotPrefix = 's1';

function resetAccessibleRefMap() {
  currentAxRefMap = new Map();
  currentAxRefCounter = 1;
}

function formatAccessibleRef(nodeId) {
  if (nodeId === undefined || nodeId === null) return undefined;
  if (!currentAxRefMap.has(nodeId)) {
    const refId = `${currentSnapshotPrefix}e${currentAxRefCounter}`;
    currentAxRefMap.set(nodeId, refId);
    currentAxRefCounter += 1;
  }
  return currentAxRefMap.get(nodeId);
}

function buildCssSelector(element) {
  if (!element || !element.tagName) return null;
  
  const tagName = element.tagName.toLowerCase();
  
  if (element.id) return `#${element.id}`;
  if (tagName === 'a' && element.href) return `a[href="${element.href}"]`;
  if (element.getAttribute('data-testid')) return `${tagName}[data-testid="${element.getAttribute('data-testid')}"]`;
  if (element.getAttribute('name')) return `${tagName}[name="${element.getAttribute('name')}"]`;
  if (element.getAttribute('aria-label')) return `${tagName}[aria-label="${element.getAttribute('aria-label')}"]`;
  
  const className = element.className;
  if (className && typeof className === 'string') {
    const classes = className.split(/\s+/).filter(c => c && !c.match(/^(active|hover|focus|selected)$/));
    if (classes.length > 0) return `${tagName}.${classes[0]}`;
  }
  
  return null;
}

async function captureDomSnapshot(webContents, fullPage = true, limits = null) {
  const snapshotLimits = limits || getSnapshotLimits('shorten');
  
  return await webContents.executeJavaScript(`
    (function() {
      const limits = ${JSON.stringify(snapshotLimits)};
      
      function inferRole(element) {
        const explicitRole = element.getAttribute('role');
        if (explicitRole) return explicitRole;
        
        const tag = element.tagName;
        if (tag === 'A') return 'link';
        if (tag === 'BUTTON') return 'button';
        if (tag === 'SELECT') return 'combobox';
        if (tag === 'OPTION') return 'option';
        if (tag === 'LI') return 'listitem';
        if (tag === 'INPUT') {
          const type = element.type;
          if (type === 'checkbox') return 'checkbox';
          if (type === 'radio') return 'radio';
          if (type === 'submit' || type === 'button') return 'button';
          return 'textbox';
        }
        if (tag === 'IMG') return 'img';
        if (tag === 'NAV') return 'navigation';
        if (tag === 'MAIN') return 'main';
        if (tag === 'HEADER') return 'banner';
        if (tag === 'FOOTER') return 'contentinfo';
        if (tag === 'ASIDE') return 'complementary';
        if (tag === 'SECTION') return 'region';
        if (tag.match(/^H[1-6]$/)) return 'heading';
        if (tag === 'FORM') return 'form';
        if (element.hasAttribute('contenteditable')) return 'textbox';
        if (tag === 'TEXTAREA') return 'textbox';
        return null;
      }
      
      function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
          rect.top < window.innerHeight &&
          rect.bottom > 0 &&
          rect.left < window.innerWidth &&
          rect.right > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      }
      
      function shouldIncludeElement(element) {
        if (${fullPage}) return true;
        return isInViewport(element);
      }
      
      function buildElementRef(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;
        if (element === document.body) return 'body';
        
        let selector = element.tagName.toLowerCase();
        if (element.id) {
          return selector + '#' + element.id;
        }
        
        const parent = element.parentElement;
        if (!parent) return selector;
        
        const siblings = Array.from(parent.children).filter(
          (child) => child.tagName === element.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(element) + 1;
          selector += ':nth-of-type(' + index + ')';
        }
        
        return selector;
      }
      
      function buildPath(element) {
        const path = [];
        let current = element;
        while (current && current !== document.body) {
          const ref = buildElementRef(current);
          if (ref) path.unshift(ref);
          current = current.parentElement;
        }
        return path.length > 0 ? 'body > ' + path.join(' > ') : 'body';
      }
      
      const nodeCounter = { value: 0 };
      
      function buildAriaTree(element, depth = 0) {
        if (!element || depth > limits.domDepth) return null;
        
        const role = inferRole(element);
        if (!role) {
          const children = [];
          for (const child of element.children) {
            const childNode = buildAriaTree(child, depth + 1);
            if (childNode) children.push(childNode);
          }
          if (children.length > 0) {
            return {
              role: 'group',
              name: '',
              tag: element.tagName.toLowerCase(),
              children: children.slice(0, limits.maxChildren),
            };
          }
          return null;
        }
        
        nodeCounter.value++;
        const nodeId = nodeCounter.value;
        
        const textContent = element.textContent?.trim() || '';
        const ariaLabel =
          element.getAttribute('aria-label') ||
          element.getAttribute('aria-labelledby') ||
          element.getAttribute('title') ||
          element.getAttribute('placeholder') ||
          ((role === 'link' || role === 'button') ? textContent.slice(0, 100) : '');
        
        const node = {
          nodeId: nodeId,
          role,
          name: ariaLabel || textContent.slice(0, 50) || '',
          tag: element.tagName.toLowerCase(),
        };
        
        const ref = buildPath(element);
        if (ref) node.ref = ref;
        
        const attr = (name) => element.getAttribute(name);
        if (attr('aria-expanded')) node.expanded = attr('aria-expanded') === 'true';
        if (attr('aria-selected')) node.selected = attr('aria-selected') === 'true';
        if (attr('aria-checked')) node.checked = attr('aria-checked') === 'true';
        if (attr('aria-disabled')) node.disabled = attr('aria-disabled') === 'true';
        if (attr('aria-level')) node.level = parseInt(attr('aria-level'), 10);
        if (attr('aria-current')) node.current = attr('aria-current');
        
        if (element.value !== undefined && element.value !== null) {
          node.value = String(element.value);
        }
        
        if (element.href) node.href = element.href;
        if (element.src) node.src = element.src;
        if (element.alt) node.alt = element.alt;
        
        const children = [];
        for (const child of element.children) {
          const childNode = buildAriaTree(child, depth + 1);
          if (childNode) children.push(childNode);
        }
        
        if (children.length > 0) {
          node.children = children.slice(0, limits.maxChildren);
        }
        
        return node;
      }
      
      function collectInteractiveElements() {
        const results = [];
        const selectors = 'a[href], button, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';
        let counter = 0;
        
        const elements = Array.from(document.querySelectorAll(selectors));
        for (const el of elements) {
          if (!shouldIncludeElement(el)) continue;
          if (counter >= limits.maxInteractive) break;
          
          const role = inferRole(el) || el.getAttribute('role') || el.tagName.toLowerCase();
          const label =
            el.getAttribute('aria-label') ||
            el.getAttribute('placeholder') ||
            el.getAttribute('title') ||
            el.textContent?.trim().slice(0, 80) ||
            el.value ||
            '';
          
          const item = {
            index: counter,
            role,
            tag: el.tagName.toLowerCase(),
            label,
            id: el.id || undefined,
            name: el.name || undefined,
            type: el.type || undefined,
            href: el.href || undefined,
            disabled: el.disabled || undefined,
            ariaExpanded: el.getAttribute('aria-expanded') || undefined,
            ariaSelected: el.getAttribute('aria-selected') || undefined,
            ref: buildPath(el) || undefined,
          };
          
          // Remove undefined values
          Object.keys(item).forEach(key => {
            if (item[key] === undefined) delete item[key];
          });
          
          results.push(item);
          counter++;
        }
        
        return results;
      }
      
      function collectLandmarks() {
        const results = [];
        const selectors = 'main, nav, header, footer, aside, [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], [role="search"]';
        
        for (const el of Array.from(document.querySelectorAll(selectors))) {
          if (!shouldIncludeElement(el)) continue;
          const role = inferRole(el) || el.getAttribute('role') || el.tagName.toLowerCase();
          results.push({
            role,
            tag: el.tagName.toLowerCase(),
            ariaLabel: el.getAttribute('aria-label') || undefined,
            id: el.id || undefined,
            ref: buildPath(el) || undefined,
          });
          if (results.length >= 20) break;
        }
        return results;
      }
      
      function collectLinks() {
        return Array.from(document.querySelectorAll('a[href]'))
          .filter(shouldIncludeElement)
          .slice(0, 30)
          .map((a) => ({
            text: a.textContent?.trim().slice(0, 120) || '',
            href: a.href,
            rel: a.rel || undefined,
            ariaLabel: a.getAttribute('aria-label') || undefined,
          }));
      }
      
      function collectImages() {
        return Array.from(document.querySelectorAll('img[src]'))
          .filter(shouldIncludeElement)
          .slice(0, 20)
          .map((img) => ({
            src: img.src,
            alt: img.alt || '',
            ariaLabel: img.getAttribute('aria-label') || undefined,
            ref: buildPath(img) || undefined,
          }));
      }
      
      function collectForms() {
        const forms = Array.from(document.querySelectorAll('form'))
          .filter(shouldIncludeElement)
          .slice(0, 5);
        
        return forms.map((form) => ({
          action: form.action || '',
          method: form.method || '',
          ariaLabel: form.getAttribute('aria-label') || undefined,
          ref: buildPath(form) || undefined,
          fields: Array.from(form.querySelectorAll('input, select, textarea'))
            .filter(shouldIncludeElement)
            .slice(0, 15)
            .map((field) => {
              const fieldData = {
                type: field.type || field.tagName.toLowerCase(),
                name: field.name || undefined,
                id: field.id || undefined,
                placeholder: field.placeholder || undefined,
                ariaLabel: field.getAttribute('aria-label') || undefined,
                required: field.required || undefined,
                ref: buildPath(field) || undefined,
              };
              Object.keys(fieldData).forEach(key => {
                if (fieldData[key] === undefined) delete fieldData[key];
              });
              return fieldData;
            }),
        }));
      }
      
      function collectHeadings() {
        return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
          .filter(shouldIncludeElement)
          .slice(0, 20)
          .map((heading) => ({
            level: heading.tagName,
            text: heading.textContent?.trim().slice(0, 120) || '',
            ariaLevel: heading.getAttribute('aria-level') || undefined,
          }));
      }
      
      const description = document.querySelector('meta[name="description"]')?.content || '';
      const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
      
      const snapshot = {
        url: window.location.href,
        title: document.title || '',
        description,
        canonical,
        aria: {
          tree: buildAriaTree(document.body) || null,
          interactive: collectInteractiveElements(),
          landmarks: collectLandmarks(),
        },
        links: collectLinks(),
        images: collectImages(),
        forms: collectForms(),
        headings: collectHeadings(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        },
        timestamp: new Date().toISOString(),
        totalNodes: nodeCounter.value,
      };
      
      return snapshot;
    })()
  `);
}

function formatSnapshotAsYAML(data) {
  if (!data) {
    return 'error: No snapshot data available';
  }

  const tree = data.aria?.tree;
  if (tree) {
    return renderTree(tree).join('\n');
  }

  const lines = [];
  lines.push(`url: ${data.url || 'unknown'}`);
  lines.push(`title: ${data.title || 'Untitled'}`);
  if (data.description) lines.push(`description: ${data.description}`);
  return lines.join('\n');
}

function renderTree(node, depth = 0) {
  if (!node) return [];

  const lines = [];
  const indent = '  '.repeat(depth);
  const parts = [];
  const rawRole = (node?.role || node?.tag || 'node').toString();
  const role = rawRole.toLowerCase();
  parts.push(role);

  if (node?.name && role !== 'document') {
    parts.push(`"${String(node.name)}"`);
  }

  const stateFlags = [];
  if (node?.expanded) stateFlags.push('[expanded]');
  if (node?.selected) stateFlags.push('[selected]');
  if (node?.checked) stateFlags.push('[checked]');
  if (node?.focused) stateFlags.push('[focused]');
  if (node?.disabled) stateFlags.push('[disabled]');

  const headerParts = [...parts, ...stateFlags];
  if (node?.level !== undefined) headerParts.push(`[level=${node.level}]`);

  const ref = node?.ref;
  if (ref) headerParts.push(`[ref=${ref}]`);

  const headerBody = headerParts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const children = Array.isArray(node?.children) ? node.children : [];
  const needsColon = children.length > 0 || (node?.value || node?.href);
  const header = `${indent}- ${headerBody}${needsColon ? ':' : ''}`;
  lines.push(header);

  if (node?.href) {
    lines.push(`${indent}  - /url: ${node.href}`);
  }
  if (node?.value) {
    lines.push(`${indent}  - value: ${String(node.value).slice(0, 200)}`);
  }

  for (const child of children) {
    lines.push(...renderTree(child, depth + 1));
  }

  return lines;
}

function buildRefMapFromSnapshot(snapshot) {
  const refMap = {};
  
  function traverseNode(node) {
    if (!node) return;
    
    if (node.nodeId && node.ref) {
      const refId = formatAccessibleRef(node.nodeId);
      refMap[refId] = {
        css: node.ref,
        role: node.role,
        name: node.name,
      };
    }
    
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        traverseNode(child);
      }
    }
  }
  
  if (snapshot?.aria?.tree) {
    traverseNode(snapshot.aria.tree);
  }
  
  // Add interactive elements to ref map
  if (Array.isArray(snapshot?.aria?.interactive)) {
    for (const item of snapshot.aria.interactive) {
      if (item.index !== undefined && item.ref) {
        const refId = `interactive${item.index}`;
        refMap[refId] = {
          css: item.ref,
          role: item.role,
          label: item.label,
        };
      }
    }
  }
  
  return refMap;
}

async function collectPageMetadata(webContents, snapshot, captureStartTime) {
  const captureEndTime = Date.now();
  const captureDuration = captureEndTime - captureStartTime;
  
  const metadata = {
    timestamp: new Date().toISOString(),
    captureDuration: captureDuration,
    captureStartTime: new Date(captureStartTime).toISOString(),
    totalElements: snapshot.totalNodes || 0,
    interactiveElements: snapshot.aria?.interactive?.length || 0,
    landmarks: snapshot.aria?.landmarks?.length || 0,
    forms: snapshot.forms?.length || 0,
    links: snapshot.links?.length || 0,
    images: snapshot.images?.length || 0,
    headings: snapshot.headings?.length || 0,
    viewport: snapshot.viewport,
    userAgent: await webContents.executeJavaScript('navigator.userAgent'),
    pageStats: {
      scrollWidth: await webContents.executeJavaScript('document.documentElement.scrollWidth'),
      scrollHeight: await webContents.executeJavaScript('document.documentElement.scrollHeight'),
      domContentLoaded: await webContents.executeJavaScript('window.performance?.timing?.domContentLoadedEventEnd || null'),
      loadComplete: await webContents.executeJavaScript('window.performance?.timing?.loadEventEnd || null'),
    }
  };
  
  return metadata;
}

async function captureSnapshot(webContents, options = {}) {
  const {
    win_id = 1,
  } = options;

  const image = await webContents.capturePage();
  let size = image.getSize(); // 逻辑尺寸

// 检测是否为 macOS
  if (process.platform === 'darwin') {
    // 将图片缩小到逻辑尺寸（即原始物理像素的一半）
    // resize 会返回一个新的 NativeImage 对象
    const resizedImage = image.resize({
      width: size.width,
      height: size.height,
      quality: 'better' // 可选: 'good', 'better', 'best'
    });

    // 更新数据
    var finalImage = resizedImage;
  } else {
    var finalImage = image;
  }
  const pngBuffer = finalImage.toPNG();
  // 2. 使用 Buffer 重新创建 NativeImage (确保数据完整)
  const imageToPaste = nativeImage.createFromBuffer(pngBuffer);

// 3. 写入剪贴板
  clipboard.writeImage(imageToPaste);

  const screenshotData = finalImage.toPNG().toString('base64');
  return {
    content: [
      {
        type: "text",
        text: `Size: ${size.width}x${size.height} (macOS auto-scaled)`
      },
      {
        type: "text",
        text: `Image has write to clipboard`
      },
      {
        type: "image",
        data: screenshotData,
        mimeType: "image/png"
      }
    ]
  };
}

function formatSnapshotAsJSON(snapshot, screenshotDataUri, metadata) {
  const jsonOutput = {
    snapshot: {
      metadata: metadata ? {
        timestamp: metadata.timestamp,
        captureDuration: metadata.captureDuration,
        captureStartTime: metadata.captureStartTime,
        totalElements: metadata.totalElements,
        interactiveElements: metadata.interactiveElements,
        landmarks: metadata.landmarks,
        forms: metadata.forms,
        links: metadata.links,
        images: metadata.images,
        headings: metadata.headings,
        viewport: metadata.viewport,
        userAgent: metadata.userAgent,
        pageStats: metadata.pageStats,
        screenshotError: metadata.screenshotError || undefined,
      } : undefined,
      content: {
        url: snapshot?.url || '',
        title: snapshot?.title || '',
        description: snapshot?.description || '',
        canonical: snapshot?.canonical || '',
      },
      structure: {
        aria: snapshot?.aria || {},
        links: snapshot?.links || [],
        images: snapshot?.images || [],
        forms: snapshot?.forms || [],
        headings: snapshot?.headings || [],
      },
      references: snapshot?.refMap || {},
      screenshot: screenshotDataUri || null,
      snapshotId: snapshot?.snapshotId || '',
    },
  };

  // Remove undefined metadata if not included
  if (!metadata) {
    delete jsonOutput.snapshot.metadata;
  }

  return JSON.stringify(jsonOutput, null, 2);
}

function buildSnapshotText(snapshot, status = '', details = [], outputFormat = 'yaml', screenshotDataUri = null, metadata = null) {
  const normalizedDetails = (details || []).filter(Boolean);
  const detailLines = normalizedDetails.map((line) => (line.startsWith('- ') ? line : `- ${line}`));
  const detailBlock = detailLines.length ? `${detailLines.join('\n')}\n` : '';

  const pageUrl = snapshot?.url || 'unknown';
  const pageTitle = snapshot?.title || 'Untitled';

  const statusLine = status ? `${status}\n` : '';

  if (outputFormat === 'json') {
    const jsonContent = formatSnapshotAsJSON(snapshot, screenshotDataUri, metadata);
    return (
      `${statusLine}` +
      `${detailBlock}` +
      `- Page URL: ${pageUrl}\n` +
      `- Page Title: ${pageTitle}\n` +
      `- Page Snapshot (JSON format)\n` +
      '```json\n' +
      `${jsonContent}\n` +
      '```'
    );
  } else if (outputFormat === 'both') {
    const yaml = formatSnapshotAsYAML(snapshot);
    const jsonContent = formatSnapshotAsJSON(snapshot, screenshotDataUri, metadata);
    return (
      `${statusLine}` +
      `${detailBlock}` +
      `- Page URL: ${pageUrl}\n` +
      `- Page Title: ${pageTitle}\n` +
      `- Page Snapshot (YAML format)\n` +
      '```yaml\n' +
      `${yaml}\n` +
      '```\n\n' +
      `- Page Snapshot (JSON format)\n` +
      '```json\n' +
      `${jsonContent}\n` +
      '```'
    );
  } else {
    // Default to YAML format
    const yaml = formatSnapshotAsYAML(snapshot);
    return (
      `${statusLine}` +
      `${detailBlock}` +
      `- Page URL: ${pageUrl}\n` +
      `- Page Title: ${pageTitle}\n` +
      `- Page Snapshot\n` +
      '```yaml\n' +
      `${yaml}\n` +
      '```'
    );
  }
}

module.exports = {
  captureSnapshot,
  buildSnapshotText,
  formatSnapshotAsYAML,
  getSnapshotLimits,
};
