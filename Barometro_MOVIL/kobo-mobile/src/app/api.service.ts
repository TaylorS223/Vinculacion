import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

const TOKEN_KEY = 'kobo_token';

export interface LoginResponse {
  token: string;
  user: { id: number; name: string; email: string; rol: string };
}

export interface BackendForm {
  id: string;
  title: string;
  description?: string;
  link_uuid: string;
  state: string;
  questions: BackendQuestion[];
}

export interface BackendQuestion {
  id: string;
  type: 'TEXT' | 'NUMBER' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'LIKERT';
  label: string;
  options?: string[];
  required: boolean;
  order: number;
  likert_rows?: string[];
  likert_columns?: string[];
}

export interface SubmitResponse {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  private buildUrl(servidor: string, path: string): string {
    const base = servidor.replace(/\/+$/, '');
    return `${base}/api/${path.replace(/^\//, '')}`;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  login(servidor: string, email: string, password: string): Promise<LoginResponse> {
    const url = this.buildUrl(servidor, 'login');
    return lastValueFrom(
      this.http.post<LoginResponse>(url, { email, password }, {
        headers: { Accept: 'application/json' }
      })
    );
  }

  fetchForms(servidor: string): Promise<BackendForm[]> {
    const url = this.buildUrl(servidor, 'mobile/forms');
    return lastValueFrom(
      this.http.get<BackendForm[]>(url, { headers: this.getAuthHeaders() })
    );
  }

  fetchFormById(servidor: string, formId: string): Promise<BackendForm> {
    const url = this.buildUrl(servidor, `forms/${formId}`);
    return lastValueFrom(
      this.http.get<BackendForm>(url, { headers: this.getAuthHeaders() })
    );
  }

  submitResponse(servidor: string, linkUuid: string, data: Record<string, any>): Promise<SubmitResponse> {
    const url = this.buildUrl(servidor, `forms/submit/${linkUuid}`);
    return lastValueFrom(
      this.http.post<SubmitResponse>(url, { data }, {
        headers: this.getAuthHeaders()
      })
    );
  }

  logout(servidor: string): Promise<void> {
    const url = this.buildUrl(servidor, 'logout');
    return lastValueFrom(
      this.http.post<void>(url, {}, { headers: this.getAuthHeaders() })
    );
  }
}
