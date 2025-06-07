import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProfile } from '../common/interfaces';
import { environment } from '../../../environments/environment';
import { FirestoreEndpoints } from '../common/firestore-endpoints';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.api.baseUrl;

  /**
   * Fetches a user's profile data from the server
   * @param userId The ID of the user whose profile to fetch
   * @returns An Observable that emits the user's profile data
   */
  getUserProfile(userId: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(
      `${this.baseUrl}/${FirestoreEndpoints.user(userId)}`
    );
  }

  /**
   * Updates specific fields of a user's profile
   * @param userId The ID of the user to update
   * @param updates Partial UserProfile object containing only the fields to update
   * @returns An Observable that emits the updated user profile
   */
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.patch<UserProfile>(
      `${this.baseUrl}/${FirestoreEndpoints.user(userId)}`,
      updates
    );
  }
}
