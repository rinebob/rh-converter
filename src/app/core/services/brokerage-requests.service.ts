import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Auth, getIdToken } from '@angular/fire/auth';
import { RequestStatus } from '../common/interfaces';

export interface SubmitBrokerageRequestPayload {
  brokerageName: string;
  country?: string | null;
  notes?: string | null;
  displayName?: string | null;
  deviceId?: string | null;
  exampleFilePath?: string | null; // optional path in Firebase Storage
}

export interface SubmitResponse {
  success: boolean;
  id?: string;
  error?: string;
}

export interface AdminReplyPayload {
  requestId: string;
  message?: string;
  newStatus?: RequestStatus;
}

export interface AdminReplyResponse {
  success: boolean;
  replyId?: string;
  error?: string;
}

export interface AdminListItemDto {
  id: string;
  brokerageName: string;
  country: string | null;
  notes: string | null;
  createdAt: number | null; // millis
  authorUid: string | null;
  authorDeviceId: string | null;
  displayName: string | null;
  status: RequestStatus;
  upvoteCount: number;
  exampleFilePath?: string | null;
  exampleFileName?: string | null;
  // New prioritization metrics
  repliesCount?: number;
  lastVotedAtMs?: number | null;
  lastReplyAtMs?: number | null;
  lastActivityMs?: number | null;
  hasExampleFile?: boolean;
  last24hVotes?: number;
  last7dVotes?: number;
  hotScore?: number;
}

export interface AdminListResponse {
  success: boolean;
  items: AdminListItemDto[];
  error?: string;
}

export interface VotePayload {
  requestId: string;
  direction: 'up' | 'down';
  deviceId?: string | null;
  displayName?: string | null;
}

export interface VoteResponse {
  success: boolean;
  newCount?: number;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class BrokerageRequestsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);
  private readonly baseUrl = `${environment.api.functionsBaseUrl}`;

  submitRequest(payload: SubmitBrokerageRequestPayload): Observable<SubmitResponse> {
    const url = `${this.baseUrl}/submitBrokerageRequest`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<SubmitResponse>(url, JSON.stringify(payload), { headers });
  }

  adminReply(payload: AdminReplyPayload): Observable<AdminReplyResponse> {
    const url = `${this.baseUrl}/adminReplyToBrokerageRequest`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<AdminReplyResponse>(url, JSON.stringify(payload), { headers });
  }

  listRequests(): Observable<AdminListResponse> {
    const url = `${this.baseUrl}/listBrokerageRequests`;
    return from(getIdToken(this.auth.currentUser!, true)).pipe(
      switchMap((token) => {
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        return this.http.get<AdminListResponse>(url, { headers });
      })
    );
  }

  // Voting uses deviceId (no Firebase Auth required)
  vote(payload: VotePayload): Observable<VoteResponse> {
    const url = `${this.baseUrl}/voteBrokerageRequest`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<VoteResponse>(url, JSON.stringify(payload), { headers });
  }
}
