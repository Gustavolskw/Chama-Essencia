import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BrlPipe, PctPipe, priceFor } from '../core/format';

@Component({
  selector: 'app-help',
  imports: [FormsModule, RouterLink, BrlPipe, PctPipe],
  template: `
    <div class="page-head">
      <h1>Ajuda e FAQ</h1>
      <p class="sub">Como o sistema calcula custos, preços, estoque e balanço.</p>
    </div>

    <section class="card flow">
      <h2>O caminho de uma vela no sistema</h2>
      <ol>
        <li><strong><a routerLink="/estoque">Estoque</a></strong> — registre cada compra de insumo (cera, essência, pote,
          pavio...). Cada compra vira um <em>lote</em> com custo unitário = preço pago ÷ quantidade.</li>
        <li><strong><a routerLink="/producao">Produção</a></strong> — crie um pacote (ex.: 10 velas de Natal), informe a
          receita por vela e marque se é <em>normal</em> ou <em>sazonal</em>. O pacote consome os insumos do estoque e
          calcula custo e preço.</li>
        <li><strong><a routerLink="/vendas">Vendas</a></strong> — registre as velas vendidas, o preço e para quem foi.</li>
        <li><strong><a routerLink="/balanco">Balanço</a></strong> — veja faturamento, custo do que foi vendido, lucro,
          compras e quanto vale o estoque.</li>
        <li><strong><a routerLink="/estimativa">Estimativa</a></strong> — descubra quantas velas ainda dá para produzir e o
          que comprar.</li>
      </ol>
    </section>

    <div class="grid">
      <section class="card">
        <h2>As fórmulas de preço</h2>
        <div class="formula">
          <span class="tag normal">Normal</span>
          <code>Preço = Custo ÷ (1 − Margem)</code>
          <small>Ex.: 14 ÷ (1 − 0,20) = <strong>R$ 17,50</strong></small>
        </div>
        <div class="formula">
          <span class="tag seasonal">Sazonal</span>
          <code>Preço = Custo ÷ (1 − Margem − Margem sazonal)</code>
          <small>Ex.: 14 ÷ (1 − 0,20 − 0,10) = <strong>R$ 20,00</strong></small>
        </div>
        <p class="hint">"Margem" é a soma das margens não sazonais marcadas no pacote (lucro + as personalizadas, como
          taxa de cartão). A margem sazonal só entra quando o pacote está marcado como <strong>Sazonal</strong>.</p>
      </section>

      <section class="card">
        <h2>Calculadora rápida</h2>
        <div class="row">
          <div class="field"><label for="cc">Custo por vela (R$)</label>
            <span class="money"><input id="cc" type="number" min="0" step="0.01" [ngModel]="cost()" (ngModelChange)="cost.set(+$event)"></span></div>
          <div class="field"><label for="cm">Margem (%)</label>
            <input id="cm" type="number" min="0" max="95" step="0.5" [ngModel]="margin()" (ngModelChange)="margin.set(+$event)"></div>
          <div class="field"><label for="cs">Margem sazonal (%)</label>
            <input id="cs" type="number" min="0" max="95" step="0.5" [ngModel]="seasonal()" (ngModelChange)="seasonal.set(+$event)"></div>
        </div>
        <div class="calc">
          <div><span>Preço normal</span><strong>{{ calc().normal | brl }}</strong>
            <small>lucro {{ calc().normal - cost() | brl }} · markup {{ calc().markupNormal | pct }}</small></div>
          <div class="s"><span>Preço sazonal</span><strong>{{ calc().seasonal | brl }}</strong>
            <small>lucro {{ calc().seasonal - cost() | brl }} · markup {{ calc().markupSeasonal | pct }}</small></div>
        </div>
      </section>
    </div>

    <section class="card">
      <h2>Exemplo com a planilha "Entre Aromas" (vela de Natal)</h2>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Insumo</th><th class="r">Compra</th><th class="r">Custo unitário</th><th class="r">Por vela</th><th class="r">Custo por vela</th></tr></thead>
          <tbody>
            @for (r of example; track r.name) {
              <tr><td>{{ r.name }}</td><td class="r">{{ r.buy }}</td><td class="r">{{ r.unitCost | brl: true }}</td>
                <td class="r">{{ r.use }}</td><td class="r">{{ r.cost | brl: true }}</td></tr>
            }
            <tr><td colspan="4">Mão de obra + gás/água</td><td class="r">{{ 3 | brl }}</td></tr>
          </tbody>
          <tfoot><tr><td colspan="4">Custo de produção por vela</td><td class="r">{{ exampleCost | brl: true }}</td></tr></tfoot>
        </table>
      </div>
      <div class="compare">
        <div>
          <h3>Planilha antiga</h3>
          <p>Bruto = {{ exampleCost | brl }} ÷ 0,80 = {{ exampleCost / 0.8 | brl }}<br>
            Sazonal = bruto × 1,10 = <strong>{{ exampleCost / 0.8 * 1.1 | brl }}</strong></p>
          <p class="hint">O "× 1,10" é um <em>markup</em> de 10% sobre o preço: a parte sazonal acaba sendo só
            {{ (exampleCost / 0.8 * 0.1) / (exampleCost / 0.8 * 1.1) * 100 | pct }} do preço final.</p>
        </div>
        <div>
          <h3>Sistema (fórmula nova)</h3>
          <p>Normal = {{ exampleCost | brl }} ÷ (1 − 0,20) = <strong>{{ exampleCost / 0.8 | brl }}</strong><br>
            Sazonal = {{ exampleCost | brl }} ÷ (1 − 0,20 − 0,10) = <strong>{{ exampleCost / 0.7 | brl }}</strong></p>
          <p class="hint">Agora a margem sazonal é de fato 10% do preço de venda ({{ exampleCost / 0.7 * 0.1 | brl }}) e o
            lucro 20% ({{ exampleCost / 0.7 * 0.2 | brl }}).</p>
        </div>
      </div>
    </section>

    <section class="card faq">
      <h2>Perguntas frequentes</h2>

      <details open>
        <summary>Qual a diferença entre margem e markup?</summary>
        <p><strong>Margem</strong> é a parte do <em>preço de venda</em> que sobra como lucro. <strong>Markup</strong> é
          quanto se soma em cima do <em>custo</em>. Vender por R$ 17,50 algo que custa R$ 14,00 dá R$ 3,50 de lucro:
          isso é 20% do preço (margem) e 25% do custo (markup). O sistema trabalha com margem — por isso divide por
          (1 − margem) em vez de multiplicar por (1 + percentual).</p>
        <div class="table-wrap narrow">
          <table class="data">
            <thead><tr><th class="r">Margem desejada</th><th class="r">Markup equivalente</th><th class="r">Custo R$ 14 vira</th></tr></thead>
            <tbody>
              @for (m of [10, 20, 30, 40, 50]; track m) {
                <tr><td class="r">{{ m }}%</td><td class="r">{{ m / (100 - m) * 100 | pct }}</td><td class="r">{{ price(14, m) | brl }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </details>

      <details>
        <summary>Como marco um pacote como sazonal?</summary>
        <p>No pacote de produção escolha <strong>Normal</strong> ou <strong>Sazonal</strong> logo abaixo da quantidade de
          velas. O resumo à direita mostra os dois preços e destaca o que vale para o pacote. Margens do tipo "Sazonal"
          ficam acinzentadas em pacotes normais porque não entram no cálculo.</p>
      </details>

      <details>
        <summary>Posso criar outras margens (taxa de cartão, imposto, comissão)?</summary>
        <p>Sim, em <a routerLink="/configuracoes">Margens e config.</a> → "+ Nova margem", tipo
          <strong>Personalizada</strong>. Ela soma com a margem de lucro no denominador: lucro 20% + cartão 5% →
          Preço = Custo ÷ (1 − 0,25). Assim a taxa sai do preço de venda sem comer o seu lucro. A soma das margens
          aplicadas pode ir até 95%.</p>
      </details>

      <details>
        <summary>Como o estoque funciona com compras usadas em vários pacotes?</summary>
        <p>Cada compra é um <strong>lote</strong>. Exemplo: você compra 100 pavios por R$ 17,99 (R$ 0,18 cada). O pacote
          de 10 velas consome 10 pavios — sobram 90 no lote. O próximo pacote consome mais 10 do mesmo lote, e assim por
          diante. Quando há mais de um lote, o sistema consome primeiro o <strong>mais antigo</strong> (FIFO), e cada pacote
          guarda de quais lotes tirou e a que preço. Em Estoque → "Compras (lotes)" você vê quanto já foi usado de cada
          compra.</p>
      </details>

      <details>
        <summary>Comprei potes só para um pacote. Como registro?</summary>
        <p>Dentro do pacote use <strong>"+ Nova compra"</strong>: a compra entra no estoque e o insumo já aparece na
          receita. Se for um insumo que você nunca comprou, marque "+ Insumo novo" no próprio formulário da compra.</p>
      </details>

      <details>
        <summary>O que acontece quando eu edito (recalculo) um pacote?</summary>
        <p>O consumo anterior volta para o estoque e o pacote consome de novo com os dados atuais (quantidade de velas,
          receita, custos adicionais e margens). O resumo mostra a simulação antes de salvar. Se faltar estoque, o botão
          de salvar fica bloqueado e a linha do insumo fica vermelha mostrando quanto falta.</p>
        <p>As margens ficam <em>copiadas</em> no pacote: mudar o cadastro de margens não altera pacotes antigos. Para
          aplicar as margens atuais, use "Usar margens do cadastro" no pacote e salve.</p>
      </details>

      <details>
        <summary>Corrigi o preço de uma compra. Os pacotes mudam?</summary>
        <p>Sim. O custo dos pacotes que usaram aquele lote é recalculado automaticamente, e com ele o custo das vendas e
          o balanço. A quantidade de uma compra pode ser corrigida, mas não pode ficar abaixo do que já foi consumido.
          Uma compra só pode ser removida se nada dela foi usado.</p>
      </details>

      <details>
        <summary>Por vela ou no pacote: como informo as quantidades?</summary>
        <p>Em cada insumo do pacote escolha <strong>"por vela"</strong> (ex.: 90 g de cera por vela → 900 g para 10 velas)
          ou <strong>"no pacote"</strong> (ex.: usei 100 ml de essência para as 10 velas). Se a quantidade de velas mudar,
          o que é "por vela" acompanha; o que é "no pacote" continua igual e o custo por vela é dividido.</p>
      </details>

      <details>
        <summary>Preço sugerido ou preço manual?</summary>
        <p>O <strong>preço sugerido</strong> é o resultado da fórmula. Se você preferir arredondar (ex.: R$ 25,90),
          escolha "Definir manualmente". O resumo mostra a <strong>margem real</strong> com o preço escolhido e avisa se
          ela ficou abaixo da margem aplicada. Esse preço é o que já vem preenchido nas vendas (dá para mudar em cada venda).</p>
      </details>

      <details>
        <summary>Como o balanço calcula lucro e caixa?</summary>
        <ul>
          <li><strong>Faturamento</strong>: soma das vendas do período (já com descontos).</li>
          <li><strong>Custo das velas vendidas</strong>: velas vendidas × custo de produção por vela do pacote de origem.</li>
          <li><strong>Lucro bruto</strong> = faturamento − custo das velas vendidas.</li>
          <li><strong>Compras de insumos</strong>: dinheiro gasto em compras no período.</li>
          <li><strong>Caixa</strong> = vendas − compras. Pode ficar negativo em meses de muita compra, porque parte do que
            foi comprado ainda está no estoque.</li>
          <li><strong>Posição do estoque</strong>: valor dos insumos (ao custo de cada lote) e das velas prontas ainda não
            vendidas.</li>
        </ul>
        <p class="hint">Mão de obra e gás/água entram no custo de produção da vela, mas não aparecem como "compras" —
          são custos informados por vela.</p>
      </details>

      <details>
        <summary>Como a estimativa de produção funciona?</summary>
        <p>Para cada insumo da receita: <em>velas possíveis = estoque ÷ quantidade por vela</em>. O menor valor é o
          total que dá para produzir, e o insumo que gera esse valor é o <strong>limitante</strong> — é ele que você
          precisa comprar primeiro. Informando uma meta, o sistema mostra quanto falta de cada insumo e estima o custo
          da compra pelo preço da última compra.</p>
      </details>

      <details>
        <summary>Essência em ml ou em gramas?</summary>
        <p>Use sempre a mesma unidade na compra e no consumo. A planilha usava 10 g ≈ 10 ml de essência; se o
          fornecedor informar a densidade, ajuste a quantidade usada por vela. A unidade é definida no cadastro do insumo.</p>
      </details>

      <details>
        <summary>Taxas de cartão, marketplace, frete e embalagem entram automaticamente?</summary>
        <p>Não. Inclua taxas percentuais como <strong>margem personalizada</strong> (ex.: "Taxa da maquininha 4,99%") e
          custos fixos por vela como <strong>custo adicional</strong> no pacote (ex.: "Embalagem de presente R$ 1,50").</p>
      </details>

      <details>
        <summary>Esqueci minha senha. E como incluo outra pessoa?</summary>
        <p>Na tela de login clique em <strong>"Esqueci minha senha"</strong>, informe o usuário e responda às 3 perguntas
          de segurança. Senha e perguntas podem ser trocadas em <a routerLink="/perfil">Meu perfil</a>, sempre
          confirmando a senha atual. O primeiro acesso é feito com o usuário padrão <strong>chama_e_essencia</strong>
          (senha inicial no .env do servidor), que no primeiro login precisa trocar a senha e cadastrar as perguntas.
          Para incluir alguém, gere um <strong>código de convite</strong> em
          <a routerLink="/configuracoes">Margens e config.</a> → Usuários. Todos os usuários veem os mesmos dados da loja.
          Cinco tentativas erradas bloqueiam a conta por 15 minutos.</p>
      </details>
    </section>
  `,
  styles: `
    .flow ol { margin: 0; padding-left: 20px; display: grid; gap: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
    .formula { display: grid; gap: 4px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; }
    .formula .tag { justify-self: start; }
    .formula code { font-size: 15px; font-weight: 600; }
    .formula small { color: var(--muted); }
    .calc { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .calc div { display: grid; padding: 10px 12px; border-radius: 8px; background: var(--accent-soft); }
    .calc div.s { background: var(--seasonal-soft); }
    .calc strong { font-size: 22px; }
    .calc small { color: var(--muted); }
    .compare { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
    .compare h3 { margin-top: 0; }
    .faq { margin-top: 16px; }
    details { border-bottom: 1px solid var(--border); padding: 10px 0; }
    details:last-child { border-bottom: 0; }
    summary { cursor: pointer; font-weight: 600; }
    details p, details ul { margin: 8px 0 0; line-height: 1.5; }
    .narrow { max-width: 460px; margin-top: 10px; }
    section.card + section.card { margin-top: 16px; }
    @media (max-width: 800px) { .grid, .compare, .calc { grid-template-columns: 1fr; } }
  `,
})
export class HelpComponent {
  cost = signal(14);
  margin = signal(20);
  seasonal = signal(10);

  calc = computed(() => {
    const c = this.cost();
    const normal = priceFor(c, this.margin());
    const seasonal = priceFor(c, this.margin() + this.seasonal());
    return {
      normal, seasonal,
      markupNormal: c > 0 ? (normal - c) / c * 100 : 0,
      markupSeasonal: c > 0 ? (seasonal - c) / c * 100 : 0,
    };
  });

  /** Dados da aba "Insumos" da planilha de exemplo. */
  example = [
    { name: 'Cera de coco', buy: 'R$ 33,90 / 1000 g', unitCost: 33.9 / 1000, use: '90 g', cost: 90 * 33.9 / 1000 },
    { name: 'Essência de Natal', buy: 'R$ 71,00 / 100 ml', unitCost: 71 / 100, use: '10 ml', cost: 10 * 71 / 100 },
    { name: 'Copo de patê', buy: 'R$ 49,27 / 10 un', unitCost: 49.27 / 10, use: '1 un', cost: 49.27 / 10 },
    { name: 'Pavio', buy: 'R$ 17,99 / 50 un', unitCost: 17.99 / 50, use: '1 un', cost: 17.99 / 50 },
    { name: 'Adesivo para pavio', buy: 'R$ 16,00 / 100 un', unitCost: 16 / 100, use: '1 un', cost: 16 / 100 },
  ];
  exampleCost = this.example.reduce((s, r) => s + r.cost, 0) + 3;

  price(cost: number, margin: number): number {
    return priceFor(cost, margin);
  }
}
