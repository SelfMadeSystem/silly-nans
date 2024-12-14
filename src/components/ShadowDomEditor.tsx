import { DEFAULT_CSS, DEFAULT_HTML } from './ShadowDomConsts';
import { type ExportData, ShadowDomCreator } from './ShadowDomCreator';
import Editor from '@monaco-editor/react';
import { useState } from 'react';

export default function ShadowDomEditor() {
  const [rewriting, setRewriting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<ExportData | undefined>(undefined);
  const [html, setHtml] = useState<string | undefined>(DEFAULT_HTML);
  const [css, setCss] = useState<string | undefined>(DEFAULT_CSS);

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
    <div className="mx-auto flex max-w-3xl flex-col gap-4 text-white">
      <div className="mx-auto flex w-fit flex-row gap-8">
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
          className="mx-auto block rounded bg-blue-500 px-4 py-2 text-white"
          onClick={() => rewriteCssWithDelay(css ?? '', 50)}
        >
          Rewrite CSS
        </button>
      </div>
      <p className="mt-5 text-center">
        This is a demo of a CSS Shadow DOM. It supports the{' '}
        <code>@property</code> rule via the use of a custom-made PostCSS plugin.
        Compatible with <a href="https://uiverse.io">uiverse</a> elements.
      </p>
      <div className="mt-10 border">
        <ShadowDomCreator
          rewriting={rewriting}
          css={css ?? ''}
          html={html ?? ''}
          setExportData={setData}
        />
      </div>
      <div className="mt-10">
        <h2 className="text-2xl font-bold text-white">CSS</h2>
        <Editor
          language="css"
          options={{
            readOnly: rewriting,
          }}
          value={css}
          onChange={value => setCss(value)}
          height="300px"
          theme="vs-dark"
        />
      </div>
      <div className="mt-10">
        <h2 className="text-2xl font-bold text-white">HTML</h2>
        <Editor
          language="html"
          options={{
            readOnly: rewriting,
          }}
          value={html}
          onChange={value => setHtml(value)}
          height="300px"
          theme="vs-dark"
        />
      </div>
    </div>
  );
}
