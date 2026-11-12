import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { BrlPipe, DateBrPipe, PctPipe } from '../../core/format';
import { Batch } from '../../core/models';

@Component({
  selector: 'app-production',
  imports: [FormsModule, RouterLink, BrlPipe, DateBrPipe, PctPipe],
  template: `
    <div class="page-head">
      <h1>Pacotes de produção</h1>
      <a class="btn" routerLink="/producao/novo">+ Novo pacote</a>
      <p class="sub">Cada pacote é uma leva de velas produzidas juntas. Ele consome insumos do estoque e calcula o
        custo por vela e o preço de venda (normal ou sazonal).</p>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="label">Pacotes</div><div class="value">{{ batches().length }}</div>
        <div class="detail">{{ totals().seasonal }} sazonal(is)</div></div>
      <div class="kpi"><div class="label">Velas produzidas</div><div class="value">{{ totals().produced }}</div>
        <div class="detail">{{ totals().sold }} vendida(s)</div></div>
      <div class="kpi"><div class="label">Velas prontas p/ venda</div><div class="value">{{ totals().available }}</div>
        <div class="detail">valem {{ totals().potential | brl }} no preço de venda</div></div>
      <div class="kpi"><div class="label">Custo total produzido</div><div class="value">{{ totals().cost | brl }}</div>
        <div class="detail">materiais + custos adicionais</div></div>
    </div>

    <div class="toolbar">
      <input type="search" placeholder="Buscar produto" [ngModel]="search()" (ngModelChange)="search.set($event)" aria-label="Buscar pacote">
      <select [ngModel]="type()" (ngModelChange)="type.set($event)" aria-label="Tipo de pacote">
        <option value="">Normais e sazonais</option>
        <option value="normal">Só normais</option>
        <option value="seasonal">Só sazonais</option>
      </select>
      <label class="check"><input type="checkbox" [ngModel]="onlyAvailable()" (ngModelChange)="onlyAvailable.set($event)"> Com velas disponíveis</label>
    </div>

    @if (loading()) {
      <p class="muted">Carregando…</p>
    } @else {
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Nº</th><th>Data</th><th>Produto</th><th>Tipo</th><th class="r">Velas</th><th class="r">Disponíveis</th>
              <th class="r">Custo/vela</th><th class="r">Preço de venda</th><th class="r">Lucro/vela</th><th class="r">Margem real</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (b of filtered(); track b.id) {
              <tr class="clickable" (click)="open(b)">
                <td class="muted">#{{ b.number }}</td>
                <td>{{ b.date | dateBr }}</td>
                <td><strong>{{ b.name }}</strong></td>
                <td><span class="tag" [class.seasonal]="b.seasonal" [class.normal]="!b.seasonal">{{ b.seasonal ? 'Sazonal' : 'Normal' }}</span></td>
                <td class="r">{{ b.quantity }}</td>
                <td class="r"><span [class.muted]="b.available === 0">{{ b.available }}</span></td>
                <td class="r">{{ b.unitCost | brl }}</td>
                <td class="r"><strong>{{ b.salePrice | brl }}</strong>@if (b.manualPrice) { <div class="hint">manual</div> }</td>
                <td class="r" [class.pos]="b.profitPerUnit > 0" [class.neg]="b.profitPerUnit < 0">{{ b.profitPerUnit | brl }}</td>
                <td class="r">{{ b.realMarginPercent | pct }}</td>
                <td class="actions">
                  <a class="btn ghost small" [routerLink]="['/producao/novo']" [queryParams]="{ copiar: b.id }"
                     (click)="$event.stopPropagation()" title="Novo pacote com a mesma receita">Repetir</a>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="11" class="empty">
                @if (batches().length) { Nenhum pacote encontrado. }
                @else { Nenhum pacote ainda. Cadastre as compras no Estoque e crie o primeiro pacote. }
              </td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
    .toolbar input[type="search"], .toolbar select { max-width: 260px; }
  `,
})
export class ProductionComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  batches = signal<Batch[]>([]);
  loading = signal(true);
  search = signal('');
  type = signal('');
  onlyAvailable = signal(false);

  totals = computed(() => {
    const list = this.batches();
    return {
      seasonal: list.filter(b => b.seasonal).length,
      produced: list.reduce((s, b) => s + b.quantity, 0),
      sold: list.reduce((s, b) => s + b.sold, 0),
      available: list.reduce((s, b) => s + b.available, 0),
      potential: list.reduce((s, b) => s + b.available * b.salePrice, 0),
      cost: list.reduce((s, b) => s + b.totalCost, 0),
    };
  });

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.batches().filter(b =>
      (!q || b.name.toLowerCase().includes(q))
      && (!this.type() || (this.type() === 'seasonal') === b.seasonal)
      && (!this.onlyAvailable() || b.available > 0));
  });

  ngOnInit(): void {
    this.api.batches().subscribe({
      next: list => { this.batches.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  open(b: Batch): void {
    this.router.navigate(['/producao', b.id]);
  }
}
