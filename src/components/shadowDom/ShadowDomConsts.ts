export const CSS_PRELUDE = `\
* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}
button {
  font-family: inherit;
}`;
export const DEFAULT_HTML = `\
<svg style="position: absolute; width: 0; height: 0;">
  <filter width="300%" x="-100%" height="300%" y="-100%" id="unopaq">
    <feColorMatrix
      values="1 0 0 0 0 
            0 1 0 0 0 
            0 0 1 0 0 
            0 0 0 9 0"
    ></feColorMatrix>
  </filter>
  <filter width="300%" x="-100%" height="300%" y="-100%" id="unopaq2">
    <feColorMatrix
      values="1 0 0 0 0 
            0 1 0 0 0 
            0 0 1 0 0 
            0 0 0 3 0"
    ></feColorMatrix>
  </filter>
  <filter width="300%" x="-100%" height="300%" y="-100%" id="unopaq3">
    <feColorMatrix
      values="1 0 0 0.2 0 
            0 1 0 0.2 0 
            0 0 1 0.2 0 
            0 0 0 2 0"
    ></feColorMatrix>
  </filter>
</svg>
<button class="real-button"></button>
<div class="backdrop"></div>
<div class="button-container">
  <div class="spin spin-blur"></div>
  <div class="spin spin-intense"></div>
  <div class="backdrop"></div>
  <div class="button-border">
    <div class="spin spin-inside"></div>
    <div class="button">Button</div>
  </div>
</div>`;
export const DEFAULT_CSS = `\
@property --ra {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: true;
}

@property --rt {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: true;
}

@property --r {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: true;
}

.button-container {
  position: relative;
  margin: 0 2em;
}

.button-border {
  padding: 3px;
  inset: 0;
  background: #0005;
  border-radius: inherit;
  clip-path: path("M 90 0 C 121 0 126 5 126 33 C 126 61 121 66 90 66 L 33 66 C 5 66 0 61 0 33 C 0 5 5 0 33 0 Z");
}

.button {
  justify-content: center;
  align-items: center;
  border: none;
  border-radius: 0.875em;
  clip-path: path("M 90 0 C 115 0 120 5 120 30 C 120 55 115 60 90 60 L 30 60 C 5 60 0 55 0 30 C 0 5 5 0 30 0 Z"
    );
  width: 120px;
  height: 60px;
  background: #111215;
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow: hidden;
}

.real-button {
  position: absolute;
  width: 120px;
  height: 60px;
  z-index: 1;
  outline: none;
  border: none;
  border-radius: 17px;
  cursor: pointer;
  opacity: 0;
}

.backdrop {
  position: absolute;
  inset: -9900%;
  background: radial-gradient(circle at 50% 50%,
      #0000 0,
      #0000 20%,
      #111111aa 50%);
  background-size: 3px 3px;
  z-index: -1;
}

.spin {
  position: absolute;
  inset: 0;
  z-index: -2;
  opacity: 0.5;
  overflow: hidden;
  transition: --rt 0.5s, 0.3s;
  --rt: 0deg;
  animation: speen 8s linear infinite;
  animation-play-state: paused;
  --r: calc(var(--ra, 0deg) + var(--rt, 0deg) + 90deg);
}

.real-button:hover~.button-container .spin {
  animation-play-state: running;
  --rt: -6deg;
}

@keyframes speen {
  to {
    --ra: 360deg;
  }
}

.real-button:active~div .spin {
  opacity: 1;
}

.spin-blur {
  filter: blur(2em) url(#unopaq);
}

.spin-intense {
  inset: -0.125em;
  filter: blur(0.25em) url(#unopaq2);
  border-radius: 0.75em;
}

.spin-inside {
  inset: -2px;
  border-radius: inherit;
  filter: blur(2px) url(#unopaq3);
  z-index: 0;
}

.spin::before {
  content: "";
  position: absolute;
  inset: -150%;
}


.spin-blur::before {
  background: linear-gradient(var(--r), #f50 30%, #0000 50%, #05f 70%);
}

.spin-intense::before {
  background: linear-gradient(var(--r), #f95 20%, #0000 45% 55%, #59f 80%);
}

.spin-inside::before {
  background: linear-gradient(var(--r), #fc9 30%, #0000 45% 55%, #9cf 70%);
}`;

export type Preset = {
  name: string;
  html: string;
  css: string;
  tailwind?: boolean;
};

export const PRESETS: Preset[] = [
  {
    name: 'Tailwind',
    html: `<button class="border-2 border-blue-500 bg-blue-500 text-white font-bold py-2 px-4 rounded">Button</button>`,
    css: `\
/* No need to add @tailwind base, components, or utilities here since it's automatically added when you click the \`Enable Tailwind\` button */
`,
    tailwind: true,
  },
  {
    name: 'Button',
    html: `<button class="btn">Button</button>`,
    css: `\
/* From Uiverse.io by CristianMontoya98 */ 
.btn {
 width: 6.5em;
 height: 2.3em;
 margin: 0.5em;
 background: #333;
 color: white;
 border: none;
 border-radius: 0.625em;
 font-size: 20px;
 font-weight: bold;
 cursor: pointer;
 position: relative;
 z-index: 1;
 overflow: hidden;
}

.btn:hover {
 color: black;
}

.btn:after {
 content: "";
 background: white;
 position: absolute;
 z-index: -1;
 left: -20%;
 right: -20%;
 top: 0;
 bottom: 0;
 transform: skewX(-45deg) scale(0, 1);
 transition: all 0.5s;
}

.btn:hover:after {
 transform: skewX(-45deg) scale(1, 1);
 -webkit-transition: all 0.5s;
 transition: all 0.5s;
}`,
  },
  {
    name: 'SVG',
    html: `\
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="red" />
</svg>`,
    css: ``,
  },
];
