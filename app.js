window.addEventListener("DOMContentLoaded", () => {

  const upload = document.getElementById("upload");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const gallery = document.getElementById("gallery");
  const postBtn = document.getElementById("postBtn");

  let processedImageData = null;

  // -------------------------
  // UPLOAD + YOUR FILTER
  // -------------------------
  upload.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();

    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let data = imageData.data;

      let contrast = 125;

      function applyContrast(v, c) {
        v = v / 255;
        v = (v - 0.5) * (1 + c * 1.8) + 0.5;
        return Math.min(1, Math.max(0, v));
      }

      let c = contrast / 100;

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

        const shadowR = 100;
        const shadowG = 65;
        const shadowB = 45;

        const midR = 225;
        const midG = 125;
        const midB = 70;

        const highlightR = 255;
        const highlightG = 255;
        const highlightB = 255;

        let rr =
          shadowR * shadow +
          midR * mid +
          highlightR * highlight;

        let gg =
          shadowG * shadow +
          midG * mid +
          highlightG * highlight;

        let bb =
          shadowB * shadow +
          midB * mid +
          highlightB * highlight;

        data[i] = rr;
        data[i + 1] = gg;
        data[i + 2] = bb;
      }

      ctx.putImageData(imageData, 0, 0);

      // save for posting
      processedImageData = canvas.toDataURL("image/png");
    };

    img.src = URL.createObjectURL(file);
  });

  // -------------------------
  // POST TO GALLERY
  // -------------------------
  postBtn.addEventListener("click", () => {

    if (!processedImageData) {
      alert("carica prima un'immagine");
      return;
    }

    const img = document.createElement("img");
    img.src = processedImageData;

    gallery.prepend(img);

    processedImageData = null;
    upload.value = "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

});
