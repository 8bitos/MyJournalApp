function createImageLoader(getAccessToken) {
  const cache = new Map();
  const inFlight = new Map();
  let observer = null;

  function ensureObserver() {
    if (observer) return;
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        const fileId = img.dataset.fileId;
        observer.unobserve(img);
        if (!fileId) return;
        loadImage(fileId, img);
      });
    }, { rootMargin: '200px 0px' });
  }

  async function loadImage(fileId, imgEl) {
    if (!fileId || !imgEl) return;
    const cached = cache.get(fileId);
    if (cached) {
      imgEl.src = cached;
      imgEl.classList.remove('opacity-60');
      return;
    }

    let promise = inFlight.get(fileId);
    if (!promise) {
      const accessToken = getAccessToken();
      if (!accessToken) return;

      promise = fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
        .then((response) => {
          if (!response.ok) throw new Error('Image fetch failed');
          return response.blob();
        })
        .then((blob) => {
          const objectUrl = URL.createObjectURL(blob);
          cache.set(fileId, objectUrl);
          return objectUrl;
        })
        .finally(() => {
          inFlight.delete(fileId);
        });

      inFlight.set(fileId, promise);
    }

    try {
      const url = await promise;
      if (!url) return;
      imgEl.src = url;
      imgEl.classList.remove('opacity-60');
    } catch (err) {
      // Keep placeholder on failure
    }
  }

  function observeImage(imgEl, fileId) {
    if (!imgEl || !fileId) return;
    ensureObserver();
    imgEl.dataset.fileId = fileId;
    observer.observe(imgEl);
  }

  function reset() {
    cache.forEach((url) => URL.revokeObjectURL(url));
    cache.clear();
    inFlight.clear();
  }

  return { observeImage, reset };
}

export { createImageLoader };
