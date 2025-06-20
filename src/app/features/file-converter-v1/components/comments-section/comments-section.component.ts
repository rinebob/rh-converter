import { Component, signal, inject, OnInit, WritableSignal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Timestamp } from 'firebase/firestore';

import { Comment } from '../../../../core/common/interfaces';
import { MAX_COMMENT_LENGTH, TRUNCATE_COMMENT_LENGTH } from '../../../../core/common/constants';
import { CommentsService } from '../../../../core/services/comments.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AnonymousNameService } from '../../../../core/services/anonymous-name.service';

@Component({
  selector: 'rh-comments-section',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatListModule,
    MatSnackBarModule
  ],
  templateUrl: './comments-section.component.html',
  styleUrl: './comments-section.component.scss'
})
export class CommentsSectionComponent implements OnInit {
  private commentsService = inject(CommentsService);
  public authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private anonymousNameService = inject(AnonymousNameService);

  newComment: WritableSignal<string> = signal('');
  commentError = signal<string | null>(null);
  readonly comments = this.commentsService.comments$;
  readonly isLoggedIn = computed(() => !!this.authService.currentUser);
  readonly anonymousUserName = signal(this.anonymousNameService.getName());
  readonly maxCommentLength = MAX_COMMENT_LENGTH;
  readonly truncateLength = TRUNCATE_COMMENT_LENGTH;

  // State for active reply form
  replyingToCommentId = signal<string | null>(null);
  newReplyText: WritableSignal<string> = signal('');
  replyError = signal<string | null>(null);

  // Set to store the IDs of expanded comments
  expandedComments = signal<Set<string>>(new Set());

  // Processed comments with hierarchical structure
  processedComments$ = computed(() => {
    const allComments = this.comments();
    const commentsMap = new Map<string, Comment & { replies: Comment[] }>();
    const rootComments: (Comment & { replies: Comment[] })[] = [];

    // Initialize map and replies array for each comment
    allComments.forEach(comment => {
      commentsMap.set(comment.id!, { ...comment, replies: [] });
    });

    // Populate replies and identify root comments
    allComments.forEach(comment => {
      const commentWithReplies = commentsMap.get(comment.id!)!;
      if (comment.parentId && commentsMap.has(comment.parentId)) {
        commentsMap.get(comment.parentId)!.replies.push(commentWithReplies);
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    // Sort root comments by createdAt (already done by service, but good for safety)
    // Replies will be in the order they were pushed (which is createdAt due to initial sort)
    return rootComments.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
  });

  constructor() {
    effect(() => {
      const text = this.newComment();
      if (text.length > this.maxCommentLength) {
        this.commentError.set(`Comment too long: ${text.length} / ${this.maxCommentLength}`);
      } else {
        this.commentError.set(null);
      }
    });

    effect(() => {
      const replyText = this.newReplyText();
      if (replyText.length > this.maxCommentLength) {
        this.replyError.set(`Reply too long: ${replyText.length} / ${this.maxCommentLength}`);
      } else {
        this.replyError.set(null);
      }
    });
  }

  ngOnInit(): void {
    this.commentsService.loadComments();
  }

  toggleCommentExpansion(commentId: string): void {
    this.expandedComments.update(currentSet => {
      const newSet = new Set(currentSet);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  }

  isExpanded(commentId: string): boolean {
    return this.expandedComments().has(commentId);
  }

  // Method to toggle the visibility of the reply form for a specific comment
  toggleReplyForm(commentId: string): void {
    if (this.replyingToCommentId() === commentId) {
      this.replyingToCommentId.set(null); // Close if already replying to this one
    } else {
      this.replyingToCommentId.set(commentId);
      this.newReplyText.set(''); // Clear previous reply text
      this.replyError.set(null);
    }
  }

  // Method to cancel replying
  cancelReply(): void {
    this.replyingToCommentId.set(null);
    this.newReplyText.set('');
    this.replyError.set(null);
  }

  async addComment(): Promise<void> {
    const text = this.newComment().trim();

    if (text.length > this.maxCommentLength) {
      const errorMessage = `Comment is too long. Maximum length is ${this.maxCommentLength} characters, but yours is ${text.length}.`;
      this.snackBar.open(errorMessage, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (text) {
      try {
        await this.commentsService.addComment(text);
        this.newComment.set('');
        this.snackBar.open('Comment added!', 'Close', { duration: 3000 });
      } catch (error) {
        console.error('Error adding comment:', error);
        this.snackBar.open('Failed to add comment. Please try again.', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    }
  }

  // Method to add a reply to a comment
  async addReply(parentCommentId: string): Promise<void> {
    if (!parentCommentId) {
      console.error('Parent comment ID is required to add a reply.');
      this.snackBar.open('Cannot add reply: Parent comment missing.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const replyText = this.newReplyText().trim();

    if (replyText.length > this.maxCommentLength) {
      const errorMessage = `Reply is too long. Maximum length is ${this.maxCommentLength} characters, but yours is ${replyText.length}.`;
      this.snackBar.open(errorMessage, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }
    
    if (replyText) {
      try {
        await this.commentsService.addComment(replyText, parentCommentId);
        this.newReplyText.set('');
        this.replyingToCommentId.set(null); // Close the reply form
        this.snackBar.open('Reply added!', 'Close', { duration: 3000 });
      } catch (error) {
        console.error('Error adding reply:', error);
        this.snackBar.open('Failed to add reply. Please try again.', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    }
  }

  async removeComment(commentId: string): Promise<void> {
    if (!commentId) return;
    try {
      await this.commentsService.deleteComment(commentId);
      this.snackBar.open('Comment removed!', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error removing comment:', error);
      this.snackBar.open('Failed to remove comment. Please try again.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }

  formatDate(timestamp: Timestamp | Date): string {
    if (!timestamp) return '';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}
