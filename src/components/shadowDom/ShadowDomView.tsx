import type { ExportData } from './ShadowDomCreator';
import { sanitize } from './ShadowDomSanatizer';
import { ShadowDomViewer } from './ShadowDomViewer';
import { useState } from 'react';

export default function Home() {
  const [data, setData] = useState<ExportData | undefined>(undefined);
  const [pasted, setPasted] = useState(false);
  async function paste() {
    const text = await navigator.clipboard.readText();

    try {
      const data = JSON.parse(text);
      const safeData = await sanitize(data);
      setData(safeData);
      setPasted(true);
      setTimeout(() => setPasted(false), 2000);
    } catch (e) {
      console.error(e);
    }
  }
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 text-white">
      <h1 className="mt-10 text-center text-4xl font-bold text-white">
        CSS Shadow Viewer Demo
      </h1>
      <button
        onClick={paste}
        className="mx-auto block w-20 rounded bg-blue-500 py-2 text-white"
      >
        {pasted ? 'Pasted!' : 'Paste'}
      </button>
      <p className="mt-5 text-center">
        Try copying from the editor above and pasting here. All the code will be
        sanitized and displayed in a safe way. Try to break the sanitizer!
      </p>
      <div className="mt-10 border">
        {data && <ShadowDomViewer {...data} />}
      </div>
    </div>
  );
}
