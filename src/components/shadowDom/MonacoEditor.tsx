import type * as m from 'monaco-editor';
import loader from '@monaco-editor/loader';
import { emmetCSS, emmetHTML } from 'emmet-monaco-es';
import type { MonacoTailwindcss } from 'monaco-tailwindcss';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

export const MonacoContext = createContext<{
  monaco: typeof m | null;
  tailwindcss: MonacoTailwindcss | null;
  tailwindEnabled: boolean;
  setTailwindEnabled: (enabled: boolean) => void;
  classList: string[];
  setClassList: (classList: string[]) => void;
}>({
  monaco: null,
  tailwindcss: null,
  tailwindEnabled: false,
  setTailwindEnabled: () => {},
  classList: [],
  setClassList: () => {},
});

export function MonacoProvider({ children }: { children: React.ReactNode }) {
  const [monaco, setMonaco] = useState<typeof m | null>(null);
  const [tailwindcss, setTailwindcss] = useState<MonacoTailwindcss | null>(
    null,
  );
  const [tailwindEnabled, _setTailwindEnabled] = useState(false);
  const [hasEnabledTailwind, setHasEnabledTailwind] = useState(false);
  const classListRef = useRef<string[]>([]);
  const [classList, _setClassList] = useState<string[]>([]);

  function setClassList(classList: string[]) {
    classListRef.current = classList;
    _setClassList(classList);
  }

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
            return NewWorker('/esm/vs/editor/editor.worker.js');
          case 'css':
            return NewWorker('/esm/vs/language/css/css.worker.js');
          case 'html':
            return NewWorker('/esm/vs/language/html/html.worker.js');
          case 'tailwindcss':
            return NewWorker('/tailwindcss.worker.js');
          default:
            throw new Error(`Unknown worker label: ${label}`);
        }
      },
    };

    loader.config({
      paths: {
        vs: new URL('/min/vs', import.meta.url).href,
      },
    });

    loader.init().then(async monaco => {
      setMonaco(monaco);
      emmetCSS(monaco);
      emmetHTML(monaco);

      monaco.languages.registerCompletionItemProvider('css', {
        provideCompletionItems(model, position, _context, _token) {
          function getImmediateRulesetSelector() {
            const text = model.getValueInRange({
              startLineNumber: 0,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            });

            let paren = 0;
            let firstParenIndex = -1;
            let lastParenIndex = -1;

            for (let i = text.length - 1; i >= 0; i--) {
              if (text[i] === '}') {
                paren--;
              } else if (text[i] === '{') {
                paren++;

                if (paren === 1) {
                  lastParenIndex = i;
                  continue;
                }
              }

              if (lastParenIndex !== -1 && paren !== 1) {
                firstParenIndex = i;
                break;
              }
            }

            if (firstParenIndex === -1 && lastParenIndex === -1) {
              return '';
            }

            return text.slice(firstParenIndex + 1, lastParenIndex).trim();
          }

          function isWithinRulesetDefinition() {
            const selector = getImmediateRulesetSelector();

            const exceptAtRules = [
              '@container',
              '@layer',
              '@media',
              '@scope',
              '@supports',
            ];

            return (
              selector.length > 0 &&
              !exceptAtRules.some(rule => selector.startsWith(rule))
            );
          }

          if (isWithinRulesetDefinition()) return;

          const suggestions =
            classListRef.current.map<m.languages.CompletionItem>(className => ({
              label: `.${className}`,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: `.${className}`,
              range: new monaco.Range(
                position.lineNumber,
                position.column - 1,
                position.lineNumber,
                position.column,
              ),
            }));

          return { suggestions };
        },
      });
    });
  }, []);

  useEffect(() => {
    if (!monaco || hasEnabledTailwind) return;
    setHasEnabledTailwind(true);
    // Sometimes, `tailwindEnabled` is set to true before `monaco` is loaded.
    if (tailwindEnabled && !tailwindcss) {
      setTailwindEnabled(true);
    }
  }, [monaco, tailwindEnabled, tailwindcss]);

  async function setTailwindEnabled(enabled: boolean) {
    _setTailwindEnabled(enabled);
    if (!monaco) return;
    if (enabled) {
      setHasEnabledTailwind(true);
      const { configureMonacoTailwindcss } = await import('monaco-tailwindcss');

      // It appears that `tailwindcssData` is automatically loaded.

      const mtw = configureMonacoTailwindcss(monaco);
      setTailwindcss(mtw);
    } else {
      setTailwindcss(null);
      monaco.languages.css.cssDefaults.setOptions({});
      if (tailwindcss) tailwindcss?.dispose();
    }
  }

  return (
    <MonacoContext.Provider
      value={{
        monaco,
        tailwindcss,
        tailwindEnabled,
        setTailwindEnabled,
        classList,
        setClassList,
      }}
    >
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
  const { monaco, tailwindEnabled } = useContext(MonacoContext);

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

  useEffect(() => {
    if (!monaco || !editorRef.current || tailwindEnabled) return;

    // Remove all existing decorations
    const model = editorRef.current.getModel();
    if (!model) return;

    const decorations = model.getAllDecorations();
    editorRef.current.removeDecorations(decorations.map(d => d.id));
  }, [monaco, tailwindEnabled]);

  return <div ref={divRef} style={{ height: '100%' }} />;
}
