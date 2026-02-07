/**
 * Compress and convert image to base64
 * Max output size ~500KB to stay well under Firestore 1MB document limit
 */
export async function compressImageToBase64(file: File, maxWidth = 800, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                // Create canvas and draw resized image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Convert to base64 JPEG
                const base64 = canvas.toDataURL('image/jpeg', quality);

                // Check size (base64 is ~33% larger than binary)
                const sizeKB = (base64.length * 0.75) / 1024;
                if (sizeKB > 500) {
                    // Try with lower quality
                    const lowerQuality = canvas.toDataURL('image/jpeg', 0.5);
                    resolve(lowerQuality);
                } else {
                    resolve(base64);
                }
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}
