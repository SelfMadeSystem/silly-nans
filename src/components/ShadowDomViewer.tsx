import { CSS_PRELUDE } from './ShadowDomConsts';
import type { ExportData } from './ShadowDomCreator';
import { useEffect, useRef } from 'react';

export function ShadowDomViewer({ css, html, properties }: ExportData) {
  const previewRef = useRef<HTMLDivElement>(null);
  const shadowRoot = useRef<ShadowRoot | null>(null);

  useEffect(() => {
    if (!previewRef.current) {
      return;
    }

    // Register all CSS properties
    properties.forEach(p => {
      try {
        CSS.registerProperty(p);
      } catch (e) {
        // Ignore `InvalidModificationError: Failed to execute 'registerProperty' on 'CSS': The name provided has already been registered`
        if (
          typeof e !== 'object' ||
          !e ||
          !('name' in e) ||
          e.name !== 'InvalidModificationError'
        ) {
          console.error(e);
        }
      }
    });

    // Time to render the shadow DOM

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
  }, [css, html, properties]);

  return (
    <div
      className="isolate flex h-[calc(100vh-8em)] items-center justify-center overflow-hidden"
      ref={previewRef}
    ></div>
  );
}
