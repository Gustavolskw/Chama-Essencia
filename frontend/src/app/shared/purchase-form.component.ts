import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, map, of, switchMap, tap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { BrlPipe, isoDate } from '../core/format';
import { CATEGORIES, Material, Purchase, UNITS } from '../core/models';

/**
 * Modal de compra de insumo (entrada no estoque como um novo lote). Permite cadastrar o insumo na hora,
 * para comprar algo que ainda não existe no estoque.
 */
@Component({
  selector: 'app-purchase-form',
  imports: [FormsModule, BrlPipe],
  template: `
    <div class="backdrop" (click)="cancel.emit()">
      <form class="card modal" (click)="$event.stopPropagation()" (ngSubmit)="save()">
        <h2>{{ purchase() ? 'Editar compra' : 'Nova compra' }}</h2>
        @if (error()) { <div class="error">{{ error() }}</div> }
        @if (purchase()?.consumed) {
          <div class="warning">Já foram usados {{ purchase()!.consumed }} {{ purchase()!.unit }} deste lote em pacotes.
            A quantidade não pode ficar abaixo disso; alterar o preço recalcula o custo desses pacotes.</div>
        }

        @if (!newMaterial) {
          <div class="field">
            <label for="pm">Insumo</label>
            <div class="inline">
              <select id="pm" name="pm" [(ngModel)]="materialId" required [disabled]="!!purchase()?.consumed">
                <option value="" disabled>Escolha…</option>
                @for (m of materials(); track m.id) { <option [value]="m.id">{{ m.name }} ({{ m.unit }})</option> }
              </select>
              @if (!purchase()) {
                <button class="btn ghost small" type="button" (click)="newMaterial = true">+ Insumo novo</button>
              }
            </div>
          </div>
        } @else {
          <fieldset class="newmat">
            <legend>Insumo novo</legend>
            <div class="field">
              <label for="nmn">Nome</label>
              <input id="nmn" name="nmn" [(ngModel)]="mat.name" maxlength="80" placeholder="Ex.: Essência de lavanda" required>
            </div>
            <div class="row">
              <div class="field">
                <label for="nmu">Unidade de controle</label>
                <select id="nmu" name="nmu" [(ngModel)]="mat.unit">
                  @for (u of units; track u.key) { <option [value]="u.key">{{ u.label }}</option> }
                </select>
              </div>
              <div class="field">
                <label for="nmc">Categoria</label>
                <select id="nmc" name="nmc" [(ngModel)]="mat.category">
                  <option [ngValue]="null">—</option>
                  @for (c of categories; track c) { <option [value]="c">{{ c }}</option> }
                </select>
              </div>
            </div>
            <button class="btn ghost small" type="button" (click)="newMaterial = false">Usar insumo já cadastrado</button>
          </fieldset>
        }

        <div class="row">
          <div class="field">
            <label for="pd">Data da compra</label>
            <input id="pd" name="pd" type="date" [(ngModel)]="date" required>
          </div>
          <div class="field">
            <label for="pq">Quantidade comprada ({{ unit() }})</label>
            <input id="pq" name="pq" type="number" min="0" step="any" [(ngModel)]="quantity" required>
          </div>
          <div class="field">
            <label for="pp">Preço pago (R$)</label>
            <span class="money"><input id="pp" name="pp" type="number" min="0" step="0.01" [(ngModel)]="totalPrice" required placeholder="0,00"></span>
          </div>
        </div>
        <p class="unit-cost">Custo unitário: <strong>{{ unitCost() | brl: true }}</strong> por {{ unit() }}</p>
        <div class="row">
          <div class="field">
            <label for="ps">Fornecedor (opcional)</label>
            <input id="ps" name="ps" [(ngModel)]="supplier" maxlength="80">
          </div>
          <div class="field">
            <label for="pn">Observação (opcional)</label>
            <input id="pn" name="pn" [(ngModel)]="note" maxlength="500">
          </div>
        </div>
        <div class="actions">
          <button class="btn ghost" type="button" (click)="cancel.emit()">Cancelar</button>
          <button class="btn" type="submit" [disabled]="busy()">Salvar compra</button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .inline { display: flex; gap: 8px; align-items: center; }
    .newmat { border: 1px dashed var(--accent); border-radius: 8px; padding: 10px 12px; margin: 0 0 14px; }
    .newmat legend { font-weight: 600; color: var(--accent); padding: 0 4px; }
    .unit-cost { margin: -4px 0 14px; color: var(--muted); }
  `,
})
export class PurchaseFormComponent implements OnInit {
  private api = inject(ApiService);

  materials = input.required<Material[]>();
  purchase = input<Purchase | null>(null);
  /** Insumo já escolhido ao abrir (ex.: botão "+ Compra" na linha do insumo). */
  presetMaterialId = input<string | null>(null);

  saved = output<Purchase>();
  cancel = output<void>();

  units = UNITS;
  categories = CATEGORIES;
  newMaterial = false;
  mat = { name: '', unit: 'un', category: null as string | null };
  materialId = '';
  date = isoDate();
  quantity: number | null = null;
  totalPrice: number | null = null;
  supplier = '';
  note = '';
  busy = signal(false);
  error = signal('');

  ngOnInit(): void {
    const p = this.purchase();
    if (p) {
      this.materialId = p.materialId;
      this.date = p.date;
      this.quantity = p.quantity;
      this.totalPrice = p.totalPrice;
      this.supplier = p.supplier ?? '';
      this.note = p.note ?? '';
    } else {
      this.materialId = this.presetMaterialId() ?? '';
      this.newMaterial = !this.materials().length;
    }
  }

  unit(): string {
    if (this.newMaterial) return this.mat.unit;
    return this.materials().find(m => m.id === this.materialId)?.unit ?? 'un';
  }

  unitCost(): number {
    const q = Number(this.quantity);
    return q > 0 ? (Number(this.totalPrice) || 0) / q : 0;
  }

  save(): void {
    if (this.newMaterial && !this.mat.name.trim()) return this.error.set('Informe o nome do insumo novo.');
    if (!this.newMaterial && !this.materialId) return this.error.set('Escolha o insumo.');
    if (!(Number(this.quantity) > 0)) return this.error.set('Informe a quantidade comprada.');
    if (this.totalPrice == null || Number(this.totalPrice) < 0) return this.error.set('Informe o preço pago.');
    this.busy.set(true);
    this.error.set('');

    const materialId$: Observable<string> = this.newMaterial
      ? this.api.createMaterial({ name: this.mat.name, unit: this.mat.unit, category: this.mat.category, minStock: 0, note: null })
        .pipe(
          // Se a compra falhar depois, o insumo já existe: não tenta criar de novo ao salvar outra vez.
          tap(m => { this.newMaterial = false; this.materialId = m.id; }),
          map(m => m.id))
      : of(this.materialId);

    materialId$.pipe(switchMap(materialId => {
      const req = {
        materialId, date: this.date, quantity: Number(this.quantity), totalPrice: Number(this.totalPrice),
        supplier: this.supplier || null, note: this.note || null,
      };
      const p = this.purchase();
      return p ? this.api.updatePurchase(p.id, req) : this.api.createPurchase(req);
    })).subscribe({
      next: saved => this.saved.emit(saved),
      error: err => { this.busy.set(false); this.error.set(errorMessage(err)); },
    });
  }
}
