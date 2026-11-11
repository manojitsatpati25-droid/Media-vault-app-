import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';
import { MediaItem, SavedItem } from '../types';

/**
 * Toggles bookmark status for a media item in Firestore subcollection /users/{userId}/saved/{mediaId}
 */
export async function toggleSaveMediaInFirestore(
  userId: string,
  media: MediaItem,
  isCurrentlySaved: boolean
): Promise<boolean> {
  const saveDocRef = doc(db, 'users', userId, 'saved', media.id);

  if (isCurrentlySaved) {
    try {
      await deleteDoc(saveDocRef);
      return false;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}/saved/${media.id}`);
    }
  } else {
    try {
      const savedPayload: SavedItem = {
        mediaId: media.id,
        userId: userId,
        savedAt: new Date().toISOString(),
        media: {
          id: media.id,
          title: media.title,
          description: media.description || '',
          mediaType: media.mediaType,
          url: media.url,
          thumbnailUrl: media.thumbnailUrl || media.url,
          category: media.category,
          tags: media.tags || [],
          author: media.author,
          authorAvatar: media.authorAvatar || '',
          views: media.views || 0,
          likes: media.likes || 0,
          createdAt: media.createdAt,
          duration: media.duration || '',
          fileSize: media.fileSize || '',
          dimensions: media.dimensions || '',
          comments: [],
        },
      };
      await setDoc(saveDocRef, savedPayload);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${userId}/saved/${media.id}`);
    }
  }
}
