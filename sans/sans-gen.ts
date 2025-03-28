import { type DialogEntry, dialog, eod } from './sans';

const entries = Object.entries(dialog);

function radios(pfx: string, entries: [string, DialogEntry][]): string[] {
  return entries
    .map(([key, value], index) => {
      const id = `${pfx}-${index}`;
      const rest =
        typeof value[1] === 'object'
          ? radios(id, Object.entries(value[1]))
          : [];
      return [`<input type="radio" name="s" class="s" id="${id}" />`, ...rest];
    })
    .flat();
}

function inputs(pfx: string, entries: [string, DialogEntry][]): string[] {
  return entries
    .map(([key, value], index) => {
      const id = `${pfx}-${index}`;
      if (value[1] === eod) {
        return [];
      }
      const rest =
        typeof value[1] === 'object'
          ? inputs(id, Object.entries(value[1]))
          : [];
      const labels = Object.entries(value[1]).map(([key], index) => {
        const id2 = `${id}-${index}`;
        return `<label for="${id2}">${key}</label>`;
      });
      return [`<div class="for-${id}">${labels.join('')}</div>`, ...rest];
    })
    .flat();
}

/*
#${id}:checked ~ .input {.for-${id} | .for-eod} {
  display: flex;
}
#${id}:checked ~ .text {
  --n1: ${ofchar-in-line-1};
  --n2: ${ofchar-in-line-2};
  --n3: ${ofchar-in-line-3};

  .line.a::before {
    content: ${line-1};
  }
  .line.b::before {
    content: ${line-2};
  }
  .line.c::before {
    content: ${line-3};
  }
}
*/
// max char per line: 24
function splitText(text: string): string[] {
  const lines = text.split('\n');
  return lines
    .map(line => {
      const words = line.split(' ');
      const lines = [];
      let currentLine = '';
      for (const word of words) {
        if (currentLine.length + word.length <= 34) {
          currentLine += word + ' ';
        } else {
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        }
      }
      lines.push(currentLine.trim());
      return lines.map(line => line.replace(/'/g, "\\'"));
    })
    .flat();
}

function genCss(pfx: string, entries: [string, DialogEntry][]): string[] {
  return entries
    .map(([key, value], index) => {
      const id = `${pfx}-${index}`;
      const rest =
        typeof value[1] === 'object'
          ? genCss(id, Object.entries(value[1]))
          : [];
      const text = splitText(value[0]);
      const linesCss = `#${id}:checked ~ .text {
  --n1: ${text[0].length};
  --n2: ${text[1]?.length ?? 0};
  --n3: ${text[2]?.length ?? 0};
}`;
      const textCss = text
        .map((line, index) => {
          return `#${id}:checked ~ .text .line.${String.fromCharCode(
            97 + index,
          )}::before {
  content: '${line}';
}`;
        })
        .join('\n');
      const inputCss =
        typeof value[1] === 'object'
          ? `#${id}:checked ~ .input .for-${id} {
  display: flex;
}`
          : `#${id}:checked ~ .input .for-eod {
  display: flex;
}`;
      return [linesCss, textCss, inputCss, ...rest];
    })
    .flat();
}

console.log(radios('r', entries).join('\n'));
// console.log(inputs('r', entries).join('\n'));
// console.log(genCss('r', entries).join('\n'));
