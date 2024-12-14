import postcss from 'postcss';
import { useEffect, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { CSS_PRELUDE } from './ShadowDomConsts';

/**
 * Finds all registered CSS properties in a PostCSS root.
 *
 * Registered CSS properties are defined using the `@property` rule.
 */
function findCssProperties(root: postcss.Root): PropertyDefinition[] {
  const properties: PropertyDefinition[] = [];
  root.walkAtRules('property', rule => {
    const property = {
      name: rule.params,
      syntax: '',
      inherits: false,
      initialValue: '',
    };
    rule.walkDecls(decl => {
      switch (decl.prop) {
        case 'syntax':
          // syntax should always be in quotes. If it is, remove the quotes
          property.syntax = decl.value.replace(/['"]+/g, '');
          break;
        case 'inherits':
          property.inherits = decl.value === 'true';
          break;
        case 'initial-value':
          property.initialValue = decl.value;
          break;
      }
    });
    properties.push(property);
  });
  return properties;
}

/**
 * Removes all registered CSS properties from a PostCSS root.
 *
 * @returns The resulting CSS string.
 */
function removeCssProperties(root: postcss.Root) {
  root.walkAtRules('property', rule => {
    rule.remove();
  });
}

/**
 * Replaces all instances of a CSS properties with other properties in a PostCSS
 * root.
 */
function replaceCssProperty(
  root: postcss.Root,
  replacements: [string, string][],
) {
  root.walkDecls(decl => {
    replacements.forEach(([oldProperty, newProperty]) => {
      decl.prop = decl.prop.replace(new RegExp(oldProperty, 'g'), newProperty);
      decl.value = decl.value.replace(
        new RegExp(oldProperty, 'g'),
        newProperty,
      );
    });
  });
}

/**
 * Replaces all instances of a CSS property in an HTML string with another
 * property name.
 */
function replaceHtmlProperty(
  html: string,
  oldProperty: string,
  newProperty: string,
) {
  return html.replace(new RegExp(oldProperty, 'g'), newProperty);
}

/**
 * Sanatizes a string so it can be used as a CSS property name.
 */
function sanitizePropertyName(name: string) {
  return name.replace(/[^a-zA-Z0-9-]/g, '_');
}

export type ExportData = {
  css: string;
  html: string;
  properties: PropertyDefinition[];
};

export function ShadowDomCreator({
  rewriting,
  css,
  html,
  setExportData,
}: {
  rewriting: boolean;
  css: string;
  html: string;
  setExportData: (data: ExportData) => void;
}) {
  const previewRef = useRef<HTMLDivElement>(null);
  const shadowRoot = useRef<ShadowRoot | null>(null);

  useEffect(() => {
    if (!previewRef.current) {
      return;
    }

    function renderDom(html: string, css: string) {
      if (!previewRef.current) {
        return;
      }
      // Create the shadow root if it doesn't exist
      if (!shadowRoot.current) {
        shadowRoot.current = previewRef.current.attachShadow({ mode: 'open' });
      }

      // Create a style element and append it to the shadow root
      const style = document.createElement('style');
      style.textContent = CSS_PRELUDE + css;
      shadowRoot.current.innerHTML = '';
      shadowRoot.current.appendChild(style);
      shadowRoot.current.innerHTML += html;
    }

    if (rewriting) {
      // Don't let PostCSS parse the CSS if we're still rewriting it
      renderDom(html, css);
      return;
    }

    try {
      const postcssRoot = postcss.parse(css);
      const cssProperties = findCssProperties(postcssRoot);
      const ids = cssProperties.map(
        ({ name, inherits, initialValue, syntax }) =>
          sanitizePropertyName(
            `--${uuid()}-${name}-${initialValue}-${syntax}-${inherits}`,
          ),
      );

      const replacedCssProperties = cssProperties.map((property, i) => ({
        ...property,
        name: ids[i],
      }));

      // Register all CSS properties
      replacedCssProperties.forEach(CSS.registerProperty);

      // Replace all CSS properties in the HTML string with the generated
      // property names
      let replacedHtml = html;
      cssProperties.forEach((property, i) => {
        replacedHtml = replaceHtmlProperty(replacedHtml, property.name, ids[i]);
      });

      // Replace all CSS properties in the CSS string with the generated
      // property names
      removeCssProperties(postcssRoot);
      replaceCssProperty(
        postcssRoot,
        cssProperties.map((p, i) => [p.name, ids[i]]),
      );
      const replacedCss = postcssRoot.toString();

      // Time to render the shadow DOM
      renderDom(replacedHtml, replacedCss);

      setExportData({
        css: replacedCss,
        html: replacedHtml,
        properties: replacedCssProperties,
      });
    } catch (e) {
      // If there's an error, just render the DOM with the original CSS
      renderDom(html, css);
    }
  }, [css, html, setExportData]);

  return (
    <div
      className="isolate h-[calc(100vh-8em)] overflow-hidden flex justify-center items-center"
      ref={previewRef}
    ></div>
  );
}
