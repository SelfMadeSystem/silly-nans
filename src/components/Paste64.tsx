import { useState } from 'react';

export default function Paste64() {
  const [image, setImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function copyToClipboard(text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        setCopied(false);
      });
  }

  const changeFile = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImage(null);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData.items;

    // First check for image files
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        changeFile(file);
        return;
      }
    }

    // Then check for text that might be SVG
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'text/plain') {
        item.getAsString(text => {
          const trimmedText = text.trim();
          if (
            trimmedText.startsWith('<svg') &&
            trimmedText.includes('</svg>')
          ) {
            // It's likely an SVG, convert to data URL
            const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(trimmedText)))}`;
            setImage(svgDataUrl);
          }
        });
        return;
      }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const items = event.dataTransfer.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        changeFile(file);
        return;
      }
    }
  };

  const handleDropOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'none';
  };

  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = event => {
      const file = (event.target as HTMLInputElement).files?.[0] || null;
      changeFile(file);
    };
    input.click();
  };

  return (
    <>
      <div
        className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 p-4 text-center"
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDropOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        {image ? (
          <div className="flex h-full w-full items-center justify-center">
            <img
              src={image}
              alt="Pasted or Dropped"
              className="max-h-full max-w-full rounded-none"
            />
          </div>
        ) : (
          <p>Paste an image here or click to upload</p>
        )}
      </div>
      {image && (
        <div className="mt-4">
          <div className="text-sm text-gray-500">
            Image Data URL:
            <button
              className="ml-2 cursor-pointer text-blue-600 hover:underline"
              onClick={() => copyToClipboard(image)}
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          <textarea
            className="w-full rounded-lg border border-gray-300 p-2"
            rows={4}
            value={image}
            readOnly
          />
        </div>
      )}
    </>
  );
}
