window.addEventListener("DOMContentLoaded", () => {

  const supabase = window.supabase.createClient(
    "https://bflcyezzkzxvkfgvudop.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmbGN5ZXp6a3p4dmtmZ3Z1ZG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDc1NTQsImV4cCI6MjA5NjU4MzU1NH0.4CiavWmychV7rL2LuPnwNMKyNxWKvFWPIHIhyOjzmjM"
  );

  const upload = document.getElementById("upload");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const gallery = document.getElementById("gallery");
  const postBtn = document.getElementById("postBtn");

  // conterrà tutte le immagini elaborate
  let processedImages = [];

  // -------------------------
  // CARICA GALLERIA
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
      console.error(error);
      return;
    }

    data.forEach(file => {

      const { data: url } = supabase.storage
        .from("bucket")
        .getPublicUrl(file.name);

      const img = document.createElement("img");

      img.src = url.publicUrl;

      img.onerror = () => img.remove();

      gallery.appendChild(img);

    });

  }

  loadImages();

  // -------------------------
  // ELABORAZIONE MULTIPLA
  // -------------------------

  upload.addEventListener("change", async (e) => {

    const files = [...e.target.files];

    if (!files.length) return;

    processedImages = [];

    for (const file of files) {

      await processImage(file);

    }

    alert(processedImages.length + " immagini pronte.");

  });

  function processImage(file) {

    return new Promise((resolve) => {

      const img = new Image();

      img.onload = () => {

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

        let contrast = 130;

        function applyContrast(v, c) {

          v /= 255;

          v = (v - 0.5) * (1 + c * 2.0) + 0.5;

          return Math.min(1, Math.max(0, v));

        }

        const c = contrast / 100;

        for (let i = 0; i < data.length; i += 4) {

          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          const x = applyContrast(lum, c);

          let highlight = Math.max(0, (x - 0.78) / 0.22);
          let shadow = Math.pow(1 - x, 2.5);
          let mid = 1 - Math.abs(x - 0.5) * 2;

          mid = Math.max(0, mid);

          shadow *= 0.35;
          mid *= 1.8;
          highlight *= 1.0;

          const total = shadow + mid + highlight;

          shadow /= total;
          mid /= total;
          highlight /= total;

          data[i] =
            100 * shadow +
            225 * mid +
            255 * highlight;

          data[i + 1] =
            65 * shadow +
            125 * mid +
            255 * highlight;

          data[i + 2] =
            45 * shadow +
            70 * mid +
            255 * highlight;

        }

        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob((blob) => {

          processedImages.push(blob);

          resolve();

        }, "image/jpeg", 0.55);

      };

      img.src = URL.createObjectURL(file);

    });

  }

  // -------------------------
  // UPLOAD MULTIPLO
  // -------------------------

  postBtn.addEventListener("click", async () => {

    if (processedImages.length === 0) {

      alert("Seleziona delle immagini.");

      return;

    }

    postBtn.disabled = true;

    for (let i = 0; i < processedImages.length; i++) {

      const blob = processedImages[i];

      const fileName =
        Date.now() +
        "_" +
        i +
        ".jpg";

      const { error } = await supabase.storage
        .from("bucket")
        .upload(fileName, blob, {
          contentType: "image/jpeg"
        });

      if (error) {

        console.error(error);

      }

    }

    processedImages = [];

    upload.value = "";

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    await loadImages();

    postBtn.disabled = false;

    alert("Upload completato.");

  });

});
