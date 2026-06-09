window.addEventListener("DOMContentLoaded", () => {

  // =========================
  // SUPABASE SETUP
  // =========================
  const SUPABASE_URL = "https://bflcyezzkzxvkfgvudop.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmbGN5ZXp6a3p4dmtmZ3Z1ZG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDc1NTQsImV4cCI6MjA5NjU4MzU1NH0.4CiavWmychV7rL2LuPnwNMKyNxWKvFWPIHIhyOjzmjM";

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // =========================
  // ELEMENTS
  // =========================
  const upload = document.getElementById("upload");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const postBtn = document.getElementById("postBtn");
  const gallery = document.getElementById("gallery");

  let processedImageData = null;

  // =========================
  // IMAGE PROCESSING
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

        const shadowR = 100, shadowG = 65, shadowB = 45;
        const midR = 225, midG = 125, midB = 70;
        const highlightR = 255, highlightG = 255, highlightB = 255;

        data[i]     = shadowR * shadow + midR * mid + highlightR * highlight;
        data[i + 1] = shadowG * shadow + midG * mid + highlightG * highlight;
        data[i + 2] = shadowB * shadow + midB * mid + highlightB * highlight;
      }

      ctx.putImageData(imageData, 0, 0);

      processedImageData = canvas.toDataURL("image/png");

      console.log("IMAGE READY");
    };

    img.src = URL.createObjectURL(file);
  });

  // =========================
  // LOAD GALLERY
  // =========================
  async function loadGallery() {

    const { data, error } = await supabase
      .from("images")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    data.forEach(item => {
      const img = document.createElement("img");
      img.src = item.url;
      gallery.appendChild(img);
    });
  }

  loadGallery();

  // =========================
  // PUBLISH
  // =========================
  postBtn.addEventListener("click", async () => {

    if (!processedImageData) {
      alert("Select an image first");
      return;
    }

    try {

      const res = await fetch(processedImageData);
      const blob = await res.blob();

      const fileName = `${Date.now()}.png`;

      const { error: uploadError } = await supabase
        .storage
        .from("images")
        .upload(fileName, blob);

      if (uploadError) {
        console.log(uploadError);
        alert("Upload failed");
        return;
      }

      const { data: urlData } = supabase
        .storage
        .from("images")
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from("images")
        .insert([{ url: imageUrl }]);

      if (dbError) {
        console.log(dbError);
        alert("Database insert failed");
        return;
      }

      const img = document.createElement("img");
      img.src = imageUrl;
      gallery.prepend(img);

      processedImageData = null;
      upload.value = "";
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      console.log("PUBLISHED SUCCESS");

    } catch (err) {
      console.log(err);
      alert("Unexpected error");
    }
  });

});
