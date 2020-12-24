export const tickUpdate = (cb) => {
  let ticking = false;

  const update = (e) => {
    cb(e);
    ticking = false;
  };

  return (e) => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => update(e));
    }
  };
};
