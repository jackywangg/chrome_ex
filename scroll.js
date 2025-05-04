(async function () {
  const scrollHeight = document.body.scrollHeight;
  const viewportHeight = window.innerHeight;
  const captures = [];
  let scrollY = 0;

  while (scrollY < scrollHeight) {
    window.scrollTo(0, scrollY);
    await new Promise((r) => setTimeout(r, 300));
    const image = await chrome.runtime.sendMessage({ action: "capture" });
    captures.push({ image, scrollY });
    scrollY += viewportHeight;
  }

  window.scrollTo(0, 0);

    // for date
    const date = new Date();
    const dateStr = `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, "0")}_${String(date.getDate()).padStart(2, "0")}`;
  
    chrome.runtime.sendMessage({
      action: "done",
      captures,
      title: document.title,
      date: dateStr,
    });  
})();
