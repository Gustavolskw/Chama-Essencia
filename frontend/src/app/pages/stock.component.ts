import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { BrlPipe, DateBrPipe, QtyPipe } from '../core/format';
import { CATEGORIES, Material, MaterialRequest, Purchase, UNITS } from '../core/models';
import { PurchaseFormComponent } from '../shared/purchase-form.component';

type MaterialForm = MaterialRequest & { id: string | null };

@Component({
  selector: 'app-stock',
  imports: [FormsModule, BrlPipe, QtyPipe, DateBrPipe, PurchaseFormComponent],
  template: `
    <div class="page-head">
      <h1>Estoque</h1>
      <button class="btn ghost" type="button" (click)="newMaterial()">+ Insumo</button>
      <button class="btn" type="button" (click)="openPurchase(null, null)">+ Nova compra</button>
      <p class="sub">Cada compra entra como um lote. Os pacotes de produção consomem os lotes do mais antigo para o
        mais novo, cada um ao seu custo.</p>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="label">Valor em estoque</div><div class="value">{{ totals().value | brl }}</div>
        <div class="detail">ao custo de cada lote</div></div>
      <div class="kpi"><div class="label">Insumos cadastrados</div><div class="value">{{ materials().length }}</div>
        <div class="detail">{{ totals().lots }} lote(s) de compra</div></div>
      <div class="kpi"><div class="label">Estoque baixo</div>
        <div class="value" [class.neg]="totals().low > 0">{{ totals().low }}</div>
        <div class="detail">no mínimo definido ou abaixo</div></div>
      <div class="kpi"><div class="label">Total já comprado</div><div class="value">{{ totals().spent | brl }}</div>
        <div class="detail">todas as compras</div></div>
    </div>

    @if (message()) { <div [class]="ok() ? 'success' : 'error'">{{ message() }}</div> }

    <div class="tabs" role="tablist">
      <button type="button" role="tab" [class.active]="tab() === 'materials'" (click)="tab.set('materials')">Insumos</button>
      <button type="button" role="tab" [class.active]="tab() === 'purchases'" (click)="tab.set('purchases')">Compras (lotes)</button>
    </div>

    @if (tab() === 'materials') {
      <div class="toolbar">
        <input type="search" placeholder="Buscar insumo" [ngModel]="search()" (ngModelChange)="search.set($event)" aria-label="Buscar insumo">
        <label class="check"><input type="checkbox" [ngModel]="onlyLow()" (ngModelChange)="onlyLow.set($event)"> Só estoque baixo</label>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Insumo</th><th>Categoria</th><th class="r">Saldo</th><th class="r">Custo médio</th>
              <th class="r">Última compra</th><th class="r">Valor</th><th class="r">Consumido</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (m of filteredMaterials(); track m.id) {
              <tr>
                <td>
                  <strong>{{ m.name }}</strong>
                  @if (m.lowStock) { <span class="tag low">baixo</span> }
                  @if (m.note) { <div class="hint">{{ m.note }}</div> }
                </td>
                <td class="muted">{{ m.category ?? '—' }}</td>
                <td class="r"><strong>{{ m.stock | qty: m.unit }}</strong>
                  @if (m.minStock > 0) { <div class="hint">mín. {{ m.minStock | qty: m.unit }}</div> }</td>
                <td class="r">{{ m.avgUnitCost | brl: true }}/{{ m.unit }}</td>
                <td class="r">{{ m.lastUnitCost | brl: true }}/{{ m.unit }}<div class="hint">{{ m.lastPurchaseDate | dateBr }}</div></td>
                <td class="r">{{ m.stockValue | brl }}</td>
                <td class="r muted">{{ m.totalConsumed | qty: m.unit }}</td>
                <td class="actions">
                  <button class="btn ghost small" type="button" (click)="openPurchase(m.id, null)">+ Compra</button>
                  <button class="icon-btn" type="button" (click)="showLots(m)" title="Ver lotes" [attr.aria-label]="'Ver lotes de ' + m.name">☰</button>
                  <button class="icon-btn" type="button" (click)="editMaterial(m)" title="Editar" [attr.aria-label]="'Editar ' + m.name">✎</button>
                  <button class="icon-btn del" type="button" (click)="removeMaterial(m)" title="Remover" [attr.aria-label]="'Remover ' + m.name">×</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty">
                @if (materials().length) { Nenhum insumo encontrado. }
                @else { Nenhum insumo ainda. Registre a primeira compra (ex.: cera, essência, potes, pavios). }
              </td></tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="toolbar">
        <select [ngModel]="lotFilter()" (ngModelChange)="lotFilter.set($event)" aria-label="Filtrar por insumo">
          <option value="">Todos os insumos</option>
          @for (m of materials(); track m.id) { <option [value]="m.id">{{ m.name }}</option> }
        </select>
        <label class="check"><input type="checkbox" [ngModel]="onlyOpen()" (ngModelChange)="onlyOpen.set($event)"> Só lotes com saldo</label>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Data</th><th>Insumo</th><th class="r">Comprado</th><th class="r">Preço pago</th>
              <th class="r">Custo unit.</th><th>Uso do lote</th><th>Fornecedor</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (p of filteredPurchases(); track p.id) {
              <tr>
                <td>{{ p.date | dateBr }}</td>
                <td><strong>{{ p.materialName }}</strong>@if (p.note) { <div class="hint">{{ p.note }}</div> }</td>
                <td class="r">{{ p.quantity | qty: p.unit }}</td>
                <td class="r">{{ p.totalPrice | brl }}</td>
                <td class="r">{{ p.unitCost | brl: true }}</td>
                <td class="usage">
                  <div class="bar" [attr.aria-label]="'Usado ' + usedPct(p) + '%'"><span [style.width.%]="usedPct(p)"></span></div>
                  <span class="hint">resta {{ p.remaining | qty: p.unit }} · usado {{ p.consumed | qty: p.unit }}</span>
                </td>
                <td class="muted">{{ p.supplier ?? '—' }}</td>
                <td class="actions">
                  <button class="icon-btn" type="button" (click)="openPurchase(null, p)" title="Editar" aria-label="Editar compra">✎</button>
                  <button class="icon-btn del" type="button" (click)="removePurchase(p)" [disabled]="p.consumed > 0"
                          [title]="p.consumed > 0 ? 'Lote já usado em pacotes' : 'Remover'" aria-label="Remover compra">×</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty">Nenhuma compra encontrada.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (purchaseModal(); as pm) {
      <app-purchase-form [materials]="materials()" [purchase]="pm.purchase" [presetMaterialId]="pm.materialId"
                         (saved)="purchaseSaved()" (cancel)="purchaseModal.set(null)" />
    }

    @if (materialForm(); as f) {
      <div class="backdrop" (click)="materialForm.set(null)">
        <form class="card modal" (click)="$event.stopPropagation()" (ngSubmit)="saveMaterial(f)">
          <h2>{{ f.id ? 'Editar insumo' : 'Novo insumo' }}</h2>
          @if (formError()) { <div class="error">{{ formError() }}</div> }
          <div class="field">
            <label for="mn">Nome</label>
            <input id="mn" name="mn" [(ngModel)]="f.name" maxlength="80" required placeholder="Ex.: Cera de coco">
          </div>
          <div class="row">
            <div class="field">
              <label for="mu">Unidade de controle</label>
              <select id="mu" name="mu" [(ngModel)]="f.unit">
                @for (u of units; track u.key) { <option [value]="u.key">{{ u.label }}</option> }
              </select>
            </div>
            <div class="field">
              <label for="mc">Categoria</label>
              <select id="mc" name="mc" [(ngModel)]="f.category">
                <option [ngValue]="null">—</option>
                @for (c of categories; track c) { <option [value]="c">{{ c }}</option> }
              </select>
            </div>
          </div>
          <p class="hint" style="margin-top: -8px">A unidade vale para compras e consumo. Ex.: cera em g — 1 kg comprado
            = 1000 g.</p>
          <div class="field">
            <label for="mmin">Alerta de estoque baixo (em {{ f.unit }})</label>
            <input id="mmin" name="mmin" type="number" min="0" step="any" [(ngModel)]="f.minStock">
            <p class="hint">Avisa quando o saldo chegar neste valor. 0 = sem alerta.</p>
          </div>
          <div class="field">
            <label for="mnote">Observação</label>
            <input id="mnote" name="mnote" [(ngModel)]="f.note" maxlength="500">
          </div>
          <div class="actions">
            <button class="btn ghost" type="button" (click)="materialForm.set(null)">Cancelar</button>
            <button class="btn" type="submit">Salvar</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: `
    .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
    .toolbar input[type="search"], .toolbar select { max-width: 320px; }
    .usage { min-width: 170px; }
    .bar { height: 6px; border-radius: 3px; background: var(--surface-2); border: 1px solid var(--border); overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--accent); }
    td .tag { margin-left: 6px; }
  `,
})
export class StockComponent implements OnInit {
  private api = inject(ApiService);

  units = UNITS;
  categories = CATEGORIES;
  tab = signal<'materials' | 'purchases'>('materials');
  materials = signal<Material[]>([]);
  purchases = signal<Purchase[]>([]);
  search = signal('');
  onlyLow = signal(false);
  lotFilter = signal('');
  onlyOpen = signal(false);
  message = signal('');
  ok = signal(true);
  formError = signal('');

  purchaseModal = signal<{ materialId: string | null; purchase: Purchase | null } | null>(null);
  materialForm = signal<MaterialForm | null>(null);

  totals = computed(() => {
    const list = this.materials();
    return {
      value: list.reduce((s, m) => s + m.stockValue, 0),
      spent: list.reduce((s, m) => s + m.totalSpent, 0),
      lots: list.reduce((s, m) => s + m.lots, 0),
      low: list.filter(m => m.lowStock).length,
    };
  });

  filteredMaterials = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.materials().filter(m =>
      (!q || m.name.toLowerCase().includes(q) || (m.category ?? '').toLowerCase().includes(q))
      && (!this.onlyLow() || m.lowStock));
  });

  filteredPurchases = computed(() => this.purchases().filter(p =>
    (!this.lotFilter() || p.materialId === this.lotFilter()) && (!this.onlyOpen() || p.remaining > 0)));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.materials().subscribe(list => this.materials.set(list));
    this.api.purchases().subscribe(list => this.purchases.set(list));
  }

  usedPct(p: Purchase): number {
    return p.quantity > 0 ? Math.round(p.consumed / p.quantity * 100) : 0;
  }

  showLots(m: Material): void {
    this.lotFilter.set(m.id);
    this.tab.set('purchases');
  }

  openPurchase(materialId: string | null, purchase: Purchase | null): void {
    this.purchaseModal.set({ materialId, purchase });
  }

  purchaseSaved(): void {
    this.purchaseModal.set(null);
    this.flash(true, 'Compra salva no estoque.');
    this.load();
  }

  removePurchase(p: Purchase): void {
    if (!confirm(`Remover a compra de ${p.materialName} de ${p.date.split('-').reverse().join('/')}?`)) return;
    this.api.deletePurchase(p.id).subscribe({
      next: () => { this.flash(true, 'Compra removida.'); this.load(); },
      error: err => this.flash(false, errorMessage(err)),
    });
  }

  newMaterial(): void {
    this.formError.set('');
    this.materialForm.set({ id: null, name: '', unit: 'un', category: null, minStock: 0, note: null });
  }

  editMaterial(m: Material): void {
    this.formError.set('');
    this.materialForm.set({ id: m.id, name: m.name, unit: m.unit, category: m.category, minStock: m.minStock, note: m.note });
  }

  saveMaterial(f: MaterialForm): void {
    const { id, ...body } = f;
    body.minStock = Number(body.minStock) || 0;
    (id ? this.api.updateMaterial(id, body) : this.api.createMaterial(body)).subscribe({
      next: () => { this.materialForm.set(null); this.flash(true, 'Insumo salvo.'); this.load(); },
      error: err => this.formError.set(errorMessage(err)),
    });
  }

  removeMaterial(m: Material): void {
    if (!confirm(`Remover o insumo "${m.name}"?`)) return;
    this.api.deleteMaterial(m.id).subscribe({
      next: () => { this.flash(true, 'Insumo removido.'); this.load(); },
      error: err => this.flash(false, errorMessage(err)),
    });
  }

  private flash(ok: boolean, message: string): void {
    this.ok.set(ok);
    this.message.set(message);
  }
}
