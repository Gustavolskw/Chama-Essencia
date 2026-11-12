import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { BrlPipe, QtyPipe } from '../core/format';
import { Batch, Material } from '../core/models';

interface RecipeRow {
  materialId: string;
  perUnit: number | null;
}

interface Line {
  material: Material;
  perUnit: number;
  possible: number;
  need: number;
  shortage: number;
  buyCost: number;
  costPerCandle: number;
}

/**
 * Estimativa de produção: quantas velas o estoque atual permite produzir com uma receita e o que falta
 * comprar para uma meta. Tudo calculado na tela, sem alterar o estoque.
 */
@Component({
  selector: 'app-estimate',
  imports: [FormsModule, RouterLink, BrlPipe, QtyPipe],
  template: `
    <div class="page-head">
      <h1>Estimativa de produção</h1>
      <p class="sub">Escolha uma receita (de um pacote já produzido ou montada aqui) e veja quantas velas o estoque
        atual permite produzir e o que comprar. Nada é gravado nem baixado do estoque.</p>
    </div>

    <div class="layout">
      <section class="card">
        <h2>Receita por vela</h2>
        <div class="field">
          <label for="src">Usar a receita de um pacote</label>
          <select id="src" [ngModel]="source" (ngModelChange)="loadRecipe($event)">
            <option value="">Receita em branco</option>
            @for (b of batches(); track b.id) { <option [value]="b.id">#{{ b.number }} {{ b.name }} ({{ b.quantity }} velas)</option> }
          </select>
        </div>
        @for (r of recipe; track $index; let i = $index) {
          @let m = material(r.materialId);
          <div class="recipe-row">
            <select [name]="'rm' + i" [(ngModel)]="r.materialId" (ngModelChange)="bump()" [attr.aria-label]="'Insumo ' + (i + 1)">
              <option value="" disabled>Insumo…</option>
              @for (mm of materials(); track mm.id) { <option [value]="mm.id">{{ mm.name }}</option> }
            </select>
            <div class="per">
              <input [name]="'rq' + i" type="number" min="0" step="any" [(ngModel)]="r.perUnit" (ngModelChange)="bump()" [attr.aria-label]="'Quantidade por vela ' + (i + 1)">
              <span class="muted">{{ m?.unit ?? '' }}/vela</span>
            </div>
            <button class="icon-btn del" type="button" (click)="recipe.splice(i, 1); bump()" aria-label="Remover">×</button>
          </div>
        }
        <button class="btn ghost small" type="button" (click)="recipe.push({ materialId: '', perUnit: null }); bump()">+ Insumo</button>

        <div class="field" style="margin-top: 18px">
          <label for="goal">Meta: quero produzir</label>
          <div class="per">
            <input id="goal" type="number" min="0" step="1" [(ngModel)]="goal" (ngModelChange)="bump()">
            <span class="muted">velas</span>
          </div>
        </div>
      </section>

      <div class="results">
        @let r = result();
        <div class="kpis">
          <div class="kpi highlight">
            <div class="label">Dá para produzir agora</div>
            <div class="value">{{ r.lines.length ? r.possible : '—' }} velas</div>
            <div class="detail">@if (r.limiting) { limitado por <strong>{{ r.limiting }}</strong> } @else { monte a receita ao lado }</div>
          </div>
          <div class="kpi">
            <div class="label">Custo estimado de materiais</div>
            <div class="value">{{ r.costPerCandle | brl }}</div>
            <div class="detail">por vela, pelo custo médio do estoque</div>
          </div>
          <div class="kpi">
            <div class="label">Para a meta de {{ goal || 0 }} velas</div>
            <div class="value" [class.neg]="r.buyCost > 0">{{ r.buyCost | brl }}</div>
            <div class="detail">compra estimada (pelo preço da última compra)</div>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data">
            <thead><tr><th>Insumo</th><th class="r">Por vela</th><th class="r">Em estoque</th><th class="r">Rende</th>
              <th class="r">Precisa (meta)</th><th class="r">Falta comprar</th><th class="r">Custo estimado</th></tr></thead>
            <tbody>
              @for (l of r.lines; track l.material.id) {
                <tr [class.limit]="l.material.name === r.limiting">
                  <td><strong>{{ l.material.name }}</strong>
                    @if (l.material.name === r.limiting) { <span class="tag warn">limitante</span> }
                    @if (l.material.lowStock) { <span class="tag low">baixo</span> }</td>
                  <td class="r">{{ l.perUnit | qty: l.material.unit }}</td>
                  <td class="r">{{ l.material.stock | qty: l.material.unit }}</td>
                  <td class="r">{{ l.possible }} velas</td>
                  <td class="r">{{ l.need | qty: l.material.unit }}</td>
                  <td class="r" [class.neg]="l.shortage > 0">{{ l.shortage > 0 ? (l.shortage | qty: l.material.unit) : 'ok' }}</td>
                  <td class="r">{{ l.buyCost | brl }}</td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="empty">Adicione os insumos da receita.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <p class="hint">"Falta comprar" é a quantidade exata; na prática a compra vem em embalagens (ex.: pacote de 50 pavios).
          O custo estimado usa o preço por unidade da última compra de cada insumo.</p>

        <section class="card" style="margin-top: 16px">
          <h2>Estoque baixo / zerado</h2>
          @if (lowStock().length) {
            <ul class="low">
              @for (m of lowStock(); track m.id) {
                <li><strong>{{ m.name }}</strong>: {{ m.stock | qty: m.unit }}
                  @if (m.minStock > 0) { <span class="muted">(mínimo {{ m.minStock | qty: m.unit }})</span> }</li>
              }
            </ul>
          } @else {
            <p class="muted">Nenhum insumo com estoque baixo. Defina o alerta de cada insumo em <a routerLink="/estoque">Estoque</a>.</p>
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 16px; align-items: start; }
    .recipe-row { display: grid; grid-template-columns: 1fr 150px auto; gap: 6px; margin-bottom: 6px; align-items: center; }
    .per { display: flex; align-items: center; gap: 6px; }
    .per input { width: 90px; }
    .kpi.highlight { border-color: var(--accent); background: var(--accent-soft); }
    tr.limit td { background: var(--warn-soft); }
    td .tag { margin-left: 4px; }
    .low { margin: 0; padding-left: 18px; }
    .low li { margin-bottom: 4px; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class EstimateComponent implements OnInit {
  private api = inject(ApiService);

  materials = signal<Material[]>([]);
  batches = signal<Batch[]>([]);
  source = '';
  recipe: RecipeRow[] = [{ materialId: '', perUnit: null }];
  goal: number | null = 10;
  private version = signal(0);

  lowStock = computed(() => this.materials().filter(m => m.lowStock || m.stock <= 0));

  result = computed(() => {
    this.version();
    const goal = Math.max(0, Math.floor(Number(this.goal) || 0));
    const lines: Line[] = [];
    for (const r of this.recipe) {
      const m = this.material(r.materialId);
      const perUnit = Number(r.perUnit) || 0;
      if (!m || perUnit <= 0) continue;
      const need = perUnit * goal;
      const shortage = Math.max(0, need - m.stock);
      lines.push({
        material: m, perUnit, need, shortage,
        possible: Math.floor(m.stock / perUnit + 1e-9),
        buyCost: shortage * m.lastUnitCost,
        costPerCandle: perUnit * m.avgUnitCost,
      });
    }
    const limit = lines.reduce<Line | null>((min, l) => (!min || l.possible < min.possible ? l : min), null);
    return {
      lines,
      possible: limit?.possible ?? 0,
      limiting: limit?.material.name ?? null,
      buyCost: lines.reduce((s, l) => s + l.buyCost, 0),
      costPerCandle: lines.reduce((s, l) => s + l.costPerCandle, 0),
    };
  });

  ngOnInit(): void {
    forkJoin({ materials: this.api.materials(), batches: this.api.batches() }).subscribe(({ materials, batches }) => {
      this.materials.set(materials);
      this.batches.set(batches);
      if (batches[0]?.id) this.loadRecipe(batches[0].id);
    });
  }

  material(id: string): Material | undefined {
    return this.materials().find(m => m.id === id);
  }

  loadRecipe(batchId: string): void {
    this.source = batchId;
    const b = this.batches().find(x => x.id === batchId);
    this.recipe = b
      ? b.items.map(i => ({ materialId: i.materialId, perUnit: Math.round(i.perUnit * 10000) / 10000 }))
      : [{ materialId: '', perUnit: null }];
    this.bump();
  }

  bump(): void {
    this.version.update(v => v + 1);
  }
}
