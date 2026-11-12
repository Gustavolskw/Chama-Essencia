import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { BrlPipe, DateBrPipe, isoDate } from '../core/format';
import { Batch, PAYMENTS, Payment, Sale } from '../core/models';

interface ItemRow {
  batchId: string;
  quantity: number | null;
  unitPrice: number | null;
}

interface SaleForm {
  id: string | null;
  date: string;
  customer: string;
  payment: Payment;
  discount: number | null;
  note: string;
  items: ItemRow[];
}

function monthStart(): string {
  const d = new Date();
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

@Component({
  selector: 'app-sales',
  imports: [FormsModule, BrlPipe, DateBrPipe],
  template: `
    <div class="page-head">
      <h1>Vendas</h1>
      <button class="btn" type="button" (click)="newSale()">+ Nova venda</button>
      <p class="sub">Registre as velas vendidas, o valor e para quem foi. O custo de cada vela vem do pacote de produção.</p>
    </div>

    <div class="filters">
      <div><label for="f1">De</label><input id="f1" type="date" [ngModel]="from()" (ngModelChange)="from.set($event); load()"></div>
      <div><label for="f2">Até</label><input id="f2" type="date" [ngModel]="to()" (ngModelChange)="to.set($event); load()"></div>
      <div class="quick">
        <button class="btn ghost small" type="button" (click)="setRange('month')">Este mês</button>
        <button class="btn ghost small" type="button" (click)="setRange('year')">Este ano</button>
        <button class="btn ghost small" type="button" (click)="setRange('all')">Tudo</button>
      </div>
      <input type="search" placeholder="Buscar cliente" [ngModel]="search()" (ngModelChange)="search.set($event)" aria-label="Buscar cliente">
    </div>

    <div class="kpis">
      <div class="kpi"><div class="label">Faturamento</div><div class="value">{{ totals().revenue | brl }}</div>
        <div class="detail">{{ filtered().length }} venda(s)</div></div>
      <div class="kpi"><div class="label">Velas vendidas</div><div class="value">{{ totals().candles }}</div>
        <div class="detail">ticket médio {{ totals().ticket | brl }}</div></div>
      <div class="kpi"><div class="label">Custo das velas vendidas</div><div class="value">{{ totals().cost | brl }}</div></div>
      <div class="kpi"><div class="label">Lucro bruto</div>
        <div class="value" [class.pos]="totals().profit > 0" [class.neg]="totals().profit < 0">{{ totals().profit | brl }}</div></div>
    </div>

    @if (message()) { <div [class]="ok() ? 'success' : 'error'">{{ message() }}</div> }

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Itens</th><th class="r">Velas</th><th class="r">Total</th>
            <th class="r">Lucro</th><th>Pagamento</th><th></th></tr>
        </thead>
        <tbody>
          @for (s of filtered(); track s.id) {
            <tr>
              <td class="muted">#{{ s.number }}</td>
              <td>{{ s.date | dateBr }}</td>
              <td><strong>{{ s.customer }}</strong>@if (s.note) { <div class="hint">{{ s.note }}</div> }</td>
              <td>
                @for (i of s.items; track $index) {
                  <div class="item-line">{{ i.quantity }}× {{ i.batchName }} <span class="muted">(pacote #{{ i.batchNumber }}) · {{ i.unitPrice | brl }}</span></div>
                }
              </td>
              <td class="r">{{ s.candles }}</td>
              <td class="r"><strong>{{ s.total | brl }}</strong>@if (s.discount > 0) { <div class="hint">desc. {{ s.discount | brl }}</div> }</td>
              <td class="r" [class.pos]="s.profit > 0" [class.neg]="s.profit < 0">{{ s.profit | brl }}</td>
              <td>{{ paymentLabel(s.payment) }}</td>
              <td class="actions">
                <button class="icon-btn" type="button" (click)="editSale(s)" title="Editar" aria-label="Editar venda">✎</button>
                <button class="icon-btn del" type="button" (click)="remove(s)" title="Remover" aria-label="Remover venda">×</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="9" class="empty">Nenhuma venda no período.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <datalist id="customers">@for (c of customers(); track c) { <option [value]="c"></option> }</datalist>

    @if (form(); as f) {
      <div class="backdrop" (click)="form.set(null)">
        <form class="card modal wide" (click)="$event.stopPropagation()" (ngSubmit)="save(f)">
          <h2>{{ f.id ? 'Editar venda' : 'Nova venda' }}</h2>
          @if (formError()) { <div class="error">{{ formError() }}</div> }
          <div class="row">
            <div class="field">
              <label for="sd">Data</label>
              <input id="sd" name="sd" type="date" [(ngModel)]="f.date" required>
            </div>
            <div class="field">
              <label for="sc">Cliente (para quem foi vendido)</label>
              <input id="sc" name="sc" [(ngModel)]="f.customer" list="customers" maxlength="100" required autocomplete="off">
            </div>
            <div class="field">
              <label for="sp">Pagamento</label>
              <select id="sp" name="sp" [(ngModel)]="f.payment">
                @for (p of payments; track p.key) { <option [value]="p.key">{{ p.label }}</option> }
              </select>
            </div>
          </div>

          <div class="table-wrap">
            <table class="data">
              <thead><tr><th>Pacote / produto</th><th class="r">Qtd.</th><th class="r">Preço unit. (R$)</th><th class="r line-total">Total</th><th></th></tr></thead>
              <tbody>
                @for (it of f.items; track $index; let i = $index) {
                  @let b = batch(it.batchId);
                  <tr>
                    <td>
                      <select [name]="'ib' + i" [ngModel]="it.batchId" (ngModelChange)="pickBatch(it, $event)" [attr.aria-label]="'Pacote do item ' + (i + 1)">
                        <option value="" disabled>Escolha o pacote…</option>
                        @for (bb of selectableBatches(f); track bb.id) {
                          <option [value]="bb.id">#{{ bb.number }} {{ bb.name }} — {{ availableFor(bb, f) }} disp. · {{ bb.salePrice | brl }}</option>
                        }
                      </select>
                      @if (b) { <div class="hint">custo {{ b.unitCost | brl }}/vela · {{ b.seasonal ? 'sazonal' : 'normal' }}</div> }
                    </td>
                    <td class="r"><input [name]="'iq' + i" type="number" min="1" step="1" [(ngModel)]="it.quantity" class="num" [attr.aria-label]="'Quantidade do item ' + (i + 1)"></td>
                    <td class="r"><span class="money"><input [name]="'iu' + i" type="number" min="0" step="0.01" [(ngModel)]="it.unitPrice" class="num" placeholder="0,00" [attr.aria-label]="'Preço em reais do item ' + (i + 1)"></span></td>
                    <td class="r line-total">{{ (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0) | brl }}</td>
                    <td class="actions"><button class="icon-btn del" type="button" (click)="f.items.splice(i, 1)" aria-label="Remover item">×</button></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <button class="btn ghost small" type="button" style="margin: 8px 0 14px" (click)="f.items.push({ batchId: '', quantity: 1, unitPrice: null })">+ Item</button>

          <div class="row">
            <div class="field">
              <label for="sdisc">Desconto (R$)</label>
              <span class="money"><input id="sdisc" name="sdisc" type="number" min="0" step="0.01" [(ngModel)]="f.discount" placeholder="0,00"></span>
            </div>
            <div class="field">
              <label for="snote">Observação</label>
              <input id="snote" name="snote" [(ngModel)]="f.note" maxlength="500">
            </div>
          </div>

          @let t = formTotals(f);
          <div class="totals">
            <span>Subtotal <strong>{{ t.subtotal | brl }}</strong></span>
            <span>Total <strong class="big">{{ t.total | brl }}</strong></span>
            <span>Custo <strong>{{ t.cost | brl }}</strong></span>
            <span>Lucro <strong [class.pos]="t.total - t.cost > 0" [class.neg]="t.total - t.cost < 0">{{ t.total - t.cost | brl }}</strong></span>
          </div>

          <div class="actions">
            <button class="btn ghost" type="button" (click)="form.set(null)">Cancelar</button>
            <button class="btn" type="submit" [disabled]="busy()">Salvar venda</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: `
    .filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 16px; }
    .filters input[type="date"] { width: 160px; }
    .filters input[type="search"] { max-width: 240px; }
    .quick { display: flex; gap: 6px; }
    .item-line { white-space: nowrap; }
    .num { width: 100px; text-align: right; }
    .totals { display: flex; flex-wrap: wrap; gap: 8px 20px; justify-content: flex-end; padding: 10px 0; border-top: 1px solid var(--border); }
    .totals span { color: var(--muted); }
    .totals strong { color: var(--text); margin-left: 4px; }
    .big { font-size: 18px; }
    table.data td select { min-width: 200px; }
    .line-total { min-width: 100px; }
    table.data td.r { white-space: nowrap; }
  `,
})
export class SalesComponent implements OnInit {
  private api = inject(ApiService);

  readonly Number = Number;
  payments = PAYMENTS;
  sales = signal<Sale[]>([]);
  batches = signal<Batch[]>([]);
  customers = signal<string[]>([]);
  from = signal<string>(monthStart());
  to = signal<string>('');
  search = signal('');
  message = signal('');
  ok = signal(true);
  form = signal<SaleForm | null>(null);
  formError = signal('');
  busy = signal(false);

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return q ? this.sales().filter(s => s.customer.toLowerCase().includes(q)) : this.sales();
  });

  totals = computed(() => {
    const list = this.filtered();
    const revenue = list.reduce((s, x) => s + x.total, 0);
    const cost = list.reduce((s, x) => s + x.cost, 0);
    return {
      revenue, cost, profit: revenue - cost,
      candles: list.reduce((s, x) => s + x.candles, 0),
      ticket: list.length ? revenue / list.length : 0,
    };
  });

  ngOnInit(): void {
    this.load();
    this.loadBatches();
  }

  load(): void {
    this.api.sales(this.from(), this.to()).subscribe(list => this.sales.set(list));
  }

  loadBatches(): void {
    this.api.batches().subscribe(list => this.batches.set(list));
    this.api.customers().subscribe(list => this.customers.set(list));
  }

  setRange(range: 'month' | 'year' | 'all'): void {
    const d = new Date();
    this.from.set(range === 'month' ? monthStart() : range === 'year' ? `${d.getFullYear()}-01-01` : '');
    this.to.set('');
    this.load();
  }

  paymentLabel(p: Payment): string {
    return PAYMENTS.find(x => x.key === p)?.label ?? p;
  }

  batch(id: string): Batch | undefined {
    return this.batches().find(b => b.id === id);
  }

  /** Disponível para esta venda: o que sobra no pacote + o que a própria venda já tinha (ao editar). */
  availableFor(b: Batch, f: SaleForm): number {
    const own = f.id ? (this.sales().find(s => s.id === f.id)?.items ?? [])
      .filter(i => i.batchId === b.id).reduce((s, i) => s + i.quantity, 0) : 0;
    return b.available + own;
  }

  selectableBatches(f: SaleForm): Batch[] {
    return this.batches().filter(b => this.availableFor(b, f) > 0 || f.items.some(i => i.batchId === b.id));
  }

  pickBatch(it: ItemRow, batchId: string): void {
    it.batchId = batchId;
    const b = this.batch(batchId);
    if (b && !it.unitPrice) it.unitPrice = b.salePrice;
  }

  formTotals(f: SaleForm): { subtotal: number; total: number; cost: number } {
    let subtotal = 0;
    let cost = 0;
    for (const it of f.items) {
      const q = Number(it.quantity) || 0;
      subtotal += q * (Number(it.unitPrice) || 0);
      cost += q * (this.batch(it.batchId)?.unitCost ?? 0);
    }
    return { subtotal, total: subtotal - (Number(f.discount) || 0), cost };
  }

  newSale(): void {
    this.formError.set('');
    this.loadBatches();
    this.form.set({ id: null, date: isoDate(), customer: '', payment: 'PIX', discount: null, note: '',
      items: [{ batchId: '', quantity: 1, unitPrice: null }] });
  }

  editSale(s: Sale): void {
    this.formError.set('');
    this.form.set({
      id: s.id, date: s.date, customer: s.customer, payment: s.payment, discount: s.discount || null, note: s.note ?? '',
      items: s.items.map(i => ({ batchId: i.batchId, quantity: i.quantity, unitPrice: i.unitPrice })),
    });
  }

  save(f: SaleForm): void {
    if (!f.customer.trim()) return this.formError.set('Informe para quem foi a venda.');
    if (!f.items.length || f.items.some(i => !i.batchId || !(Number(i.quantity) >= 1))) {
      return this.formError.set('Escolha o pacote e a quantidade em todos os itens.');
    }
    const req = {
      date: f.date, customer: f.customer, payment: f.payment, discount: Number(f.discount) || 0, note: f.note || null,
      items: f.items.map(i => ({ batchId: i.batchId, quantity: Math.floor(Number(i.quantity)), unitPrice: Number(i.unitPrice) || 0 })),
    };
    this.busy.set(true);
    (f.id ? this.api.updateSale(f.id, req) : this.api.createSale(req)).subscribe({
      next: s => {
        this.busy.set(false);
        this.form.set(null);
        this.ok.set(true);
        this.message.set(`Venda nº ${s.number} salva: ${s.candles} vela(s) para ${s.customer}.`);
        this.load();
        this.loadBatches();
      },
      error: err => { this.busy.set(false); this.formError.set(errorMessage(err)); },
    });
  }

  remove(s: Sale): void {
    if (!confirm(`Remover a venda nº ${s.number} (${s.customer})? As velas voltam a ficar disponíveis.`)) return;
    this.api.deleteSale(s.id).subscribe({
      next: () => { this.ok.set(true); this.message.set('Venda removida.'); this.load(); this.loadBatches(); },
      error: err => { this.ok.set(false); this.message.set(errorMessage(err)); },
    });
  }
}
