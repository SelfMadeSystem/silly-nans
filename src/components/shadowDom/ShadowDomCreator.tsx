import { CSS_PRELUDE } from './ShadowDomConsts';
import postcss from 'postcss';
import safe from 'postcss-safe-parser';
import { useEffect, useRef } from 'react';

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
 * Creates a regex pattern that matches a CSS property name.
 */
function createPropertyPattern(name: string) {
  return new RegExp(`(?<=[^a-zA-Z0-9]|^)${name}(?=[^a-zA-Z0-9]|$)`, 'g');
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
      const pattern = createPropertyPattern(oldProperty);
      decl.prop = decl.prop.replace(pattern, newProperty);
      decl.value = decl.value.replace(pattern, newProperty);
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
  return html.replace(createPropertyPattern(oldProperty), newProperty);
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
      const postcssRoot = postcss().process(css, { parser: safe }).root;
      const cssProperties = findCssProperties(postcssRoot);
      const ids = cssProperties.map(
        ({ name, inherits, initialValue, syntax }) => {
          // Don't need to make a random ID for the property name since, even if
          // there are duplicate property names, if they have different syntax
          // or initial values, they are considered different properties.
          // Furthermore, it doesn't matter if the property is shared between
          // different components since the property name is scoped to the
          // component.
          // Don't need the -- prefix for the property name
          const smolName = name.slice(2);
          return sanitizePropertyName(
            `--${smolName}-${initialValue}-${syntax}-${inherits}`,
          );
        },
      );

      const replacedCssProperties = cssProperties.map((property, i) => ({
        ...property,
        name: ids[i],
      }));

      // Register all CSS properties
      replacedCssProperties.forEach(p => {
        try {
          CSS.registerProperty(p);
        } catch (e) {
          console.error(p, e);
          throw new Error('Failed to register CSS property');
        }
      });

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
      className="isolate flex h-full w-full transform-cpu items-center justify-center overflow-hidden"
      ref={previewRef}
    ></div>
  );
}
