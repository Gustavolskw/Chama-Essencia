import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth.interceptor';
import { BrlPipe, DateBrPipe, PctPipe, priceFor } from '../core/format';
import { Invite, MARGIN_TYPES, Margin, MarginType, Settings, UserInfo } from '../core/models';

type MarginForm = Omit<Margin, 'id'> & { id: string | null };

@Component({
  selector: 'app-settings',
  imports: [FormsModule, RouterLink, BrlPipe, PctPipe, DateBrPipe],
  template: `
    <div class="page-head">
      <h1>Margens e configurações</h1>
      <p class="sub">Margens usadas na formação de preço, custos adicionais padrão e usuários da loja.</p>
    </div>

    <section class="card">
      <div class="section-head">
        <h2>Margens</h2>
        <button class="btn small" type="button" (click)="newMargin()">+ Nova margem</button>
      </div>
      <p class="hint" style="margin: -6px 0 12px">
        Margem é um percentual <strong>sobre o preço de venda</strong>: Preço = Custo ÷ (1 − soma das margens).
        Margens sazonais só entram em pacotes marcados como sazonais. <a routerLink="/ajuda">Entenda o cálculo</a>.
      </p>
      @if (marginMsg()) { <div [class]="marginOk() ? 'success' : 'error'">{{ marginMsg() }}</div> }
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr><th>Nome</th><th>Tipo</th><th class="r">Percentual</th><th>Já vem marcada</th><th>Descrição</th><th></th></tr>
          </thead>
          <tbody>
            @for (m of margins(); track m.id) {
              <tr>
                <td><strong>{{ m.name }}</strong></td>
                <td><span class="tag" [class.seasonal]="m.type === 'SEASONAL'" [class.normal]="m.type === 'PROFIT'">{{ typeLabel(m.type) }}</span></td>
                <td class="r">{{ m.percent | pct }}</td>
                <td>{{ m.defaultSelected ? 'Sim' : 'Não' }}</td>
                <td class="muted">{{ m.description }}</td>
                <td class="actions">
                  <button class="icon-btn" type="button" (click)="editMargin(m)" title="Editar" [attr.aria-label]="'Editar ' + m.name">✎</button>
                  <button class="icon-btn del" type="button" (click)="removeMargin(m)" title="Remover" [attr.aria-label]="'Remover ' + m.name">×</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty">Nenhuma margem cadastrada.</td></tr>
            }
          </tbody>
        </table>
      </div>
      <div class="example">
        <strong>Exemplo com as margens marcadas por padrão</strong> (custo de {{ 14 | brl }} por vela):
        normal {{ examplePrice().normal | brl }} ({{ examplePrice().base | pct }})
        · sazonal {{ examplePrice().seasonal | brl }} ({{ examplePrice().base + examplePrice().extra | pct }})
      </div>
    </section>

    <div class="grid">
      @if (settings(); as s) {
        <section class="card">
          <h2>Loja e custos adicionais padrão</h2>
          @if (settingsMsg()) { <div [class]="settingsOk() ? 'success' : 'error'">{{ settingsMsg() }}</div> }
          <form (ngSubmit)="saveSettings(s)">
            <div class="field">
              <label for="store">Nome da loja</label>
              <input id="store" name="store" [(ngModel)]="s.storeName" maxlength="80">
            </div>
            <label>Custos adicionais por vela (R$)</label>
            <p class="hint" style="margin-top: 0">Sugeridos em todo pacote novo (você pode ajustar em cada pacote).</p>
            @for (c of s.defaultExtraCosts; track $index; let i = $index) {
              <div class="cost-row">
                <input [name]="'cd' + i" [(ngModel)]="c.description" placeholder="Descrição" maxlength="60"
                       [attr.aria-label]="'Descrição do custo ' + (i + 1)">
                <span class="money"><input [name]="'ca' + i" [(ngModel)]="c.amount" type="number" min="0" step="0.01" placeholder="0,00"
                       [attr.aria-label]="'Valor em reais por vela do custo ' + (i + 1)"></span>
                <button class="icon-btn del" type="button" (click)="s.defaultExtraCosts.splice(i, 1)" aria-label="Remover custo">×</button>
              </div>
            }
            <div class="form-actions" style="justify-content: space-between">
              <button class="btn ghost small" type="button" (click)="s.defaultExtraCosts.push({ description: '', amount: 0 })">+ Custo</button>
              <span class="hint">Total por vela: {{ extraTotal(s) | brl }}</span>
            </div>
            <div class="form-actions"><button class="btn" type="submit">Salvar</button></div>
          </form>
        </section>
      }

      <section class="card">
        <h2>Usuários da loja</h2>
        <p class="hint" style="margin: -6px 0 12px">Todos os usuários acessam os mesmos dados. O cadastro só é possível
          com convite: gere um código (uso único, válido por 48 horas) e passe para a pessoa usar em "Criar conta".
          O primeiro acesso é feito com o usuário padrão <strong>chama_e_essencia</strong>.</p>
        @if (userMsg()) { <div [class]="userOk() ? 'success' : 'error'">{{ userMsg() }}</div> }
        <ul class="users">
          @for (u of users(); track u.id) {
            <li>
              <span><strong>{{ u.username }}</strong> @if (u.you) { <span class="tag">você</span> }</span>
              <span class="muted">desde {{ u.createdAt | dateBr }}</span>
              @if (!u.you) {
                <button class="icon-btn del" type="button" (click)="removeUser(u)" [attr.aria-label]="'Remover ' + u.username" title="Remover usuário">×</button>
              }
            </li>
          }
        </ul>
        @if (invite(); as inv) {
          <div class="invite">
            <span class="hint">Código de convite</span>
            <code>{{ inv.code }}</code>
            <span class="hint">Válido até {{ formatDateTime(inv.expiresAt) }}</span>
          </div>
        }
        <button class="btn ghost" type="button" (click)="createInvite()">Gerar código de convite</button>
      </section>
    </div>

    @if (marginForm(); as f) {
      <div class="backdrop" (click)="marginForm.set(null)">
        <form class="card modal" (click)="$event.stopPropagation()" (ngSubmit)="saveMargin(f)">
          <h2>{{ f.id ? 'Editar margem' : 'Nova margem' }}</h2>
          @if (marginFormError()) { <div class="error">{{ marginFormError() }}</div> }
          <div class="field">
            <label for="mn">Nome</label>
            <input id="mn" name="mn" [(ngModel)]="f.name" maxlength="60" required placeholder="Ex.: Taxa da maquininha">
          </div>
          <div class="row">
            <div class="field">
              <label for="mt">Tipo</label>
              <select id="mt" name="mt" [(ngModel)]="f.type">
                @for (t of types; track t.key) { <option [value]="t.key">{{ t.label }}</option> }
              </select>
            </div>
            <div class="field">
              <label for="mp">Percentual (%)</label>
              <input id="mp" name="mp" type="number" min="0" max="95" step="0.01" [(ngModel)]="f.percent" required>
            </div>
          </div>
          <p class="hint" style="margin-top: -8px">{{ typeHint(f.type) }}</p>
          <div class="field">
            <label class="check"><input type="checkbox" name="md" [(ngModel)]="f.defaultSelected"> Já vem marcada nos pacotes novos</label>
          </div>
          <div class="field">
            <label for="mdesc">Descrição (opcional)</label>
            <input id="mdesc" name="mdesc" [(ngModel)]="f.description" maxlength="300">
          </div>
          <div class="actions">
            <button class="btn ghost" type="button" (click)="marginForm.set(null)">Cancelar</button>
            <button class="btn" type="submit">Salvar</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: `
    .section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .section-head h2 { margin: 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; margin-top: 16px; }
    .example { margin-top: 12px; padding: 10px 12px; border-radius: 8px; background: var(--surface-2); font-size: 13px; }
    .cost-row { display: grid; grid-template-columns: 1fr 120px auto; gap: 6px; margin-bottom: 6px; }
    .users { list-style: none; padding: 0; margin: 0 0 12px; }
    .users li { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--border); }
    .users li > span:first-child { flex: 1; }
    .invite { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; margin-bottom: 12px;
              border: 1px dashed var(--accent); border-radius: 8px; background: var(--accent-soft); }
    .invite code { font-size: 20px; font-weight: 700; letter-spacing: 2px; color: var(--accent); user-select: all; }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);

  types = MARGIN_TYPES;
  margins = signal<Margin[]>([]);
  marginForm = signal<MarginForm | null>(null);
  marginMsg = signal('');
  marginOk = signal(true);
  /** Erro ao salvar a margem: aparece dentro do modal (a mensagem da página fica coberta por ele). */
  marginFormError = signal('');

  settings = signal<Settings | null>(null);
  settingsMsg = signal('');
  settingsOk = signal(true);

  users = signal<UserInfo[]>([]);
  invite = signal<Invite | null>(null);
  userMsg = signal('');
  userOk = signal(true);

  examplePrice = computed(() => {
    const selected = this.margins().filter(m => m.defaultSelected);
    const base = selected.filter(m => m.type !== 'SEASONAL').reduce((s, m) => s + m.percent, 0);
    const extra = selected.filter(m => m.type === 'SEASONAL').reduce((s, m) => s + m.percent, 0);
    return { base, extra, normal: priceFor(14, base), seasonal: priceFor(14, base + extra) };
  });

  ngOnInit(): void {
    this.loadMargins();
    this.api.settings().subscribe(s => this.settings.set(s));
    this.loadUsers();
  }

  loadMargins(): void {
    this.api.margins().subscribe(list => this.margins.set(list));
  }

  loadUsers(): void {
    this.api.users().subscribe(list => this.users.set(list));
  }

  typeLabel(t: MarginType): string {
    return MARGIN_TYPES.find(x => x.key === t)?.label ?? t;
  }

  typeHint(t: MarginType): string {
    return MARGIN_TYPES.find(x => x.key === t)?.hint ?? '';
  }

  newMargin(): void {
    this.marginFormError.set('');
    this.marginForm.set({ id: null, name: '', type: 'ADDITIONAL', percent: 0, defaultSelected: true, description: '' });
  }

  editMargin(m: Margin): void {
    this.marginFormError.set('');
    this.marginForm.set({ ...m });
  }

  saveMargin(f: MarginForm): void {
    const { id, ...body } = f;
    const req = id ? this.api.updateMargin(id, body) : this.api.createMargin(body);
    req.subscribe({
      next: () => {
        this.marginForm.set(null);
        this.marginOk.set(true);
        this.marginMsg.set('Margem salva. Pacotes já criados mantêm as margens da época; use "Recalcular" no pacote para aplicar.');
        this.loadMargins();
      },
      error: err => this.marginFormError.set(errorMessage(err)),
    });
  }

  removeMargin(m: Margin): void {
    if (!confirm(`Remover a margem "${m.name}"? Pacotes já criados não mudam.`)) return;
    this.api.deleteMargin(m.id).subscribe({
      next: () => this.loadMargins(),
      error: err => { this.marginOk.set(false); this.marginMsg.set(errorMessage(err)); },
    });
  }

  extraTotal(s: Settings): number {
    return s.defaultExtraCosts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }

  saveSettings(s: Settings): void {
    this.api.saveSettings(s).subscribe({
      next: saved => { this.settings.set(saved); this.settingsOk.set(true); this.settingsMsg.set('Configurações salvas.'); },
      error: err => { this.settingsOk.set(false); this.settingsMsg.set(errorMessage(err)); },
    });
  }

  createInvite(): void {
    this.api.createInvite().subscribe({
      next: inv => { this.invite.set(inv); this.userMsg.set(''); },
      error: err => { this.userOk.set(false); this.userMsg.set(errorMessage(err)); },
    });
  }

  removeUser(u: UserInfo): void {
    if (!confirm(`Remover o usuário "${u.username}"? Ele perde o acesso imediatamente.`)) return;
    this.api.deleteUser(u.id).subscribe({
      next: () => { this.userOk.set(true); this.userMsg.set(`Usuário ${u.username} removido.`); this.loadUsers(); },
      error: err => { this.userOk.set(false); this.userMsg.set(errorMessage(err)); },
    });
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }
}
