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

  let imageReady = false;

  // -------------------------
  // LOAD IMAGES (GLOBAL SUPABASE)
  // -------------------------
  async function loadImages() {

  gallery.innerHTML = "";

  const { data, error } = await supabase.storage
    .from("bucket")
    .list("", {
      limit: 100
    });

  if (error || !data) return;

  // 🔥 INVERTI QUI
  const sorted = data.reverse();

  data.forEach(file => {

  if (!file?.name) return;

  const { data: urlData } = supabase.storage
    .from("bucket")
    .getPublicUrl(file.name);

  if (!urlData?.publicUrl) return;

  const img = document.createElement("img");
  img.src = urlData.publicUrl;

  // elimina immagini rotte (box bianchi)
  img.onerror = () => img.remove();

  gallery.appendChild(img);
});

  loadImages();

  // -------------------------
  // UPLOAD + FILTER + COMPRESSION
  // -------------------------
  upload.addEventListener("change", function (e) {

    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();

    img.onload = function () {

      // 🔥 resize max 1000px (compressione base)
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

      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let data = imageData.data;

      let contrast = 130;

      function applyContrast(v, c) {
        v = v / 255;
        v = (v - 0.5) * (1 + c * 2.0) + 0.5;
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

        const shadowR = 100, shadowG = 65, shadowB = 45;
        const midR = 225, midG = 125, midB = 70;
        const highlightR = 255, highlightG = 255, highlightB = 255;

        data[i] =
          shadowR * shadow +
          midR * mid +
          highlightR * highlight;

        data[i + 1] =
          shadowG * shadow +
          midG * mid +
          highlightG * highlight;

        data[i + 2] =
          shadowB * shadow +
          midB * mid +
          highlightB * highlight;
      }

      ctx.putImageData(imageData, 0, 0);

      imageReady = true;
    };

    img.src = URL.createObjectURL(file);
  });

  // -------------------------
  // UPLOAD TO SUPABASE
  // -------------------------
  postBtn.addEventListener("click", async () => {

    if (!imageReady) {
      alert("carica prima un'immagine");
      return;
    }

    canvas.toBlob(async (blob) => {

      if (!blob) {
        alert("errore creazione immagine");
        return;
      }

      const fileName = `${Date.now()}.jpg`;

      console.log("UPLOAD START");

      const { data, error } = await supabase.storage
        .from("bucket")
        .upload(fileName, blob, {
          contentType: "image/jpeg"
        });

      if (error) {
        console.error("UPLOAD ERROR:", error);
        alert(error.message);
        return;
      }

      console.log("UPLOAD OK");

      imageReady = false;
      upload.value = "";
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      loadImages();

    }, "image/jpeg", 0.55);

  });

});
