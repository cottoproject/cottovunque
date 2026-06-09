window.addEventListener("DOMContentLoaded", () => {

  console.log("LOCAL MODE LOADED");

  const upload = document.getElementById("upload");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const postBtn = document.getElementById("postBtn");
  const gallery = document.getElementById("gallery");

  let processedImageData = null;

  // =========================
  // LOAD FROM LOCAL STORAGE
  // =========================
  function loadGallery() {
    const saved = JSON.parse(localStorage.getItem("gallery") || "[]");

    saved.forEach(src => {
      const img = document.createElement("img");
      img.src = src;
      gallery.appendChild(img);
    });
  }

  loadGallery();

  // =========================
  // FILTER
  // =========================
  upload.addEventListener("change", (e) => {

    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();

    img.onload = () => {

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let data = imageData.data;

      let contrast = 125;
      let c = contrast / 100;

      function applyContrast(v, c) {
        v = v / 255;
        v = (v - 0.5) * (1 + c * 1.8) + 0.5;
        return Math.min(1, Math.max(0, v));
      }

      for (let i = 0; i < data.length; i += 4) {

        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        let lum = 0.299 * r + 0.587 * g + 0.114 * b;
        let x = applyContrast(lum, c);

        let highlight = Math.max(0, (x - 0.78) / 0.22);
        let shadow = Math.pow(1 - x, 2.5);
        let mid = 1 - Math.abs(x - 0.5) * 2;
        mid = Math.max(0, mid);

        shadow *= 0.35;
        mid *= 1.8;
        highlight *= 1.0;

        let total = shadow + mid + highlight;
        shadow /= total;
        mid /= total;
        highlight /= total;

        const sr = 100, sg = 65, sb = 45;
        const mr = 225, mg = 125, mb = 70;
        const hr = 255, hg = 255, hb = 255;

        data[i]     = sr * shadow + mr * mid + hr * highlight;
        data[i + 1] = sg * shadow + mg * mid + hg * highlight;
        data[i + 2] = sb * shadow + mb * mid + hb * highlight;
      }

      ctx.putImageData(imageData, 0, 0);

      processedImageData = canvas.toDataURL("image/png");

      console.log("IMAGE READY");
    };

    img.src = URL.createObjectURL(file);
  });

  // =========================
  // SAVE TO BROWSER MEMORY
  // =========================
  postBtn.addEventListener("click", () => {

    if (!processedImageData) {
      alert("Select image first");
      return;
    }

    const saved = JSON.parse(localStorage.getItem("gallery") || "[]");

    saved.unshift(processedImageData);

    localStorage.setItem("gallery", JSON.stringify(saved));

    const img = document.createElement("img");
    img.src = processedImageData;
    gallery.prepend(img);

    processedImageData = null;
    upload.value = "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    console.log("SAVED LOCALLY");
  });

});
