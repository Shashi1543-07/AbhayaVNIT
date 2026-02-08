import { db } from '../lib/firebase';
import { compressImageToBase64 } from '../lib/imageUtils';
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
    authorName: string; // This will store the username for students
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
        username?: string;
        hostelId: string;
        role?: 'student' | 'admin' | 'warden' | 'security';
    };
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

            // Anonymity: Use username for students, name for staff/admins
            const displayName = userData.role === 'student' ? (userData.username || 'Anonymous') : userData.name;

            // Create post document
            const postData = {
                authorId: userData.uid,
                authorName: displayName,
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
