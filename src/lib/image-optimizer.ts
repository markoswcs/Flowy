export async function optimizeImage(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8,
): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject(new Error("Arquivo não é uma imagem."));
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Não foi possível criar o contexto 2D."));
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const finish = (blob: Blob | null) => {
        if (!blob) {
          return reject(new Error("Falha ao otimizar a imagem."));
        }
        const ext = blob.type === "image/webp" ? "webp" : "jpg";
        resolve(
          new File([blob], `${baseName}.${ext}`, {
            type: blob.type,
            lastModified: Date.now(),
          }),
        );
      };

      // Safari cannot encode WebP and silently returns a much larger PNG;
      // fall back to JPEG there so the file really is small.
      canvas.toBlob(
        (blob) => {
          if (blob && blob.type === "image/webp") return finish(blob);
          // JPEG has no transparency: paint white behind the image first.
          ctx.globalCompositeOperation = "destination-over";
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          canvas.toBlob(finish, "image/jpeg", quality);
        },
        "image/webp",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar a imagem para otimização."));
    };

    img.src = url;
  });
}
