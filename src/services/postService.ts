import { db, storage } from '../lib/firebase';
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
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export interface Post {
    id: string;
    authorId: string;
    authorName: string;
    authorRole: 'student';
    hostelId: string;
    text: string;
    imageUrl?: string;
    createdAt: Timestamp;
}

interface CreatePostData {
    text: string;
    imageFile?: File;
    userData: {
        uid: string;
        name: string;
        hostelId: string;
    };
}

class PostService {
    /**
     * Create a new post with optional image
     */
    async createPost({ text, imageFile, userData }: CreatePostData): Promise<string> {
        try {
            // Validate text length
            if (text.length > 280) {
                throw new Error('Post text cannot exceed 280 characters');
            }

            // Validate image file size if present
            if (imageFile && imageFile.size > 1024 * 1024) {
                throw new Error('Image size must be less than 1MB');
            }

            let imageUrl: string | undefined;

            // Upload image if present
            if (imageFile) {
                const imageRef = ref(storage, `post_images/${Date.now()}_${imageFile.name}`);
                await uploadBytes(imageRef, imageFile);
                imageUrl = await getDownloadURL(imageRef);
            }

            // Create post document
            const postData = {
                authorId: userData.uid,
                authorName: userData.name,
                authorRole: 'student' as const,
                hostelId: userData.hostelId,
                text: text.trim(),
                imageUrl: imageUrl || null,
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
     */
    async deletePost(postId: string, imageUrl?: string): Promise<void> {
        try {
            // Delete image from storage if exists
            if (imageUrl) {
                const imageRef = ref(storage, imageUrl);
                await deleteObject(imageRef).catch(err => {
                    console.warn('Failed to delete image:', err);
                });
            }

            // Delete document
            await deleteDoc(doc(db, 'posts', postId));
        } catch (error) {
            console.error('Error deleting post:', error);
            throw error;
        }
    }
}

export const postService = new PostService();
