import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Subscription, catchError, debounceTime, forkJoin, of, switchMap, tap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/auth.interceptor';
import { BrlPipe, DateBrPipe, PctPipe, QtyPipe, isoDate } from '../../core/format';
import {
  AppliedMargin, Batch, BatchItem, BatchRequest, ExtraCost, ItemMode, Margin, MarginType, Material,
} from '../../core/models';
import { PurchaseFormComponent } from '../../shared/purchase-form.component';

interface ItemRow {
  materialId: string;
  mode: ItemMode;
  amount: number | null;
}

interface MarginRow extends AppliedMargin {
  selected: boolean;
}

@Component({
  selector: 'app-batch-editor',
  imports: [FormsModule, RouterLink, BrlPipe, PctPipe, QtyPipe, DateBrPipe, PurchaseFormComponent],
  template: `
    <div class="page-head">
      <a routerLink="/producao" class="back">← Pacotes</a>
      <h1>{{ batchId ? 'Pacote nº ' + (original()?.number ?? '') : 'Novo pacote de produção' }}</h1>
      @if (batchId) {
        <button class="btn danger" type="button" (click)="remove()" [disabled]="(original()?.sold ?? 0) > 0"
                [title]="(original()?.sold ?? 0) > 0 ? 'Pacote com vendas não pode ser removido' : 'Remover e devolver os insumos ao estoque'">Remover</button>
      }
    </div>

    @if (error()) { <div class="error">{{ error() }}</div> }
    @if (saved()) { <div class="success">{{ saved() }}</div> }

    <div class="layout">
      <form class="main" (input)="changed()" (change)="changed()" (ngSubmit)="save()">
        <section class="card">
          <h2>Identificação</h2>
          <div class="row">
            <div class="field wide">
              <label for="bn">Produto / nome do pacote</label>
              <input id="bn" name="bn" [(ngModel)]="name" maxlength="100" required placeholder="Ex.: Vela aromática – Natal" list="product-names">
              <datalist id="product-names">@for (n of productNames(); track n) { <option [value]="n"></option> }</datalist>
            </div>
            <div class="field">
              <label for="bd">Data de produção</label>
              <input id="bd" name="bd" type="date" [(ngModel)]="date" required>
            </div>
            <div class="field">
              <label for="bq">Velas produzidas</label>
              <input id="bq" name="bq" type="number" min="1" step="1" [(ngModel)]="quantity" required>
              @if ((original()?.sold ?? 0) > 0) { <p class="hint">{{ original()!.sold }} já vendida(s)</p> }
            </div>
          </div>
          <div class="type-switch" role="radiogroup" aria-label="Tipo de precificação">
            <label [class.on]="!seasonal">
              <input type="radio" name="bs" [value]="false" [(ngModel)]="seasonal">
              <span><strong>Normal</strong><small>Preço = Custo ÷ (1 − Margem)</small></span>
            </label>
            <label [class.on]="seasonal" class="seasonal">
              <input type="radio" name="bs" [value]="true" [(ngModel)]="seasonal">
              <span><strong>Sazonal</strong><small>Preço = Custo ÷ (1 − Margem − Margem sazonal)</small></span>
            </label>
          </div>
        </section>

        <section class="card">
          <div class="section-head">
            <h2>Insumos</h2>
            <span class="spacer"></span>
            <button class="btn ghost small" type="button" (click)="purchaseOpen.set(true)">+ Nova compra</button>
            <button class="btn small" type="button" (click)="addItem()">+ Insumo</button>
          </div>
          <p class="hint" style="margin: -6px 0 10px">Informe quanto vai em <strong>cada vela</strong> ou o total do
            <strong>pacote</strong>. O consumo sai do estoque (lote mais antigo primeiro). Comprou algo para este pacote?
            Use "+ Nova compra" — entra no estoque e já fica disponível aqui.</p>
          <div class="table-wrap">
            <table class="data items">
              <thead>
                <tr><th>Insumo</th><th>Quantidade</th><th class="r">Total no pacote</th><th class="r">Em estoque</th><th class="r">Custo</th><th></th></tr>
              </thead>
              <tbody>
                @for (it of items; track $index; let i = $index) {
                  @let pv = previewItem(it.materialId);
                  @let m = material(it.materialId);
                  <tr [class.short]="(pv?.shortage ?? 0) > 0">
                    <td>
                      <select [name]="'im' + i" [(ngModel)]="it.materialId" [attr.aria-label]="'Insumo ' + (i + 1)">
                        <option value="" disabled>Escolha…</option>
                        @for (mm of materials(); track mm.id) {
                          <option [value]="mm.id" [disabled]="usedElsewhere(mm.id, i)">{{ mm.name }}</option>
                        }
                      </select>
                    </td>
                    <td>
                      <div class="qty">
                        <input [name]="'ia' + i" type="number" min="0" step="any" [(ngModel)]="it.amount"
                               [attr.aria-label]="'Quantidade do insumo ' + (i + 1)">
                        <select [name]="'io' + i" [(ngModel)]="it.mode" aria-label="Quantidade por">
                          <option value="PER_UNIT">{{ m?.unit ?? '' }} por vela</option>
                          <option value="TOTAL">{{ m?.unit ?? '' }} no pacote</option>
                        </select>
                      </div>
                    </td>
                    <td class="r">{{ totalOf(it) | qty: m?.unit }}</td>
                    <td class="r">
                      {{ availableFor(it.materialId) | qty: m?.unit }}
                      @if ((pv?.shortage ?? 0) > 0) { <div class="hint neg">faltam {{ pv!.shortage | qty: m?.unit }}</div> }
                    </td>
                    <td class="r">
                      {{ (pv?.cost ?? 0) | brl }}
                      @if (pv) { <div class="hint">{{ pv.costPerUnit | brl: true }}/vela</div> }
                    </td>
                    <td class="actions">
                      @if (pv?.allocations?.length) {
                        <button class="icon-btn" type="button" (click)="toggleLots(it.materialId)" title="Ver lotes usados" aria-label="Ver lotes usados">☰</button>
                      }
                      <button class="icon-btn del" type="button" (click)="removeItem(i)" aria-label="Remover insumo">×</button>
                    </td>
                  </tr>
                  @if (pv && openLots().has(it.materialId)) {
                    <tr class="lots"><td colspan="6">
                      @for (a of pv.allocations; track a.lotId) {
                        <span>Compra de {{ a.purchaseDate | dateBr }}: {{ a.quantity | qty: m?.unit }} × {{ a.unitCost | brl: true }} = {{ a.quantity * a.unitCost | brl }}</span>
                      }
                      @if (pv.shortage > 0) {
                        <span class="neg">Falta {{ pv.shortage | qty: m?.unit }} (estimado pela última compra: {{ pv.shortageCost | brl }})</span>
                      }
                    </td></tr>
                  }
                } @empty {
                  <tr><td colspan="6" class="empty">Adicione os insumos da receita (cera, essência, pote, pavio...).</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <section class="card">
          <h2>Custos adicionais por vela (R$)</h2>
          @for (c of extraCosts; track $index; let i = $index) {
            <div class="cost-row">
              <input [name]="'cd' + i" [(ngModel)]="c.description" placeholder="Descrição" maxlength="60" [attr.aria-label]="'Descrição do custo ' + (i + 1)">
              <span class="money"><input [name]="'ca' + i" type="number" min="0" step="0.01" [(ngModel)]="c.amount" placeholder="0,00" [attr.aria-label]="'Valor em reais por vela do custo ' + (i + 1)"></span>
              <button class="icon-btn del" type="button" (click)="extraCosts.splice(i, 1); changed()" aria-label="Remover custo">×</button>
            </div>
          }
          <button class="btn ghost small" type="button" (click)="extraCosts.push({ description: '', amount: 0 })">+ Custo</button>
        </section>

        <section class="card">
          <div class="section-head">
            <h2>Margens</h2>
            <span class="spacer"></span>
            <button class="btn ghost small" type="button" (click)="reloadMargins()" title="Substitui pelas margens do cadastro">Usar margens do cadastro</button>
          </div>
          <p class="hint" style="margin: -6px 0 10px">Percentuais sobre o preço de venda. O pacote guarda uma cópia: mudar o
            cadastro não altera pacotes antigos até você recalcular.</p>
          @for (mr of marginRows; track $index; let i = $index) {
            <div class="margin-row" [class.dim]="mr.type === 'SEASONAL' && !seasonal">
              <label class="check">
                <input type="checkbox" [name]="'ms' + i" [(ngModel)]="mr.selected">
                {{ mr.name }}
                <span class="tag" [class.seasonal]="mr.type === 'SEASONAL'" [class.normal]="mr.type === 'PROFIT'">{{ typeLabel(mr.type) }}</span>
              </label>
              <div class="pct">
                <input [name]="'mp' + i" type="number" min="0" max="95" step="0.01" [(ngModel)]="mr.percent" [attr.aria-label]="'Percentual de ' + mr.name">
                <span>%</span>
              </div>
              @if (mr.type === 'SEASONAL' && !seasonal) { <span class="hint full">Só entra se o pacote for sazonal.</span> }
            </div>
          } @empty {
            <p class="muted">Nenhuma margem cadastrada. Cadastre em <a routerLink="/configuracoes">Margens e config.</a></p>
          }
        </section>

        <section class="card">
          <h2>Preço de venda</h2>
          <div class="price-mode">
            <label class="check"><input type="radio" name="pm" [value]="false" [(ngModel)]="manualPrice"> Usar o preço sugerido
              @if (preview(); as p) { <strong>({{ p.suggestedPrice | brl }})</strong> }</label>
            <label class="check"><input type="radio" name="pm" [value]="true" [(ngModel)]="manualPrice"> Definir manualmente</label>
            @if (manualPrice) {
              <span class="money"><input name="sp" type="number" min="0" step="0.01" [(ngModel)]="salePrice" class="price-input" placeholder="0,00" aria-label="Preço de venda manual em reais"></span>
            }
          </div>
          <div class="field" style="margin-top: 12px">
            <label for="bnote">Observação</label>
            <textarea id="bnote" name="bnote" [(ngModel)]="note" maxlength="1000" rows="2"></textarea>
          </div>
          <div class="form-actions">
            <a class="btn ghost" routerLink="/producao">Cancelar</a>
            <button class="btn" type="submit" [disabled]="busy() || !!preview()?.hasShortage">
              {{ batchId ? 'Salvar e recalcular' : 'Criar pacote e consumir estoque' }}
            </button>
          </div>
          @if (preview()?.hasShortage) { <p class="hint neg" style="text-align: right">Falta estoque de algum insumo. Registre a compra ou reduza as quantidades.</p> }
        </section>
      </form>

      <aside class="summary card">
        <h2>Resumo do cálculo</h2>
        @if (preview(); as p) {
          <dl>
            <dt>Materiais por vela</dt><dd>{{ p.materialCostPerUnit | brl: true }}</dd>
            <dt>Custos adicionais por vela</dt><dd>{{ p.extraCostPerUnit | brl }}</dd>
            <dt class="strong">Custo de produção por vela</dt><dd class="strong">{{ p.unitCost | brl }}</dd>
            <dt>Custo do pacote ({{ p.quantity }} velas)</dt><dd>{{ p.totalCost | brl }}</dd>
          </dl>
          <hr>
          <dl>
            <dt>Margens (lucro + outras)</dt><dd>{{ p.basePercent | pct }}</dd>
            <dt>Margem sazonal</dt><dd>{{ p.seasonalPercent | pct }}</dd>
          </dl>
          <div class="prices">
            <div [class.active]="!p.seasonal">
              <span>Preço normal</span><strong>{{ p.priceNormal | brl }}</strong>
              <small>{{ p.unitCost | brl }} ÷ (1 − {{ fraction(p.basePercent) }})</small>
            </div>
            <div [class.active]="p.seasonal" class="seasonal">
              <span>Preço sazonal</span><strong>{{ p.priceSeasonal | brl }}</strong>
              <small>{{ p.unitCost | brl }} ÷ (1 − {{ fraction(p.basePercent) }} − {{ fraction(p.seasonalPercent) }})</small>
            </div>
          </div>
          <dl>
            <dt class="strong">Preço de venda {{ p.manualPrice ? '(manual)' : '(sugerido)' }}</dt><dd class="strong big">{{ p.salePrice | brl }}</dd>
            <dt>Lucro por vela</dt><dd [class.pos]="p.profitPerUnit > 0" [class.neg]="p.profitPerUnit < 0">{{ p.profitPerUnit | brl }}</dd>
            <dt>Margem real sobre o preço</dt><dd>{{ p.realMarginPercent | pct }}</dd>
            <dt>Markup equivalente sobre o custo</dt><dd>{{ p.markupPercent | pct }}</dd>
            <dt>Lucro do pacote (todas vendidas)</dt><dd>{{ p.profitPerUnit * p.quantity | brl }}</dd>
          </dl>
          @if (p.realMarginPercent < p.appliedPercent - 0.01 && p.manualPrice) {
            <div class="warning small">O preço manual está abaixo do sugerido: a margem real ({{ p.realMarginPercent | pct }})
              é menor que a aplicada ({{ p.appliedPercent | pct }}).</div>
          }
          @if (batchId) {
            <hr>
            <dl>
              <dt>Vendidas</dt><dd>{{ p.sold }}</dd>
              <dt>Disponíveis</dt><dd>{{ p.available }}</dd>
            </dl>
          }
        } @else {
          <p class="muted">Preencha a quantidade de velas e os insumos para ver o custo e o preço.</p>
        }
        @if (previewError()) { <div class="error small">{{ previewError() }}</div> }
      </aside>
    </div>

    @if (purchaseOpen()) {
      <app-purchase-form [materials]="materials()" (saved)="purchaseSaved($event.materialId)" (cancel)="purchaseOpen.set(false)" />
    }
  `,
  styles: `
    .back { text-decoration: none; color: var(--muted); flex-basis: 100%; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
    .main { display: grid; gap: 16px; }
    .summary { position: sticky; top: 72px; }
    .section-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
    .section-head h2 { margin: 0; }
    .section-head .spacer { flex: 1; }
    .row .wide { grid-column: span 2; }
    @media (max-width: 600px) { .row .wide { grid-column: auto; } }
    .type-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .type-switch label { display: flex; gap: 10px; align-items: flex-start; border: 2px solid var(--border); border-radius: 10px;
                         padding: 10px 12px; cursor: pointer; font-weight: 400; margin: 0; }
    .type-switch label span { display: flex; flex-direction: column; }
    .type-switch small { color: var(--muted); }
    .type-switch label.on { border-color: var(--accent); background: var(--accent-soft); }
    .type-switch label.seasonal.on { border-color: var(--seasonal); background: var(--seasonal-soft); }
    .items select { min-width: 160px; }
    .qty { display: flex; gap: 4px; }
    .qty input { width: 90px; }
    .qty select { min-width: 120px; }
    tr.short td { background: var(--danger-soft); }
    tr.lots td { background: var(--surface-2); font-size: 12px; color: var(--muted); }
    tr.lots span { display: block; }
    .cost-row { display: grid; grid-template-columns: 1fr 120px auto; gap: 6px; margin-bottom: 6px; }
    .margin-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border); }
    .margin-row .check { flex: 1; margin: 0; }
    .margin-row.dim .check { opacity: .55; }
    .margin-row .full { flex-basis: 100%; margin: 0; }
    .pct { display: flex; align-items: center; gap: 4px; }
    .pct input { width: 90px; text-align: right; }
    .price-mode { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
    .price-mode .check { margin: 0; }
    .price-input { width: 140px; }
    dl { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; margin: 0; }
    dt { color: var(--muted); }
    dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
    .strong { font-weight: 700; color: var(--text); }
    .big { font-size: 20px; color: var(--accent); }
    hr { border: 0; border-top: 1px solid var(--border); margin: 12px 0; }
    .prices { display: grid; gap: 8px; margin: 12px 0; }
    .prices div { display: grid; grid-template-columns: 1fr auto; border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; opacity: .65; }
    .prices div small { grid-column: 1 / -1; color: var(--muted); font-size: 11px; }
    .prices div.active { opacity: 1; border-color: var(--accent); background: var(--accent-soft); }
    .prices div.seasonal.active { border-color: var(--seasonal); background: var(--seasonal-soft); }
    .small { font-size: 12px; margin-top: 12px; }
    @media (max-width: 960px) {
      .layout { grid-template-columns: 1fr; }
      .summary { position: static; order: -1; }
    }
  `,
})
export class BatchEditorComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  batchId: string | null = null;
  original = signal<Batch | null>(null);
  materials = signal<Material[]>([]);
  registeredMargins: Margin[] = [];
  productNames = signal<string[]>([]);

  name = '';
  date = isoDate();
  quantity: number | null = 10;
  seasonal = false;
  items: ItemRow[] = [];
  extraCosts: ExtraCost[] = [];
  marginRows: MarginRow[] = [];
  manualPrice = false;
  salePrice: number | null = null;
  note = '';

  preview = signal<Batch | null>(null);
  previewError = signal('');
  error = signal('');
  saved = signal('');
  busy = signal(false);
  openLots = signal(new Set<string>());

  private previewTrigger = new Subject<void>();
  private sub?: Subscription;

  /** Consumo do próprio pacote por insumo (devolvido ao estoque ao recalcular). */
  private ownUsage = computed(() => {
    const map = new Map<string, number>();
    this.original()?.items.forEach(i => map.set(i.materialId, i.total));
    return map;
  });

  ngOnInit(): void {
    this.batchId = this.route.snapshot.paramMap.get('id');
    const copyFrom = this.route.snapshot.queryParamMap.get('copiar');
    const source = this.batchId ?? copyFrom;

    this.sub = this.previewTrigger.pipe(
      debounceTime(350),
      switchMap(() => {
        const req = this.request(true);
        if (!req) return of(null);
        return this.api.previewBatch(req, this.batchId).pipe(
          tap(() => this.previewError.set('')),
          catchError(err => { this.previewError.set(errorMessage(err)); return of(null); }),
        );
      }),
    ).subscribe(p => this.preview.set(p));

    const flash = (history.state as { saved?: string } | null)?.saved;
    if (flash) this.saved.set(flash);

    forkJoin({
      materials: this.api.materials(),
      margins: this.api.margins(),
      settings: this.api.settings(),
      batches: this.api.batches(),
    }).subscribe(({ materials, margins, settings, batches }) => {
      this.materials.set(materials);
      this.registeredMargins = margins;
      this.productNames.set([...new Set(batches.map(b => b.name))].sort());
      const base = source ? batches.find(b => b.id === source) : null;
      if (base) {
        this.fill(base, !!this.batchId);
      } else {
        this.extraCosts = settings.defaultExtraCosts.map(c => ({ ...c }));
        this.marginRows = margins.map(m => this.row(m, m.defaultSelected));
        this.items = [{ materialId: '', mode: 'PER_UNIT', amount: null }];
      }
      this.changed();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private fill(b: Batch, editing: boolean): void {
    if (editing) {
      this.original.set(b);
      this.date = b.date;
      this.note = b.note ?? '';
      this.manualPrice = b.manualPrice;
      this.salePrice = b.manualPrice ? b.salePrice : null;
    }
    this.name = b.name;
    this.quantity = b.quantity;
    this.seasonal = b.seasonal;
    this.items = b.items.map(i => ({
      materialId: i.materialId, mode: i.mode, amount: i.mode === 'PER_UNIT' ? i.perUnit : i.total,
    }));
    this.extraCosts = b.extraCosts.map(c => ({ ...c }));
    const rows: MarginRow[] = b.margins.map(m => ({ ...m, selected: true }));
    for (const m of this.registeredMargins) {
      if (!rows.some(r => r.marginId === m.id)) rows.push(this.row(m, false));
    }
    this.marginRows = rows;
  }

  private row(m: Margin, selected: boolean): MarginRow {
    return { marginId: m.id, name: m.name, type: m.type, percent: m.percent, selected };
  }

  changed(): void {
    this.previewTrigger.next();
  }

  // ------------------------------------------------------------------ insumos

  material(id: string): Material | undefined {
    return this.materials().find(m => m.id === id);
  }

  previewItem(materialId: string): BatchItem | undefined {
    return this.preview()?.items.find(i => i.materialId === materialId);
  }

  availableFor(materialId: string): number {
    return (this.material(materialId)?.stock ?? 0) + (this.ownUsage().get(materialId) ?? 0);
  }

  totalOf(it: ItemRow): number {
    const amount = Number(it.amount) || 0;
    return it.mode === 'PER_UNIT' ? amount * (Number(this.quantity) || 0) : amount;
  }

  usedElsewhere(materialId: string, index: number): boolean {
    return this.items.some((it, j) => j !== index && it.materialId === materialId);
  }

  addItem(): void {
    this.items.push({ materialId: '', mode: 'PER_UNIT', amount: null });
  }

  removeItem(i: number): void {
    this.items.splice(i, 1);
    this.changed();
  }

  toggleLots(materialId: string): void {
    const next = new Set(this.openLots());
    if (next.has(materialId)) next.delete(materialId); else next.add(materialId);
    this.openLots.set(next);
  }

  purchaseSaved(materialId: string): void {
    this.purchaseOpen.set(false);
    this.api.materials().subscribe(list => {
      this.materials.set(list);
      // Insumo comprado agora: já entra no pacote se ainda não estiver.
      if (!this.items.some(i => i.materialId === materialId)) {
        const empty = this.items.find(i => !i.materialId);
        if (empty) empty.materialId = materialId;
        else this.items.push({ materialId, mode: 'PER_UNIT', amount: null });
      }
      this.changed();
    });
  }

  purchaseOpen = signal(false);

  // ------------------------------------------------------------------ margens

  typeLabel(t: MarginType): string {
    return t === 'PROFIT' ? 'Lucro' : t === 'SEASONAL' ? 'Sazonal' : 'Personalizada';
  }

  reloadMargins(): void {
    this.marginRows = this.registeredMargins.map(m => this.row(m, m.defaultSelected));
    this.changed();
  }

  fraction(percent: number): string {
    return (percent / 100).toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  }

  // ------------------------------------------------------------------ gravação

  /** Monta a requisição; na simulação ignora linhas incompletas. */
  private request(forPreview: boolean): BatchRequest | null {
    const qty = Math.floor(Number(this.quantity) || 0);
    const items = this.items
      .filter(i => i.materialId && Number(i.amount) > 0)
      .map(i => ({ materialId: i.materialId, mode: i.mode, amount: Number(i.amount) }));
    if (forPreview && (qty < 1 || !items.length)) return null;
    return {
      name: this.name.trim() || 'Pacote',
      date: this.date || isoDate(),
      quantity: qty,
      seasonal: this.seasonal,
      items,
      extraCosts: this.extraCosts.filter(c => c.description?.trim()).map(c => ({ description: c.description, amount: Number(c.amount) || 0 })),
      margins: this.marginRows.filter(m => m.selected)
        .map(m => ({ marginId: m.marginId, name: m.name, type: m.type, percent: Number(m.percent) || 0 })),
      salePrice: this.manualPrice && Number(this.salePrice) > 0 ? Number(this.salePrice) : null,
      note: this.note || null,
    };
  }

  save(): void {
    if (!this.name.trim()) return this.error.set('Informe o produto / nome do pacote.');
    if (!(Number(this.quantity) >= 1)) return this.error.set('Informe quantas velas foram produzidas.');
    if (this.items.some(i => !i.materialId || !(Number(i.amount) > 0))) {
      return this.error.set('Escolha o insumo e a quantidade em todas as linhas (ou remova as linhas vazias).');
    }
    if (this.manualPrice && !(Number(this.salePrice) > 0)) return this.error.set('Informe o preço de venda manual.');
    const req = this.request(false)!;
    this.busy.set(true);
    this.error.set('');
    const call = this.batchId ? this.api.updateBatch(this.batchId, req) : this.api.createBatch(req);
    call.subscribe({
      next: b => {
        this.busy.set(false);
        if (this.batchId) {
          this.original.set(b);
          this.preview.set(b);
          this.saved.set('Pacote salvo e recalculado. O estoque foi ajustado.');
          this.api.materials().subscribe(list => this.materials.set(list));
        } else {
          this.router.navigate(['/producao', b.id],
            { state: { saved: `Pacote nº ${b.number} criado. Os insumos foram baixados do estoque.` } });
        }
      },
      error: err => { this.busy.set(false); this.error.set(errorMessage(err)); },
    });
  }

  remove(): void {
    if (!this.batchId || !confirm('Remover este pacote? Os insumos consumidos voltam para o estoque.')) return;
    this.api.deleteBatch(this.batchId).subscribe({
      next: () => this.router.navigate(['/producao']),
      error: err => this.error.set(errorMessage(err)),
    });
  }
}
