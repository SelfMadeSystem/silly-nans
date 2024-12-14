import type { ExportData } from './ShadowDomCreator';
import dompurify from 'dompurify';
import postcss from 'postcss';
import safe from 'postcss-safe-parser';

function sanitizeHtml(html: string) {
  const purify = dompurify();
  
  // Remove links from style attributes
  purify.addHook('afterSanitizeAttributes', node => {
    if (node.hasAttribute('style')) {
      node.setAttribute(
        'style',
        node.getAttribute('style')!.replace(/url\([^)]+\)/g, ''),
      );
    }
  });
  return purify.sanitize(html, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    FORBID_ATTR: ['href', 'src', 'xlink:href'],
  });
}

function sanitizePropertyName(name: string) {
  return name.replace(/[^a-zA-Z0-9-]/g, '_');
}

function sanitizeProperties(properties: unknown[]): PropertyDefinition[] {
  return properties.map(property => {
    if (typeof property !== 'object') {
      throw new Error('Invalid property');
    }
    if (!property) {
      throw new Error('Invalid property');
    }
    if (
      !('name' in property) ||
      !('syntax' in property) ||
      !('initialValue' in property) ||
      !('inherits' in property)
    ) {
      throw new Error('Invalid property format');
    }
    if (
      typeof property.name !== 'string' ||
      typeof property.syntax !== 'string' ||
      typeof property.initialValue !== 'string' ||
      typeof property.inherits !== 'boolean'
    ) {
      throw new Error('Invalid property format');
    }
    return {
      name: sanitizePropertyName(property.name),
      syntax: property.syntax,
      initialValue: property.initialValue,
      inherits: property.inherits,
    };
  });
}

export async function sanitize(data: unknown): Promise<ExportData> {
  if (typeof data !== 'object') {
    throw new Error('Invalid data type');
  }
  if (!data) {
    throw new Error('Invalid data');
  }
  if (!('html' in data) || !('css' in data) || !('properties' in data)) {
    throw new Error('Invalid data format');
  }
  if (typeof data.html !== 'string' || typeof data.css !== 'string') {
    throw new Error('Invalid data format');
  }
  if (!Array.isArray(data.properties)) {
    throw new Error('Invalid data format');
  }

  const sanitizedHtml = sanitizeHtml(data.html);
  const sanitizedCss = sanitizeCss(data.css);
  const sanitizedProperties = sanitizeProperties(data.properties);
  return {
    html: sanitizedHtml,
    css: sanitizedCss,
    properties: sanitizedProperties,
  };
}

function removeImport(root: postcss.Root) {
  root.walkAtRules('import', rule => {
    rule.remove();
  });
}

function removeProperties(root: postcss.Root) {
  root.walkAtRules('property', rule => {
    rule.remove();
  });
}
function removeLinks(root: postcss.Root) {
  // Match external resource patterns
  const externalUrlPattern = /(http|https|:\/\/)/i;

  root.walkDecls(decl => {
    // Check if declaration contains url()
    if (decl.value.includes('url(')) {
      // If URL is external, remove the entire declaration
      if (externalUrlPattern.test(decl.value)) {
        decl.remove();
      }
    }

    // Remove other common external resource properties
    if (
      decl.prop === 'src' ||
      decl.prop === 'background-image' ||
      decl.prop === '@import' ||
      decl.prop === '@font-face'
    ) {
      if (externalUrlPattern.test(decl.value)) {
        decl.remove();
      }
    }
  });
}

export function sanitizeCss(css: string) {
  try {
    const root = postcss().process(css, { parser: safe }).root;
    removeImport(root);
    removeProperties(root);
    removeLinks(root);
    return root.toString();
  } catch (e) {
    console.error(e);
    return '';
  }
}
