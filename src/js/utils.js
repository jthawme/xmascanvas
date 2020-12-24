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

export const debounce = (cb, timer = 500) => {
  let debounceTimer = 0;

  return () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      cb();
    }, timer);
  };
};
