import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { BrlPipe, MonthBrPipe, PctPipe, isoDate } from '../core/format';
import { Balance } from '../core/models';

@Component({
  selector: 'app-balance',
  imports: [FormsModule, RouterLink, BrlPipe, PctPipe, MonthBrPipe],
  template: `
    <div class="page-head">
      <h1>Balanço financeiro</h1>
      <p class="sub">Vendas, custos e compras do período, e a posição atual do estoque.</p>
    </div>

    <div class="filters">
      <div><label for="b1">De</label><input id="b1" type="date" [(ngModel)]="from" (change)="load()"></div>
      <div><label for="b2">Até</label><input id="b2" type="date" [(ngModel)]="to" (change)="load()"></div>
      <div class="quick">
        <button class="btn ghost small" type="button" (click)="range('month')">Este mês</button>
        <button class="btn ghost small" type="button" (click)="range('last')">Mês passado</button>
        <button class="btn ghost small" type="button" (click)="range('year')">Este ano</button>
        <button class="btn ghost small" type="button" (click)="range('all')">Tudo</button>
      </div>
    </div>

    @if (error()) { <div class="error">{{ error() }}</div> }

    @if (data(); as b) {
      <h2>Resultado do período</h2>
      <div class="kpis">
        <div class="kpi"><div class="label">Faturamento (vendas)</div><div class="value">{{ b.revenue | brl }}</div>
          <div class="detail">{{ b.salesCount }} venda(s) · ticket médio {{ b.averageTicket | brl }}
            @if (b.discounts > 0) { · descontos {{ b.discounts | brl }} }</div></div>
        <div class="kpi"><div class="label">Custo das velas vendidas</div><div class="value">{{ b.cogs | brl }}</div>
          <div class="detail">{{ b.candlesSold }} vela(s) × custo de produção</div></div>
        <div class="kpi"><div class="label">Lucro bruto</div>
          <div class="value" [class.pos]="b.grossProfit > 0" [class.neg]="b.grossProfit < 0">{{ b.grossProfit | brl }}</div>
          <div class="detail">margem {{ b.grossMarginPercent | pct }} sobre as vendas</div></div>
        <div class="kpi"><div class="label">Compras de insumos</div><div class="value">{{ b.purchases | brl }}</div>
          <div class="detail">dinheiro gasto no período</div></div>
        <div class="kpi"><div class="label">Caixa (vendas − compras)</div>
          <div class="value" [class.pos]="b.cashResult > 0" [class.neg]="b.cashResult < 0">{{ b.cashResult | brl }}</div>
          <div class="detail">parte das compras pode estar no estoque</div></div>
        <div class="kpi"><div class="label">Produção do período</div><div class="value">{{ b.candlesProduced }} velas</div>
          <div class="detail">custo {{ b.productionCost | brl }}</div></div>
      </div>

      <h2>Posição atual do estoque</h2>
      <div class="kpis">
        <div class="kpi"><div class="label">Insumos em estoque</div><div class="value">{{ b.materialStockValue | brl }}</div>
          <div class="detail">@if (b.lowStockCount > 0) { <a routerLink="/estoque">{{ b.lowStockCount }} com estoque baixo</a> } @else { nenhum com estoque baixo }</div></div>
        <div class="kpi"><div class="label">Velas prontas</div><div class="value">{{ b.finishedCandles }}</div>
          <div class="detail">custaram {{ b.finishedStockCost | brl }}</div></div>
        <div class="kpi"><div class="label">Potencial de venda</div><div class="value">{{ b.finishedStockPotential | brl }}</div>
          <div class="detail">lucro previsto {{ b.finishedStockPotential - b.finishedStockCost | brl }}</div></div>
        <div class="kpi"><div class="label">Patrimônio em estoque</div><div class="value">{{ b.materialStockValue + b.finishedStockCost | brl }}</div>
          <div class="detail">insumos + velas prontas (a custo)</div></div>
      </div>

      <section class="card">
        <h2>Mês a mês</h2>
        <div class="table-wrap">
          <table class="data">
            <thead><tr><th>Mês</th><th class="r">Vendas</th><th class="r">Custo vendido</th><th class="r">Lucro bruto</th>
              <th class="r">Velas vendidas</th><th class="r">Compras</th><th class="r">Velas produzidas</th><th class="r">Custo produzido</th></tr></thead>
            <tbody>
              @for (m of b.months; track m.month) {
                <tr>
                  <td>{{ m.month | monthBr }}</td>
                  <td class="r">{{ m.revenue | brl }}</td>
                  <td class="r">{{ m.cogs | brl }}</td>
                  <td class="r" [class.pos]="m.profit > 0" [class.neg]="m.profit < 0">{{ m.profit | brl }}</td>
                  <td class="r">{{ m.candlesSold }}</td>
                  <td class="r">{{ m.purchases | brl }}</td>
                  <td class="r">{{ m.candlesProduced }}</td>
                  <td class="r">{{ m.productionCost | brl }}</td>
                </tr>
              } @empty { <tr><td colspan="8" class="empty">Sem movimento no período.</td></tr> }
            </tbody>
            @if (b.months.length > 1) {
              <tfoot><tr><td>Total</td><td class="r">{{ b.revenue | brl }}</td><td class="r">{{ b.cogs | brl }}</td>
                <td class="r">{{ b.grossProfit | brl }}</td><td class="r">{{ b.candlesSold }}</td><td class="r">{{ b.purchases | brl }}</td>
                <td class="r">{{ b.candlesProduced }}</td><td class="r">{{ b.productionCost | brl }}</td></tr></tfoot>
            }
          </table>
        </div>
      </section>

      <div class="grid">
        <section class="card">
          <h2>Por pacote</h2>
          <div class="table-wrap">
            <table class="data">
              <thead><tr><th>Pacote</th><th class="r">Vendidas</th><th class="r">Disp.</th><th class="r">Vendas</th><th class="r">Lucro</th></tr></thead>
              <tbody>
                @for (r of b.batches; track r.id) {
                  <tr>
                    <td><a [routerLink]="['/producao', r.id]">#{{ r.number }} {{ r.name }}</a>
                      @if (r.seasonal) { <span class="tag seasonal">sazonal</span> }
                      <div class="hint">custo {{ r.unitCost | brl }} · preço {{ r.salePrice | brl }}</div></td>
                    <td class="r">{{ r.soldInPeriod }}/{{ r.produced }}</td>
                    <td class="r">{{ r.available }}</td>
                    <td class="r">{{ r.revenue | brl }}</td>
                    <td class="r" [class.pos]="r.profit > 0" [class.neg]="r.profit < 0">{{ r.profit | brl }}</td>
                  </tr>
                } @empty { <tr><td colspan="5" class="empty">Nenhum pacote no período.</td></tr> }
              </tbody>
            </table>
          </div>
        </section>

        <section class="card">
          <h2>Por cliente</h2>
          <div class="table-wrap">
            <table class="data">
              <thead><tr><th>Cliente</th><th class="r">Compras</th><th class="r">Velas</th><th class="r">Total</th><th class="r">Lucro</th></tr></thead>
              <tbody>
                @for (c of b.customers; track c.customer) {
                  <tr><td>{{ c.customer }}</td><td class="r">{{ c.sales }}</td><td class="r">{{ c.candles }}</td>
                    <td class="r">{{ c.revenue | brl }}</td><td class="r">{{ c.profit | brl }}</td></tr>
                } @empty { <tr><td colspan="5" class="empty">Nenhuma venda no período.</td></tr> }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    } @else if (!error()) {
      <p class="muted">Carregando…</p>
    }
  `,
  styles: `
    .filters { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 16px; }
    .filters input[type="date"] { width: 160px; }
    .quick { display: flex; gap: 6px; flex-wrap: wrap; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; align-items: start; }
    td .tag { margin-left: 4px; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class BalanceComponent implements OnInit {
  private api = inject(ApiService);

  from = '';
  to = '';
  data = signal<Balance | null>(null);
  error = signal('');

  ngOnInit(): void {
    this.range('month');
  }

  range(r: 'month' | 'last' | 'year' | 'all'): void {
    const d = new Date();
    if (r === 'month') {
      this.from = isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
      this.to = isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    } else if (r === 'last') {
      this.from = isoDate(new Date(d.getFullYear(), d.getMonth() - 1, 1));
      this.to = isoDate(new Date(d.getFullYear(), d.getMonth(), 0));
    } else if (r === 'year') {
      this.from = `${d.getFullYear()}-01-01`;
      this.to = `${d.getFullYear()}-12-31`;
    } else {
      this.from = '';
      this.to = '';
    }
    this.load();
  }

  load(): void {
    this.api.balance(this.from, this.to).subscribe({
      next: b => { this.data.set(b); this.error.set(''); },
      error: err => this.error.set(errorMessage(err)),
    });
  }
}
