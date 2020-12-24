import loop from "raf-loop";
import queryString from "query-string";
import tumult from "tumult";
import { debounce, tickUpdate } from "./utils";
import { getWebcam } from "./webcam";
import { animateFavicon, getFrames } from "./favicon";

const startEl = document.querySelector("#start");
const canvas = document.querySelector("#maincanvas");
const ctx = canvas.getContext("2d");

const simplex2 = new tumult.Simplex2();

let frameCount = 0;
const CELL_SIZE = 15;

function getCellSize(desiredSize, width) {
  return width / Math.round(width / desiredSize);
}

function getWebcamDimensions(videoEl, width, height, forcePerspective = false) {
  const { videoWidth, videoHeight } = videoEl;

  let dimensions = {};

  if (!forcePerspective) {
    dimensions = {
      width: width,
      height: (width / videoWidth) * videoHeight,
      offsetX: 0,
    };

    dimensions.offsetY = ((dimensions.height - height) / 2) * -1;
  } else {
    dimensions = {
      width: (height / videoHeight) * videoWidth,
      height: height,
      offsetY: 0,
    };

    dimensions.offsetX = ((dimensions.width - width) / 2) * -1;
  }

  if (dimensions.height < height) {
    return getWebcamDimensions(videoEl, width, height, true);
  }

  return dimensions;
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function getPixel(x, y, id, width) {
  const index = (Math.floor(y) * width + Math.floor(x)) * 4;

  return [
    id.data[index],
    id.data[index + 1],
    id.data[index + 2],
    id.data[index + 3],
  ];
}

function getLuminance(color) {
  return (0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]) / 255;
}

function calculateCellSize(canvas) {
  if (canvas.width > canvas.height) {
    return (canvas.width / canvas.height) * 8;
  }

  return (canvas.height / canvas.width) * 10;
}

function getChar(chars, perc) {
  if (!chars || chars.length === 0) {
    return "x";
  }

  return chars[Math.abs(Math.floor(chars.length * perc)) % chars.length] || "";
  // return chars[Math.floor(chars.length * clamp(perc, 0, 0.9999))] || "";
}

const getColor = () => {
  return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
};

function getParam(key, def) {
  if (window.location.search) {
    const obj = queryString.parse(window.location.search);

    if (obj[key]) {
      return obj[key];
    }
  }

  return def;
}

function getInitialText() {
  return getParam("text", "Merry Christmas");
}

console.log(getParam("bgColor", "test"));

const properties = {
  desiredCellSize: CELL_SIZE,
  cellSize: getCellSize(CELL_SIZE),
  downSample: 1,
  chars: getInitialText().split(""),
  bgColor: getParam("bgColor", getColor()),
  fgColor: getParam("fgColor", getColor()),
  webcamChoice: true,
  modifyX: Math.random() * 50 + 50,
  modifyY: Math.random() * 50 + 50,
};

function resize() {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  canvas.width = windowWidth;
  canvas.height = windowHeight;

  properties.desiredCellSize = Math.round(calculateCellSize(canvas)); // magic number
  properties.cellSize = getCellSize(properties.desiredCellSize, windowWidth);

  document.body.style.setProperty(
    "--cell-size",
    `${properties.desiredCellSize}px`
  );
}

function update(dt) {
  const {
    cellSize,
    downSample,
    chars,
    bgColor,
    fgColor,
    modifyX,
    modifyY,
  } = properties;

  const cols = canvas.width / cellSize;
  const rows = Math.ceil(canvas.height / cellSize);

  let transformer = (x, y) => simplex2.gen(x / modifyX, y / modifyY);
  if (properties.webcam) {
    const {
      width: webcamWidth,
      height: webcamHeight,
      offsetX: webcamOffsetX,
      offsetY: webcamOffsetY,
    } = getWebcamDimensions(
      properties.webcam,
      canvas.width / properties.downSample,
      canvas.height / properties.downSample
    );

    ctx.drawImage(
      properties.webcam,
      webcamOffsetX,
      webcamOffsetY,
      webcamWidth,
      webcamHeight
    );
  }

  const id = ctx.getImageData(
    0,
    0,
    canvas.width / properties.downSample,
    canvas.height / properties.downSample
  );

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = fgColor;
  ctx.font = `${cellSize}px Arcade`;
  ctx.textBaseline = "top";

  const downsampledSize = cellSize / downSample;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const gen = properties.webcam
        ? transformer(frameCount, y)
        : transformer(
            x + frameCount / (modifyX / 10),
            y + frameCount / (modifyY / 10)
          );

      const pixel = getPixel(
        x * downsampledSize,
        y * downsampledSize,
        id,
        canvas.width / downSample
      );

      const luma = getLuminance(pixel) + gen;

      const char = getChar(chars, luma);

      ctx.save();
      ctx.translate(x * cellSize, y * cellSize);
      // ctx.fillRect(0, 0, luma * cellSize, cellSize);

      ctx.fillText(char, 0, 0);

      ctx.restore();
    }
  }

  frameCount++;
}

const engine = loop(update);

document.body.style.setProperty("--bg-color", properties.bgColor);
document.body.style.setProperty("--fg-color", properties.fgColor);

const debouncedAnimate = debounce(() => {
  animateFavicon(properties.chars, properties.bgColor, properties.fgColor);
});

function start() {
  engine.start();

  const performantOnResize = tickUpdate(resize);
  window.addEventListener("resize", performantOnResize, false);
  performantOnResize();

  startEl.parentElement.removeChild(startEl);
  document.body.classList.add("load");

  if (properties.webcamChoice) {
    getWebcam().then((webcamEl) => {
      properties.webcam = webcamEl;
    });
  }

  debouncedAnimate();
}

const charsEl = document.querySelector("#chars");
charsEl.value = properties.chars.join("");
charsEl.style.setProperty("--input-width", charsEl.value.length);
charsEl.addEventListener("input", (e) => {
  properties.chars = e.target.value.split("");
  e.target.style.setProperty("--input-width", e.target.value.length);

  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set("text", e.target.value);

  const newRelativePathQuery =
    window.location.pathname + "?" + searchParams.toString();
  history.replaceState(null, "", newRelativePathQuery);

  debouncedAnimate();
});

const withWebcamEl = document.querySelector(".with-webcam");
const withoutWebcamEl = document.querySelector(".without-webcam");

withWebcamEl.addEventListener("click", (e) => {
  properties.webcamChoice = true;
  withWebcamEl.classList.toggle("active", properties.webcamChoice);
  withoutWebcamEl.classList.toggle("active", !properties.webcamChoice);
});

withoutWebcamEl.addEventListener("click", (e) => {
  properties.webcamChoice = false;
  withWebcamEl.classList.toggle("active", properties.webcamChoice);
  withoutWebcamEl.classList.toggle("active", !properties.webcamChoice);
});

const colsEl = document.querySelector("#cols");
colsEl.addEventListener(
  "click",
  () => {
    properties.fgColor = getColor();
    properties.bgColor = getColor();
    document.body.style.setProperty("--bg-color", properties.bgColor);
    document.body.style.setProperty("--fg-color", properties.fgColor);

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("fgColor", properties.fgColor);
    searchParams.set("bgColor", properties.bgColor);

    const newRelativePathQuery =
      window.location.pathname + "?" + searchParams.toString();
    history.replaceState(null, "", newRelativePathQuery);

    debouncedAnimate();
  },
  false
);

const shareEl = document.querySelector("#sharebtn");
shareEl.addEventListener(
  "click",
  () => {
    navigator.share({
      text: `${properties.chars.join(
        ""
      )} – get Xmas trippy with lil old J Dawg`,
      url: window.location.href,
    });
  },
  false
);

startEl.addEventListener(
  "click",
  () => {
    start();
  },
  false
);
