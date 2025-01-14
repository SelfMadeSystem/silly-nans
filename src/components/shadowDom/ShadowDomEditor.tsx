import {
  DEFAULT_CSS,
  DEFAULT_HTML,
  PRESETS,
  type Preset,
} from './ShadowDomConsts';
import { type ExportData, ShadowDomCreator } from './ShadowDomCreator';
import Editor from '@monaco-editor/react';
import { useEffect, useState } from 'react';

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

  const [selectedPreset, setSelectedPreset] = useState<Preset | undefined>();

  useEffect(() => {
    const URL = 'https://nan.shoghisimon.ca?id=';
    const urlParams = new URLSearchParams(window.location.search);
    const idName = urlParams.get('id');
    if (idName) {
      fetch(`${URL}${idName}`)
        .then(response => response.json())
        .then(data => {
          setHtml(data.html);
          setCss(data.css);
          setSelectedPreset(data.preset);
        })
        .catch(error => {
          console.error('Error fetching data:', error);
        });
    }
  }, []);

  const handlePresetChange = (preset: Preset) => {
    setHtml(preset.html);
    setCss(preset.css);
    setSelectedPreset(preset);
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
          className="mx-auto block w-20 rounded bg-blue-500 py-2 text-white"
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(data));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          className="mx-auto block w-32 rounded bg-blue-500 py-2 text-white"
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
          className="mx-auto block w-32 rounded bg-blue-500 py-2 text-white"
          onClick={() => {
            navigator.clipboard.writeText(html ?? '');
            setCopiedHtml(true);
            setTimeout(() => setCopiedHtml(false), 2000);
          }}
        >
          {copiedHtml ? 'Copied!' : 'Copy HTML'}
        </button>
        <button
          className="mx-auto block w-28 rounded bg-blue-500 py-2 text-white"
          onClick={() => {
            navigator.clipboard.writeText(css ?? '');
            setCopiedCss(true);
            setTimeout(() => setCopiedCss(false), 2000);
          }}
        >
          {copiedCss ? 'Copied!' : 'Copy CSS'}
        </button>
        <button
          className="mx-auto block w-32 rounded bg-blue-500 py-2 text-white"
          onClick={() => {
            navigator.clipboard.writeText(toBase64());
            setCopiedBase64(true);
            setTimeout(() => setCopiedBase64(false), 2000);
          }}
        >
          {copiedBase64 ? 'Copied!' : 'Copy Base64'}
        </button>
        <button
          className="mx-auto block rounded bg-blue-500 px-4 py-2 text-white"
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
          className="mx-auto block rounded border-2 border-blue-500 bg-transparent px-4 py-2 text-white outline-none"
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
          className="mx-auto block w-32 rounded bg-blue-500 py-2 text-white"
          onClick={() => setRunScripts(!runScripts)}
        >
          {runScripts ? "Run't scripts" : 'Run scripts'}
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
            <button
              className="border border-gray-500 p-1 text-white"
              onClick={() => setShowCssEditor(!showCssEditor)}
            >
              {showCssEditor ? 'Show HTML Editor' : 'Show CSS Editor'}
            </button>
            <div className={showCssEditor ? 'grow' : 'hidden'}>
              <Editor
                language="css"
                options={{
                  readOnly: rewriting,
                  automaticLayout: true,
                }}
                value={css}
                onChange={value => setCss(value)}
                theme="vs-dark"
              />
            </div>
            <div className={showCssEditor ? 'hidden' : 'grow'}>
              <Editor
                language="html"
                options={{
                  readOnly: rewriting,
                  automaticLayout: true,
                }}
                value={html}
                onChange={value => setHtml(value)}
                theme="vs-dark"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
