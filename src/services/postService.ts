import { db } from '../lib/firebase';
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';

export interface Post {
    id: string;
    authorId: string;
    authorName: string;
    authorRole: 'student' | 'admin' | 'warden' | 'security';
    hostelId: string;
    text: string;
    imageData?: string; // Base64 encoded image data
    createdAt: Timestamp;
}

interface CreatePostData {
    text: string;
    imageFile?: File;
    userData: {
        uid: string;
        name: string;
        hostelId: string;
        role?: 'student' | 'admin' | 'warden' | 'security';
    };
}

/**
 * Compress and convert image to base64
 * Max output size ~500KB to stay well under Firestore 1MB document limit
 */
async function compressImageToBase64(file: File, maxWidth = 800, quality = 0.7): Promise<string> {
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

class PostService {
    /**
     * Create a new post with optional image (stored as base64 in Firestore)
     */
    async createPost({ text, imageFile, userData }: CreatePostData): Promise<string> {
        try {
            // Validate text length
            if (text.length > 280) {
                throw new Error('Post text cannot exceed 280 characters');
            }

            // Validate image file size if present (original file)
            if (imageFile && imageFile.size > 5 * 1024 * 1024) {
                throw new Error('Image size must be less than 5MB');
            }

            let imageData: string | undefined;

            // Compress and convert image to base64 if present
            if (imageFile) {
                try {
                    imageData = await compressImageToBase64(imageFile);
                } catch (imgError) {
                    console.error('Image compression failed:', imgError);
                    throw new Error('Failed to process image. Please try a different image.');
                }
            }

            // Create post document
            const postData = {
                authorId: userData.uid,
                authorName: userData.name,
                authorRole: userData.role || 'student',
                hostelId: userData.hostelId,
                text: text.trim(),
                imageData: imageData || null,
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'posts'), postData);
            return docRef.id;
        } catch (error) {
            console.error('Error creating post:', error);
            throw error;
        }
    }

    /**
     * Subscribe to posts feed (real-time)
     */
    subscribeToPosts(callback: (posts: Post[]) => void): () => void {
        const q = query(
            collection(db, 'posts'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const posts: Post[] = [];
            snapshot.forEach((doc) => {
                posts.push({
                    id: doc.id,
                    ...doc.data()
                } as Post);
            });
            callback(posts);
        }, (error) => {
            console.error('Error fetching posts:', error);
            callback([]);
        });

        return unsubscribe;
    }

    /**
     * Delete a post (author only)
     * No need to delete from storage since images are stored in Firestore
     */
    async deletePost(postId: string): Promise<void> {
        try {
            await deleteDoc(doc(db, 'posts', postId));
        } catch (error) {
            console.error('Error deleting post:', error);
            throw error;
        }
    }
}

export const postService = new PostService();
