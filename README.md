# Chama e Essência

Gestão de produção da loja de velas artesanais: **estoque de insumos em lotes**, **pacotes de produção** com custo
por vela e preço de venda (normal ou sazonal), **vendas**, **balanço financeiro** e **estimativa de produção**.

**Stack:** Java 21 + Spring Boot 3 (API) · Angular 19 (web) · MongoDB 7 · nginx (gateway) · Docker Compose.
Mesma arquitetura e operação do projeto Contador de Horas.

## Telas

| Tela | O que faz |
|---|---|
| **Produção** | Lista de pacotes (velas produzidas/vendidas/disponíveis, custo, preço, lucro). "Repetir" cria um pacote novo com a mesma receita. |
| **Pacote de produção** | Nome, data, nº de velas, **Normal/Sazonal**, insumos (por vela ou no pacote), custos adicionais por vela, margens, preço sugerido ou manual. Simulação ao vivo antes de salvar; "+ Nova compra" registra uma compra sem sair do pacote. Editar = recalcular. |
| **Estoque** | Insumos com saldo, custo médio, última compra, alerta de estoque baixo; aba de compras (lotes) com quanto já foi usado de cada uma. |
| **Vendas** | Vendas com cliente, itens (pacote, quantidade, preço), desconto e pagamento; custo e lucro de cada venda. |
| **Balanço** | Faturamento, custo das velas vendidas, lucro bruto, compras, caixa, mês a mês, por pacote e por cliente, e a posição do estoque (insumos + velas prontas). |
| **Estimativa** | Quantas velas o estoque atual permite produzir com uma receita, qual insumo limita e o que comprar para uma meta. |
| **Margens e config.** | Cadastro de margens (lucro, sazonal, personalizadas), custos adicionais padrão, usuários e códigos de convite. |
| **Ajuda / FAQ** | Fórmulas, calculadora, exemplo da planilha e perguntas frequentes. |
| **Meu perfil** | Troca de senha e de perguntas de segurança (sempre confirmando a senha atual). |

## Regras de cálculo

- **Custo unitário do insumo** = preço pago ÷ quantidade comprada (cada compra é um lote com seu custo).
- **Consumo FIFO**: o pacote consome os lotes do mais antigo para o mais novo e guarda de qual lote saiu cada
  quantidade. Um lote (ex.: 100 pavios) atende vários pacotes até acabar.
- **Custo por vela** = Σ(consumo de cada lote × custo do lote) ÷ nº de velas + custos adicionais por vela.
- **Preço normal** = Custo ÷ (1 − Margem) — ex.: 14 ÷ (1 − 0,20) = R$ 17,50.
- **Preço sazonal** = Custo ÷ (1 − Margem − Margem sazonal) — ex.: 14 ÷ (1 − 0,20 − 0,10) = R$ 20,00.
  - "Margem" = soma das margens não sazonais marcadas no pacote (lucro + personalizadas, ex.: taxa de cartão).
  - A soma aplicada é limitada a 95%. Implementação: `backend/.../production/Pricing.java` (testada em `PricingTest`).
  - A planilha antiga fazia `bruto × 1,10` no sazonal (markup); o sistema usa a fórmula acima.
- O pacote guarda **cópia** das margens: mudar o cadastro não altera pacotes antigos até recalcular.
- Corrigir o preço de uma compra recalcula o custo dos pacotes que usaram aquele lote (e das vendas/balanço).
- Editar um pacote devolve o consumo anterior ao estoque e consome de novo. Pacote com vendas não pode ser
  removido nem ficar com menos velas que as vendidas. Compra já usada não pode ser removida.
- **Custo das velas vendidas** = quantidade × custo por vela do pacote de origem.

## Segurança

- Login com JWT; senhas e respostas de segurança com hash BCrypt; política de senha forte (backend
  `PasswordPolicy.java` e frontend `core/password.ts`).
- **Empresa única**: todos os usuários veem os mesmos dados e têm o mesmo acesso (não há administrador).
- **Usuário padrão `chama_e_essencia`**: criado no primeiro start (banco vazio) com a senha `DEFAULT_USER_PASSWORD` do
  `.env` (o `chama.sh` gera uma aleatória e mostra no primeiro `start`). No primeiro login o sistema só libera o perfil
  até **trocar a senha** e **cadastrar as 3 perguntas de segurança**.
- **Cadastro só com convite**: qualquer usuário gera um código (uso único, 48 h, guardado como hash) em
  *Margens e config. → Usuários*; a pessoa usa o código em "Criar conta".
- 3 perguntas de segurança no cadastro — as padrão da Microsoft ou personalizadas. *Esqueci minha senha* pede o
  usuário e as 3 respostas (sem diferenciar maiúsculas/acentos).
- Troca de senha e de perguntas só pelo perfil, confirmando a senha atual.
- 5 tentativas erradas de login/recuperação bloqueiam a conta por 15 min; o nginx limita `/api/auth/` a 10/min por IP.

## Identidade visual

- Paleta oficial: **Bordô `#722536`** (marca), **Off-white `#F7F5F1`** (fundos), **Cinza `#8B8B8B`** (detalhes),
  **Preto `#1A1A1A`** (textos). Tokens em `frontend/src/styles.css`.
- **Modo claro e escuro**: botão da vela no topo (acende no escuro, apaga no claro); a escolha fica salva no navegador
  e, sem escolha, segue o sistema. No escuro, textos/links usam um tom claro do bordô (o bordô puro some no preto);
  botões continuam bordô.
- Logo em `frontend/public/brand/` (versões clara/escura geradas a partir de `VISUAL/`). Fontes: Urbanist (marca e
  títulos) e Fira Sans (texto), via Google Fonts.
- Animações: vela com chama tremulando e fios de aroma na marca; no menu, o "pavio" acende ao passar o mouse e o item
  ativo ganha uma chama e brilho quente; brilho percorrendo a borda do topo; itens do menu no celular "acendem" em
  sequência; telas de login com fumaça de aroma, brasas e folhas. Quem ativa "reduzir movimento" no sistema não vê
  animações.

## Arquitetura

```
 Internet ──▶ nginx (gateway) ──/api──▶ backend ×N (Spring Boot) ──▶ mongo
 [Traefik]        │                         (balanceado)
                  └──── / ────▶ frontend (Angular estático)
```

Backend, frontend e MongoDB não publicam portas; só o gateway. Banco: `chamaessencia`.

## Produção (mesmo servidor do Contador de Horas, outro DNS)

```bash
git clone <repo> chama-essencia && cd chama-essencia
chmod +x chama.sh
./chama.sh start        # cria o .env com segredos aleatórios na primeira vez
```

Atrás do Traefik (recomendado, compartilhado com o Contador de Horas):

1. DNS: registro **A** do novo domínio (ex.: `velas.seudominio.com`) para o IP da VPS.
2. No `.env`: `TRAEFIK_ENABLED=true`, `APP_DOMAIN=velas.seudominio.com` e a mesma `TRAEFIK_NETWORK` /
   `TRAEFIK_CERTRESOLVER` usados no Contador de Horas.
3. `./chama.sh start`.

Os nomes não colidem com o Contador de Horas: container `nginx-chama-essencia`, routers/serviço Traefik
`chama-essencia`, volume `<pasta>_mongo-data` e banco próprios. No modo standalone (sem Traefik) o gateway publica
`8090`/`8453` por padrão (`HTTP_PORT`/`HTTPS_PORT`) para não disputar 80/443.

| Comando | O que faz |
|---|---|
| `./chama.sh start` / `stop` / `restart` / `status` | Sobe, para, reinicia, mostra estado |
| `./chama.sh logs [nginx\|backend\|frontend\|mongo]` | Logs |
| `./chama.sh update` | `git pull` + rebuild |
| `./chama.sh backup` | `backups/chamaessencia-AAAAMMDD-HHMMSS.archive.gz` |
| `./chama.sh restore <arquivo>` | Restaura um backup (substitui os dados) |

Backup diário: `0 3 * * * cd /caminho/chama-essencia && ./chama.sh backup >> backups/cron.log 2>&1`

## Desenvolvimento local

```bash
docker compose up -d mongo
cd backend && mvn spring-boot:run          # MONGO_URI se o Mongo tiver senha
cd frontend && npm install && npm start    # http://localhost:4200, proxy /api -> 8080
```

> No Windows, o `&` no nome da pasta quebra os atalhos `npm`/`npx`; rode o CLI direto:
> `node node_modules/@angular/cli/bin/ng.js serve --proxy-config proxy.conf.json`.

## Estrutura

```
backend/   auth (login, convites, usuários) · stock (insumos, compras/lotes, FIFO) · production (pacotes, Pricing)
           sale · balance · margin · settings
frontend/  pages/ production, stock, sales, balance, estimate, settings, profile, help, login/cadastro/recuperação
docker/nginx/  gateway (TLS, rate limit, balanceamento)
```
