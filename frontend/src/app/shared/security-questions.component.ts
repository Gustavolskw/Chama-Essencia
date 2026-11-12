import { Component, OnInit, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MICROSOFT_QUESTIONS, QuestionAnswer } from '../core/models';

const CUSTOM = '__custom__';

/**
 * Três perguntas de segurança: escolha entre as perguntas padrão da Microsoft ou escreva uma
 * personalizada. Usado no cadastro e no perfil.
 */
@Component({
  selector: 'app-security-questions',
  imports: [FormsModule],
  template: `
    @for (item of items(); track $index; let i = $index) {
      <fieldset class="q">
        <legend>Pergunta {{ i + 1 }}</legend>
        <select [id]="'qs' + i" [name]="'qs' + i" [ngModel]="choice[i]" (ngModelChange)="choose(i, $event)"
                [attr.aria-label]="'Pergunta de segurança ' + (i + 1)">
          <option value="" disabled>Escolha uma pergunta…</option>
          @for (q of suggestions; track q) {
            <option [value]="q" [disabled]="takenElsewhere(q, i)">{{ q }}</option>
          }
          <option [value]="custom">Escrever minha própria pergunta…</option>
        </select>
        @if (choice[i] === custom) {
          <input [name]="'qc' + i" [(ngModel)]="item.question" maxlength="200" required
                 placeholder="Digite sua pergunta" style="margin-top: 6px"
                 [attr.aria-label]="'Pergunta personalizada ' + (i + 1)">
        }
        <input [name]="'qa' + i" [(ngModel)]="item.answer" maxlength="200" required placeholder="Resposta"
               autocomplete="off" style="margin-top: 6px" [attr.aria-label]="'Resposta da pergunta ' + (i + 1)">
      </fieldset>
    }
    <p class="hint">As respostas não diferenciam maiúsculas, acentos ou espaços extras. Guarde-as bem: são a
      única forma de recuperar a senha.</p>
  `,
  styles: `
    .q { border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px 12px; margin: 0 0 10px; }
    legend { font-weight: 600; padding: 0 4px; }
  `,
})
export class SecurityQuestionsComponent implements OnInit {
  items = input.required<QuestionAnswer[]>();
  suggestions = MICROSOFT_QUESTIONS;
  custom = CUSTOM;
  choice: string[] = [];

  ngOnInit(): void {
    this.choice = this.items().map(i => !i.question ? '' : MICROSOFT_QUESTIONS.includes(i.question) ? i.question : CUSTOM);
  }

  choose(i: number, value: string): void {
    this.choice[i] = value;
    this.items()[i].question = value === CUSTOM ? '' : value;
  }

  takenElsewhere(q: string, i: number): boolean {
    return this.items().some((item, j) => j !== i && item.question === q);
  }
}

export function emptyQuestions(): QuestionAnswer[] {
  return [0, 1, 2].map(() => ({ question: '', answer: '' }));
}

export function questionsValid(items: QuestionAnswer[]): boolean {
  const filled = items.every(i => i.question.trim() && i.answer.trim().length >= 2);
  const distinct = new Set(items.map(i => i.question.trim().toLowerCase())).size === items.length;
  return filled && distinct;
}
