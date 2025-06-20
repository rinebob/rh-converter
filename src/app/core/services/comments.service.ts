import { Injectable, inject, signal, WritableSignal, OnDestroy, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  query,
  orderBy,
  Timestamp,
  collectionData,
  doc,
  Query,
  deleteDoc
} from '@angular/fire/firestore';
import { Observable, Subscription } from 'rxjs';
import { Comment } from '../common/interfaces';
import { AuthService } from './auth.service';
import { AnonymousNameService } from './anonymous-name.service';

@Injectable({
  providedIn: 'root'
})
export class CommentsService implements OnDestroy {
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService);
  private anonymousNameService: AnonymousNameService = inject(AnonymousNameService);
  private injector = inject(Injector);

  private commentsCollectionPath = 'comments';
  private commentsSignal: WritableSignal<Comment[]> = signal<Comment[]>([]);
  private commentsSubscription: Subscription | null = null;

  // Public readonly signal for components to consume
  public readonly comments$ = this.commentsSignal.asReadonly();

  constructor() {}

  /**
   * Fetches comments in real-time and updates the commentsSignal.
   */
  loadComments(): void {
    // Unsubscribe from previous listener if any
    if (this.commentsSubscription) {
      this.commentsSubscription.unsubscribe();
      this.commentsSubscription = null;
    }

    runInInjectionContext(this.injector, () => {
      const commentsCol = collection(this.firestore, this.commentsCollectionPath);
      const commentsQuery = query(
        commentsCol,
        orderBy('createdAt', 'asc')
      ) as Query<Omit<Comment, 'id'>>; // Query for data as it exists in Firestore

      // collectionData will add the 'id' field to produce objects of type 'Comment'
      this.commentsSubscription = collectionData<Comment>(commentsQuery, { idField: 'id' })
        .subscribe({
          next: (comments) => {
            // Ensure that the data conforms to the Comment interface, especially Timestamps
            const typedComments = comments.map(comment => ({
              ...comment,
              createdAt: comment.createdAt instanceof Timestamp ? comment.createdAt : Timestamp.fromDate(new Date()) // Example handling, adjust if createdAt is already a Timestamp
            })) as Comment[];
            this.commentsSignal.set(typedComments);
          },
          error: (error) => {
            console.error('Error fetching comments: ', error);
            this.commentsSignal.set([]); // Clear comments on error or set an error state
          }
        });
    });
  }

  /**
   * Adds a new comment to Firestore.
   * @param text The content of the comment.
   * @param parentId Optional ID of the parent comment if this is a reply.
   * @returns A Promise that resolves when the comment is successfully added.
   */
  async addComment(text: string, parentId?: string): Promise<void> {
    const user = this.authService.currentUser;

    if (!text.trim()) {
      throw new Error('Comment text cannot be empty.');
    }

    let userId: string;
    let userName: string | null | undefined;

    if (user) {
      userId = user.uid;
      userName = user.displayName;
    } else {
      userId = 'anonymous'; // Or a more unique anonymous ID if needed
      userName = this.anonymousNameService.getName();
    }

    const newComment: Omit<Comment, 'id'> = {
      userId,
      userName: userName ?? undefined, // Convert null to undefined
      text: text.trim(),
      createdAt: Timestamp.now()
    };

    // Add parentId if it exists
    if (parentId) {
      newComment.parentId = parentId;
    }

    console.log('Firestore ADD_COMMENT Attempt:');
    console.log('User (from authService.currentUser$):', user ? { uid: user.uid, displayName: user.displayName, email: user.email } : 'Anonymous');
    console.log('Data being sent (newComment):', JSON.stringify(newComment, null, 2));

    await runInInjectionContext(this.injector, async () => {
      const commentsCol = collection(this.firestore, this.commentsCollectionPath);
      try {
        await addDoc(commentsCol, newComment);
      } catch (error) {
        console.error('Error adding comment: ', error);
        throw error; // Re-throw the error to be handled by the caller
      }
    });
  }

  /**
   * Deletes a comment from Firestore.
   * @param commentId The ID of the comment to delete.
   */
  async deleteComment(commentId: string): Promise<void> {
    if (!commentId) {
      throw new Error('Comment ID cannot be empty.');
    }
    await runInInjectionContext(this.injector, async () => {
      const commentDocRef = doc(this.firestore, this.commentsCollectionPath, commentId);
      try {
        await deleteDoc(commentDocRef);
      } catch (error) {
        console.error('Error deleting comment: ', error);
        throw error;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.commentsSubscription) {
      this.commentsSubscription.unsubscribe();
    }
  }
}
