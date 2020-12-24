function getFakeOffscreen(width, height) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

export function getFrames(chars, bgColor, fgColor) {
  const w = 64;
  const h = 64;

  // const c =
  //   typeof OffscreenCanvas !== "undefined"
  //     ? new OffscreenCanvas(w, h)
  //     : getFakeOffscreen(w, h);
  const canvas = getFakeOffscreen(w, h);
  const ctx = canvas.getContext("2d");

  ctx.font = "48px Arcade";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  const urls = chars.map((c) => {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = fgColor;
    ctx.fillText(c, w / 2, h / 2);

    return canvas.toDataURL("image/png", 0.5);
  });

  return urls;
}

let timer = 0;
let idx = 0;
export function animateFavicon(chars, bgColor, fgColor) {
  const iconLink = document.querySelector('link[rel="icon"]');
  const frames = getFrames(chars, bgColor, fgColor);
  idx = 0;

  const update = () => {
    clearTimeout(timer);

    iconLink.href = frames[idx % frames.length];
    idx++;
    timer = setTimeout(() => {
      update();
    }, 500);
  };

  update();
}
