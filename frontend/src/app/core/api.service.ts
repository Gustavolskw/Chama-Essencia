import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Balance, Batch, BatchRequest, Invite, Margin, Material, MaterialRequest, Purchase, PurchaseRequest,
  Account, QuestionAnswer, Sale, SaleRequest, Settings, UserInfo,
} from './models';

type MarginRequest = Omit<Margin, 'id'>;

function range(from?: string | null, to?: string | null): Record<string, string> {
  const params: Record<string, string> = {};
  if (from) params['from'] = from;
  if (to) params['to'] = to;
  return params;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // --- estoque
  materials(): Observable<Material[]> {
    return this.http.get<Material[]>('/api/materials');
  }

  createMaterial(req: MaterialRequest): Observable<Material> {
    return this.http.post<Material>('/api/materials', req);
  }

  updateMaterial(id: string, req: MaterialRequest): Observable<Material> {
    return this.http.put<Material>(`/api/materials/${id}`, req);
  }

  deleteMaterial(id: string): Observable<void> {
    return this.http.delete<void>(`/api/materials/${id}`);
  }

  purchases(materialId?: string): Observable<Purchase[]> {
    return this.http.get<Purchase[]>('/api/purchases', { params: materialId ? { materialId } : {} });
  }

  createPurchase(req: PurchaseRequest): Observable<Purchase> {
    return this.http.post<Purchase>('/api/purchases', req);
  }

  updatePurchase(id: string, req: PurchaseRequest): Observable<Purchase> {
    return this.http.put<Purchase>(`/api/purchases/${id}`, req);
  }

  deletePurchase(id: string): Observable<void> {
    return this.http.delete<void>(`/api/purchases/${id}`);
  }

  // --- produção
  batches(): Observable<Batch[]> {
    return this.http.get<Batch[]>('/api/batches');
  }

  batch(id: string): Observable<Batch> {
    return this.http.get<Batch>(`/api/batches/${id}`);
  }

  previewBatch(req: BatchRequest, batchId: string | null): Observable<Batch> {
    return this.http.post<Batch>('/api/batches/preview', req, { params: batchId ? { batchId } : {} });
  }

  createBatch(req: BatchRequest): Observable<Batch> {
    return this.http.post<Batch>('/api/batches', req);
  }

  updateBatch(id: string, req: BatchRequest): Observable<Batch> {
    return this.http.put<Batch>(`/api/batches/${id}`, req);
  }

  deleteBatch(id: string): Observable<void> {
    return this.http.delete<void>(`/api/batches/${id}`);
  }

  // --- vendas
  sales(from?: string | null, to?: string | null): Observable<Sale[]> {
    return this.http.get<Sale[]>('/api/sales', { params: range(from, to) });
  }

  customers(): Observable<string[]> {
    return this.http.get<string[]>('/api/sales/customers');
  }

  createSale(req: SaleRequest): Observable<Sale> {
    return this.http.post<Sale>('/api/sales', req);
  }

  updateSale(id: string, req: SaleRequest): Observable<Sale> {
    return this.http.put<Sale>(`/api/sales/${id}`, req);
  }

  deleteSale(id: string): Observable<void> {
    return this.http.delete<void>(`/api/sales/${id}`);
  }

  // --- balanço
  balance(from?: string | null, to?: string | null): Observable<Balance> {
    return this.http.get<Balance>('/api/balance', { params: range(from, to) });
  }

  // --- configurações e margens
  settings(): Observable<Settings> {
    return this.http.get<Settings>('/api/settings');
  }

  saveSettings(s: Settings): Observable<Settings> {
    return this.http.put<Settings>('/api/settings', s);
  }

  margins(): Observable<Margin[]> {
    return this.http.get<Margin[]>('/api/margins');
  }

  createMargin(m: MarginRequest): Observable<Margin> {
    return this.http.post<Margin>('/api/margins', m);
  }

  updateMargin(id: string, m: MarginRequest): Observable<Margin> {
    return this.http.put<Margin>(`/api/margins/${id}`, m);
  }

  deleteMargin(id: string): Observable<void> {
    return this.http.delete<void>(`/api/margins/${id}`);
  }

  // --- usuários e perfil
  users(): Observable<UserInfo[]> {
    return this.http.get<UserInfo[]>('/api/users');
  }

  createInvite(): Observable<Invite> {
    return this.http.post<Invite>('/api/users/invites', null);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`/api/users/${id}`);
  }

  account(): Observable<Account> {
    return this.http.get<Account>('/api/account');
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>('/api/account/password', { currentPassword, newPassword });
  }

  changeQuestions(currentPassword: string, securityQuestions: QuestionAnswer[]): Observable<void> {
    return this.http.put<void>('/api/account/security-questions', { currentPassword, securityQuestions });
  }
}
