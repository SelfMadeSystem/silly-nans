import { MonacoContext, MonacoEditor } from './MonacoEditor';
import {
  DEFAULT_CSS,
  DEFAULT_HTML,
  PRESETS,
  type Preset,
} from './ShadowDomConsts';
import { type ExportData, ShadowDomCreator } from './ShadowDomCreator';
import classNames from 'classnames';
import { useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

/**
 * Gets all the class names used in the given HTML string.
 */
function getClassNames(html: string) {
  const classRegex = /class="([^"]+)"/g;
  const classes = new Set<string>();
  let match;
  while ((match = classRegex.exec(html))) {
    match[1].split(' ').forEach(c => classes.add(c));
  }
  return Array.from(classes);
}

/**
 * Checks if the given HTML string is an SVG. Does so by checking if the string
 * starts and ends with an SVG tag.
 */
function checkIfSvg(html: string) {
  return html.trim().startsWith('<svg') && html.trim().endsWith('</svg>');
}

/**
 * Generates a wrangler command to set a key-value pair in a KV namespace.
 * @param key - The key name.
 * @param json - The JSON string to store.
 * @returns The wrangler command as a string.
 */
function generateWranglerCommand(key: string, json: string): string {
  const NAMESPACE_ID = '09fc70eb28e042399286b0f4ff3c9a9b';
  const sanatizedJson = json.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `wrangler kv:key put --namespace-id=${NAMESPACE_ID} ${key} "${sanatizedJson}"`;
}

export default function ShadowDomEditor() {
  const { tailwindEnabled, setTailwindEnabled, setClassList } =
    useContext(MonacoContext);
  const [rewriting, setRewriting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);
  const [copiedBase64, setCopiedBase64] = useState(false);
  const [data, setData] = useState<ExportData | undefined>(undefined);
  const [html, setHtml] = useState<string | undefined>(DEFAULT_HTML);
  const [css, setCss] = useState<string | undefined>(DEFAULT_CSS);
  const [runScripts, setRunScripts] = useState(false);
  const [showCssEditor, setShowCssEditor] = useState(true);
  const isSvg = checkIfSvg(html ?? '');

  useEffect(() => {
    setClassList(getClassNames(html ?? ''));
  }, [html]);

  const [selectedPreset, setSelectedPreset] = useState<Preset | undefined>();

  function saveToStorage() {
    const data = { html, css, tailwind: tailwindEnabled };
    localStorage.setItem('shadowDomData', JSON.stringify(data));
    toast.success('Saved to local storage!');
  }

  function clearStorage() {
    localStorage.removeItem('shadowDomData');
    setHtml(DEFAULT_HTML);
    setCss(DEFAULT_CSS);
    setTailwindEnabled(false);
    toast.success('Cleared local storage!');
  }

  useEffect(() => {
    const ctrlS = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();

        saveToStorage();
      }
    };

    const controller = new AbortController();

    document.addEventListener('keydown', ctrlS, { signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [html, css, tailwindEnabled]);

  useEffect(() => {
    const NAN_URL = 'https://nan.shoghisimon.ca?id=';
    const urlParams = new URLSearchParams(window.location.search);
    const idName = urlParams.get('id');
    if (idName) {
      fetch(`${NAN_URL}${idName}`)
        .then(response => response.json())
        .then(data => {
          setHtml(data.html);
          setCss(data.ogCss ?? data.css);
          setSelectedPreset(data.preset);
          if ('tailwind' in data) {
            setTailwindEnabled(!!data.tailwind);
          }
        })
        .catch(error => {
          console.error('Error fetching data:', error);
        });
    } else {
      const localData = localStorage.getItem('shadowDomData');
      if (localData) {
        const parsedData = JSON.parse(localData);
        setHtml(parsedData.html);
        setCss(parsedData.css);
        if ('tailwind' in parsedData) {
          setTailwindEnabled(!!parsedData.tailwind);
        }
      }
    }
  }, []);

  const handlePresetChange = (preset: Preset) => {
    setHtml(preset.html);
    setCss(preset.css);
    setSelectedPreset(preset);
    if (preset.tailwind !== undefined) {
      setTailwindEnabled(preset.tailwind);
    }
  };

  const minifySvg = (svg: string) => {
    return svg
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/<!--.*?-->/g, '');
  };

  const toBase64 = () => {
    const content = html ?? '';
    const minifiedContent = isSvg ? minifySvg(content) : content;
    const prefix = isSvg
      ? 'data:image/svg+xml;base64,'
      : 'data:text/html;base64,';
    return prefix + window.btoa(minifiedContent);
  };

  const rewriteCssWithDelay = (css: string, delay: number) => {
    setRewriting(true);
    const parts = css.match(/\S+|\s+|[:\-]+/g) || [];
    let index = 0;
    setCss('');

    const intervalId = setInterval(() => {
      setCss(prevCss => {
        if (index < parts.length) {
          const updatedCss = prevCss + parts[index];
          index++;
          return updatedCss;
        } else {
          clearInterval(intervalId);
          setRewriting(false);
          return prevCss;
        }
      });
    }, delay);
  };

  return (
    <div className="mx-auto flex flex-col justify-center gap-4 text-white">
      <div className="mx-auto flex w-fit max-w-3xl flex-row flex-wrap gap-8">
        <button
          className="mx-auto block w-20 rounded-xs bg-blue-500 py-2 text-white"
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(data));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          className="mx-auto block w-32 rounded-xs bg-blue-500 py-2 text-white"
          onClick={() => {
            const id = (
              window.prompt('Enter a unique ID for the data:') ?? ''
            ).trim();
            if (!id) {
              window.alert('No ID provided.');
              return;
            }
            navigator.clipboard.writeText(
              generateWranglerCommand(id, JSON.stringify(data)),
            );
            setCopiedCli(true);
            setTimeout(() => setCopiedCli(false), 2000);
          }}
        >
          {copiedCli ? 'Copied!' : 'Copy CLI'}
        </button>
        <button
          className="mx-auto block w-32 rounded-xs bg-blue-500 py-2 text-white"
          onClick={() => {
            navigator.clipboard.writeText(html ?? '');
            setCopiedHtml(true);
            setTimeout(() => setCopiedHtml(false), 2000);
          }}
        >
          {copiedHtml ? 'Copied!' : 'Copy HTML'}
        </button>
        <button
          className="mx-auto block w-28 rounded-xs bg-blue-500 py-2 text-white"
          onClick={() => {
            navigator.clipboard.writeText(css ?? '');
            setCopiedCss(true);
            setTimeout(() => setCopiedCss(false), 2000);
          }}
        >
          {copiedCss ? 'Copied!' : 'Copy CSS'}
        </button>
        <button
          className="mx-auto block w-32 rounded-xs bg-blue-500 py-2 text-white"
          onClick={() => {
            navigator.clipboard.writeText(toBase64());
            setCopiedBase64(true);
            setTimeout(() => setCopiedBase64(false), 2000);
          }}
        >
          {copiedBase64 ? 'Copied!' : 'Copy Base64'}
        </button>
        <button
          className="mx-auto block rounded-xs bg-blue-500 px-4 py-2 text-white"
          onClick={() => rewriteCssWithDelay(css ?? '', 50)}
        >
          Rewrite CSS
        </button>
        <select
          value={selectedPreset?.name ?? ''}
          onChange={e => {
            const preset = PRESETS.find(p => p.name === e.target.value);
            if (preset) handlePresetChange(preset);
          }}
          className="mx-auto block rounded-xs border-2 border-blue-500 bg-transparent px-4 py-2 text-white outline-hidden"
        >
          <option value="" className="hidden">
            Presets
          </option>
          {PRESETS.map(preset => (
            <option
              key={preset.name}
              value={preset.name}
              className="bg-slate-900 text-white"
            >
              {preset.name}
            </option>
          ))}
        </select>
        <button
          className="mx-auto block w-32 rounded-xs bg-blue-500 py-2 text-white"
          onClick={() => setRunScripts(!runScripts)}
        >
          {runScripts ? "Run't scripts" : 'Run scripts'}
        </button>
        <button
          className="mx-auto block w-48 rounded-xs bg-blue-500 py-2 text-white"
          onClick={() => setTailwindEnabled(!tailwindEnabled)}
        >
          {tailwindEnabled ? 'Disable Tailwind' : 'Enable Tailwind'}
        </button>
        <button
          className="mx-auto block w-32 rounded-xs bg-blue-500 py-2 text-white"
          onClick={saveToStorage}
        >
          Save
        </button>
        <button
          className="mx-auto block w-32 rounded-xs bg-blue-500 py-2 text-white"
          onClick={clearStorage}
        >
          Clear
        </button>
      </div>
      <p className="mx-auto mt-5 max-w-3xl text-center">
        This is a demo of a CSS Shadow DOM. It supports the{' '}
        <code>@property</code> rule via the use of a custom-made PostCSS plugin.
        Compatible with <a href="https://uiverse.io">uiverse</a> elements.
      </p>
      <div className="flex h-[calc(100vh-8em)] min-h-64 w-full flex-row items-stretch">
        <div className="w-1/2 shrink-0 resize overflow-auto border">
          <ShadowDomCreator
            rewriting={rewriting}
            css={css ?? ''}
            html={html ?? ''}
            runScripts={runScripts}
            setExportData={setData}
          />
        </div>
        <div className="relative h-full w-full">
          <div className="absolute inset-0 flex flex-col">
            <div className="flex w-full flex-row justify-stretch">
              <button
                className={classNames(
                  'grow border border-gray-500 p-1 text-white',
                  !showCssEditor && 'bg-blue-800',
                )}
                onClick={() => setShowCssEditor(false)}
              >
                Show HTML Editor
              </button>
              <button
                className={classNames(
                  'grow border border-gray-500 p-1 text-white',
                  showCssEditor && 'bg-blue-800',
                )}
                onClick={() => setShowCssEditor(true)}
              >
                Show CSS Editor
              </button>
            </div>
            <div className={showCssEditor ? 'grow' : 'hidden'}>
              <MonacoEditor
                language="css"
                readOnly={rewriting}
                value={css ?? ''}
                onChange={value => setCss(value)}
              />
            </div>
            <div className={showCssEditor ? 'hidden' : 'grow'}>
              <MonacoEditor
                language="html"
                readOnly={rewriting}
                value={html ?? ''}
                onChange={value => setHtml(value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
