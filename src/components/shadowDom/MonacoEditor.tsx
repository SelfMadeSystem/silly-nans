import type * as m from 'monaco-editor';
import loader from '@monaco-editor/loader';
import { emmetCSS, emmetHTML } from 'emmet-monaco-es';
import editorUrl from 'monaco-editor/esm/vs/editor/editor.worker.js?url';
import cssUrl from 'monaco-editor/esm/vs/language/css/css.worker.js?url';
import htmlUrl from 'monaco-editor/esm/vs/language/html/html.worker.js?url';
import tailwindUrl from 'monaco-tailwindcss/tailwindcss.worker.js?url';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

const MonacoContext = createContext<{
  monaco: typeof m | null;
}>({
  monaco: null,
});

export function MonacoProvider({ children }: { children: React.ReactNode }) {
  const [monaco, setMonaco] = useState<typeof m | null>(null);

  useEffect(() => {
    function NewWorker(url: string) {
      const worker = new Worker(new URL(url, import.meta.url).href, {
        type: 'module',
      });

      if (url.includes('tailwindcss')) {
        worker.addEventListener('error', e => {
          console.error(`Worker error: ${url}`, e);
        });
        worker.addEventListener('message', e => {
          console.log(`Worker message: ${url}`, e.data);
        });
        worker.addEventListener('messageerror', e => {
          console.error(`Worker message error: ${url}`, e);
        });
      }

      return worker;
    }

    window.MonacoEnvironment = {
      getWorker(_workerId, label) {
        switch (label) {
          case 'editorWorkerService':
            return NewWorker(editorUrl);
          case 'css':
            return NewWorker(cssUrl);
          case 'html':
            return NewWorker(htmlUrl);
          case 'tailwindcss':
            return NewWorker('/tailwindcss.worker.js');
          default:
            throw new Error(`Unknown worker label: ${label}`);
        }
      },
    };

    loader.config({
      paths: {
        vs: 'http://localhost:4321/node_modules/monaco-editor/min/vs',
      },
    });

    loader.init().then(async monaco => {
      setMonaco(monaco);
      emmetCSS(monaco);
      emmetHTML(monaco);

      return; // no tailwindcss for now
      monaco.languages.css.cssDefaults.setOptions({
        data: {
          dataProviders: {
            twAtRules: {
              version: 1.1,
              atDirectives: [
                {
                  name: '@tailwind',
                  description: {
                    kind: 'markdown',
                    value:
                      'Use the `@tailwind` directive to insert Tailwind’s `base`, `components`, `utilities` and `variants` styles into your CSS.',
                  },
                },
                {
                  name: '@layer',
                  description: {
                    kind: 'markdown',
                    value:
                      'Use the `@layer` directive to tell Tailwind which “bucket” a set of custom styles belong to. Valid layers are `base`, `components`, and `utilities`.',
                  },
                },
                {
                  name: '@apply',
                  description: {
                    kind: 'markdown',
                    value:
                      'Use `@apply` to inline any existing utility classes into your own custom CSS.',
                  },
                },
              ],
            },
          },
        },
      });

      const { configureMonacoTailwindcss } = await import('monaco-tailwindcss');
      configureMonacoTailwindcss(monaco);
    });
  }, []);

  return (
    <MonacoContext.Provider value={{ monaco }}>
      {children}
    </MonacoContext.Provider>
  );
}

export function MonacoEditor({
  value,
  onChange,
  language,
  readOnly,
}: {
  value: string;
  onChange: (value: string) => void;
  language: string;
  readOnly?: boolean;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<m.editor.IStandaloneCodeEditor | null>(null);
  const { monaco } = useContext(MonacoContext);

  useEffect(() => {
    console.log('MonacoEditor', { monaco, value, language, readOnly });
    if (!monaco) return;

    editorRef.current = monaco.editor.create(divRef.current!, {
      value,
      language,
      readOnly,
      automaticLayout: true,
      theme: 'vs-dark',
    });

    editorRef.current.onDidChangeModelContent(() => {
      onChange(editorRef.current!.getValue());
    });

    return () => {
      editorRef.current?.dispose();
    };
  }, [monaco]);

  return <div ref={divRef} style={{ height: '100%' }} />;
}
