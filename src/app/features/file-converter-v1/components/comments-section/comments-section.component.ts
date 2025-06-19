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
  readonly comments = this.commentsService.comments$;
  readonly isLoggedIn = computed(() => !!this.authService.currentUser);
  readonly anonymousUserName = signal(this.anonymousNameService.getName());

  constructor() {
  }

  ngOnInit(): void {
    this.commentsService.loadComments();
  }

  async addComment(): Promise<void> {
    const text = this.newComment().trim();
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
