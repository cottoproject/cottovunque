const upload = document.getElementById("upload");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const gallery = document.getElementById("gallery");
const postBtn = document.getElementById("postBtn");

let processedImageData = null;

upload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  const reader = new FileReader();

  reader.onload = (evt) => {
    img.src = evt.target.result;
  };

  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);

    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    // your terracotta-style filter
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // grayscale base
      let gray = 0.3 * r + 0.59 * g + 0.11 * b;

      // push toward terracotta
      data[i]     = gray * 1.3; // R
      data[i + 1] = gray * 0.7; // G
      data[i + 2] = gray * 0.4; // B
    }

    ctx.putImageData(imageData, 0, 0);

    // store for posting
    processedImageData = canvas.toDataURL("image/png");
  };

  reader.readAsDataURL(file);
});

postBtn.addEventListener("click", () => {
  if (!processedImageData) return;

  const img = document.createElement("img");
  img.src = processedImageData;

  gallery.prepend(img);

  // reset
  processedImageData = null;
  upload.value = "";
});

<script src="app.js"></script>
