const TENTAR_WEBP_PRIMEIRO = true;
const FALLBACK_JPEG = "image/jpeg";
const MIME_WEBP = "image/webp";

function extensaoPorMime(mime: string): string {
  if (mime.includes("webp")) return "webp";
  if (mime.includes("png")) return "png";
  return "jpg";
}

export function mimeDaCompressao(): { mime: string; ext: string } {
  if (!TENTAR_WEBP_PRIMEIRO) {
    return { mime: FALLBACK_JPEG, ext: "jpg" };
  }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const dados = canvas.toDataURL(MIME_WEBP, 0.9);
    if (dados && dados.indexOf("image/webp") !== -1) {
      return { mime: MIME_WEBP, ext: "webp" };
    }
  } catch {
    /* noop */
  }
  return { mime: FALLBACK_JPEG, ext: "jpg" };
}

export async function compressImage(
  file: File,
  maxWidth = 1600,
  qualityWebP = 0.78,
  qualityJpegFallback = 0.82,
): Promise<Blob & { type: string }> {
  const { mime, ext: _extIgnorado } = mimeDaCompressao();
  const qualidadeFinal = mime.includes("webp") ? qualityWebP : qualityJpegFallback;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth * height) / width;
          width = maxWidth;
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D indisponível neste dispositivo"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              canvas.toBlob(
                (blobFallback) => {
                  if (blobFallback) resolve(blobFallback as Blob & { type: string });
                  else reject(new Error("Erro na compressão (ambos formatos falharam)"));
                },
                FALLBACK_JPEG,
                qualityJpegFallback,
              );
              return;
            }
            resolve(blob as Blob & { type: string });
          },
          mime,
          qualidadeFinal,
        );
      };
      img.onerror = () => reject(new Error("Imagem inválida ou corrompida"));
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo de foto"));
  });
}

export { extensaoPorMime };
