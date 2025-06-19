import { Injectable, inject, signal, WritableSignal, OnDestroy } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  collectionData,
  doc,
  Unsubscribe
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Comment } from '../common/interfaces';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CommentsService implements OnDestroy {
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService);

  private commentsCollectionPath = 'comments';
  private commentsSignal: WritableSignal<Comment[]> = signal<Comment[]>([]);
  private unsubscribeFromComments: Unsubscribe | null = null;

  // Public readonly signal for components to consume
  public readonly comments$ = this.commentsSignal.asReadonly();

  constructor() {}

  /**
   * Fetches comments for a given fileId in real-time and updates the commentsSignal.
   * @param fileId The ID of the file to fetch comments for.
   */
  loadComments(fileId: string): void {
    // Unsubscribe from previous listener if any
    if (this.unsubscribeFromComments) {
      this.unsubscribeFromComments();
      this.unsubscribeFromComments = null;
    }

    if (!fileId) {
      this.commentsSignal.set([]);
      return;
    }

    const commentsCol = collection(this.firestore, this.commentsCollectionPath);
    const commentsQuery = query(
      commentsCol,
      where('fileId', '==', fileId),
      orderBy('createdAt', 'asc')
    );

    this.unsubscribeFromComments = onSnapshot(commentsQuery, (snapshot) => {
      const comments = snapshot.docs.map(document => ({
        id: document.id,
        ...(document.data() as Omit<Comment, 'id'>)
      }));
      this.commentsSignal.set(comments);
    }, (error) => {
      console.error('Error fetching comments: ', error);
      this.commentsSignal.set([]); // Clear comments on error or set an error state
    });
  }

  /**
   * Adds a new comment to Firestore.
   * @param fileId The ID of the file the comment belongs to.
   * @param text The content of the comment.
   * @returns A Promise that resolves when the comment is successfully added.
   */
  async addComment(fileId: string, text: string): Promise<void> {
    const user = this.authService.currentUser; // Assuming AuthService has a synchronous way to get current user
    if (!user) {
      throw new Error('User must be logged in to comment.');
    }
    if (!fileId || !text.trim()) {
      throw new Error('File ID and comment text cannot be empty.');
    }

    const newComment: Omit<Comment, 'id'> = {
      fileId,
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      text: text.trim(),
      createdAt: Timestamp.now()
    };

    const commentsCol = collection(this.firestore, this.commentsCollectionPath);
    try {
      await addDoc(commentsCol, newComment);
    } catch (error) {
      console.error('Error adding comment: ', error);
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  ngOnDestroy(): void {
    if (this.unsubscribeFromComments) {
      this.unsubscribeFromComments();
    }
  }
}
