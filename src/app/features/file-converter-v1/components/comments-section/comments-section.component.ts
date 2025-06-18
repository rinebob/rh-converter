import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';

export interface Comment {
  id: string;
  text: string;
  timestamp: Date;
}

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
    MatListModule
  ],
  templateUrl: './comments-section.component.html',
  styleUrl: './comments-section.component.scss'
})
export class CommentsSectionComponent {
  newComment = '';
  comments = signal<Comment[]>([]);

  addComment(): void {
    if (this.newComment.trim()) {
      this.comments.update(comments => [
        ...comments,
        {
          id: crypto.randomUUID(),
          text: this.newComment.trim(),
          timestamp: new Date()
        }
      ]);
      this.newComment = '';
    }
  }

  removeComment(commentId: string): void {
    this.comments.update(comments => 
      comments.filter(comment => comment.id !== commentId)
    );
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}
