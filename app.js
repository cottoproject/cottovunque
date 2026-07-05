window.addEventListener("DOMContentLoaded", () => {

  const supabase = window.supabase.createClient(
    "https://bflcyezzkzxvkfgvudop.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmbGN5ZXp6a3p4dmtmZ3Z1ZG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDc1NTQsImV4cCI6MjA5NjU4MzU1NH0.4CiavWmychV7rL2LuPnwNMKyNxWKvFWPIHIhyOjzmjM"
  );

  const upload = document.getElementById("upload");
  const gallery = document.getElementById("gallery");
  const postBtn = document.getElementById("postBtn");

  let processedImages = [];

  // -------------------------
  // LOAD IMAGES
  // -------------------------
  async function loadImages() {

    gallery.innerHTML = "";

    const { data, error } = await supabase.storage
      .from("bucket")
      .list("", {
        limit: 100,
        sortBy: {
          column: "created_at",
          order: "desc"
        }
      });

    if (error) {
      console.error("LIST ERROR:", error);
      return;
    }

    if (!data) return;

    data.forEach(file => {

      if (!file?.name) return;

      const { data: urlData } = supabase.storage
        .from("bucket")
        .getPublicUrl(file.name);

      const img = document.createElement("img");
      img.src = urlData.publicUrl;

      img.onerror = () => img.remove();

      gallery.appendChild(img);
    });
  }

  loadImages();

  // -------------------------
  // MULTI FILE INPUT
  // -------------------------
  upload.addEventListener("change", async (e) => {

    const files = [...e.target.files];
    if (!files.length) return;

    processedImages = [];

    for (const file of files) {
      const blob = await processImage(file);
      processedImages.push(blob);
    }

    alert(`${processedImages.length} immagini pronte`);
  });

  // -------------------------
  // IMAGE PROCESSING (FIXED)
  // -------------------------
  function processImage(file) {

    return new Promise((resolve) => {

      const img = new Image();

      img.onload = () => {

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const maxSize = 1000;

        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        } else if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const contrast = 130;
        const c = contrast / 100;

        const applyContrast = (v, c) => {
          v /= 255;
          v = (v - 0.5) * (1 + c * 2) + 0.5;
          return Math.min(1, Math.max(0, v));
        };

        for (let i = 0; i < data.length; i += 4) {

          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const x = applyContrast(lum, c);

          let shadow = Math.pow(1 - x, 2.5);
          let mid = 1 - Math.abs(x - 0.5) * 2;
          let highlight = Math.max(0, (x - 0.78) / 0.22);

          shadow *= 0.35;
          mid *= 1.8;

          const total = shadow + mid + highlight;

          const s = shadow / total;
          const m = mid / total;
          const h = highlight / total;

          data[i]     = 100 * s + 225 * m + 255 * h;
          data[i + 1] = 65  * s + 125 * m + 255 * h;
          data[i + 2] = 45  * s + 70  * m + 255 * h;
        }

        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.55);

      };

      img.src = URL.createObjectURL(file);

    });
  }

  // -------------------------
  // UPLOAD MULTIPLE (PARALLEL)
  // -------------------------
  postBtn.addEventListener("click", async () => {

    if (!processedImages.length) {
      alert("Seleziona delle immagini");
      return;
    }

    postBtn.disabled = true;

    const uploads = processedImages.map((blob, i) => {

      const fileName = `${Date.now()}_${i}_${Math.random().toString(16).slice(2)}.jpg`;

      return supabase.storage
        .from("bucket")
        .upload(fileName, blob, {
          contentType: "image/jpeg"
        })
        .then(({ error }) => {
          if (error) console.error("UPLOAD ERROR:", error);
        });

    });

    await Promise.all(uploads);

    processedImages = [];
    upload.value = "";

    await loadImages();

    postBtn.disabled = false;

    alert("Upload completato!");
  });

});
