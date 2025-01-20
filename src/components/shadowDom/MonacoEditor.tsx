import type * as m from 'monaco-editor';
import loader from '@monaco-editor/loader';
import { emmetCSS, emmetHTML } from 'emmet-monaco-es';
import editorUrl from 'monaco-editor/esm/vs/editor/editor.worker.js?url';
import cssUrl from 'monaco-editor/esm/vs/language/css/css.worker.js?url';
import htmlUrl from 'monaco-editor/esm/vs/language/html/html.worker.js?url';
import type { MonacoTailwindcss } from 'monaco-tailwindcss';
import tailwindUrl from 'monaco-tailwindcss/tailwindcss.worker.js?url';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

export const MonacoContext = createContext<{
  monaco: typeof m | null;
  tailwindcss: MonacoTailwindcss | null;
}>({
  monaco: null,
  tailwindcss: null,
});

export function MonacoProvider({ children }: { children: React.ReactNode }) {
  const [monaco, setMonaco] = useState<typeof m | null>(null);
  const [monacoTailwindcss, setMonacoTailwindcss] =
    useState<MonacoTailwindcss | null>(null);

  useEffect(() => {
    function NewWorker(url: string) {
      const worker = new Worker(new URL(url, import.meta.url).href, {
        type: 'module',
      });

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
            return NewWorker(tailwindUrl);
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

      const { configureMonacoTailwindcss, tailwindcssData } = await import(
        'monaco-tailwindcss'
      );

      monaco.languages.css.cssDefaults.setOptions({
        data: {
          dataProviders: {
            tailwindcssData,
            atProperty: {
              version: 1.1,
              properties: [
                {
                  name: '@property',
                  description: {
                    kind: 'markdown',
                    value:
                      'The `@property` rule represents a custom property registration directly in a stylesheet',
                  },
                },
              ],
            },
          },
        },
      });

      // @ts-expect-error the types are (slightly) wrong
      const mtw = configureMonacoTailwindcss(monaco);
      setMonacoTailwindcss(mtw);
    });
  }, []);

  return (
    <MonacoContext.Provider value={{ monaco, tailwindcss: monacoTailwindcss }}>
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
    if (!monaco) return;

    editorRef.current = monaco.editor.create(divRef.current!, {
      value,
      language,
      readOnly,
      automaticLayout: true,
      wordWrap: 'on',
      theme: 'vs-dark',
    });

    editorRef.current.onDidChangeModelContent(() => {
      onChange(editorRef.current!.getValue());
    });

    return () => {
      editorRef.current?.dispose();
    };
  }, [monaco]);

  useEffect(() => {
    if (!monaco || !editorRef.current) return;

    if (value !== editorRef.current.getValue()) {
      editorRef.current.setValue(value);
    }
  }, [monaco, value]);

  return <div ref={divRef} style={{ height: '100%' }} />;
}
