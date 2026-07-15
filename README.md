# Peltrack

Plataforma de controle de acesso para eventos. O organizador cria o evento, o convidado confirma presença por um link público e recebe um QR Code único por e-mail, e a equipe faz o check-in na entrada com leitura em tempo real, em múltiplos terminais simultâneos. Ao final, os relatórios de presença ficam disponíveis para exportação.

O sistema atende tanto eventos gratuitos quanto pagos, com venda de ingressos via Pix.

## Status do projeto

Em desenvolvimento. O sistema ainda não está publicado — encontra-se em fase final de testes, com previsão de entrada no ar em breve. Este repositório contém o MVP web.

## Funcionalidades

**Área pública**
- Página institucional com planos e apresentação do produto.
- Vitrine de eventos públicos, exibindo apenas eventos do dia atual em diante.
- Página de confirmação de presença por evento, com controle de lotação, lista de espera automática e janela de inscrições.
- Compra de ingresso para eventos pagos, com geração de cobrança Pix.

**Área do cliente (organizador)**
- Cadastro e login por e-mail/senha ou conta Google.
- Painel com métricas e gráficos consolidados.
- Criação e gestão de eventos: dados, imagem de divulgação, endereço com busca por CEP, visibilidade (público ou restrito) e janela de inscrições.
- Tipos de ingresso com preço, quantidade e definição de quem paga a taxa de conveniência.
- Gestão de convidados: busca, filtros, inclusão manual, check-in manual, reenvio de convite e cancelamento.
- Scanner de QR Code por câmera ou leitor USB, com seleção de terminal e contagem ao vivo.
- Relatórios de presença com gráficos e exportação.

**Área administrativa (operador da plataforma)**
- Login com dois fatores: senha, captcha e código de uso único enviado por e-mail.
- Métricas gerais da plataforma, incluindo receita recorrente.
- Gestão de clientes: plano, valor mensal negociado, limites de uso, liberação de recursos e chave de API.
- Registro de leads de vendas.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Linguagem | TypeScript |
| Estilos | Tailwind CSS 4 |
| Banco de dados | PostgreSQL (Neon) via Prisma 7 |
| Autenticação | Auth.js (next-auth 5) |
| Pagamentos | Mercado Pago (Pix) |
| E-mail | Resend |
| Tempo real | Pusher Channels |
| Captcha | Cloudflare Turnstile |
| Gráficos | Recharts |

## Estrutura do projeto

```
app/
  page.tsx              Página institucional
  admin/                Painel administrativo
  api/                  Rotas de API (eventos, pagamentos, webhooks, autenticação)
  cadastro/  login/     Autenticação do cliente
  dashboard/            Área do cliente
  e/[id]/               Confirmação pública de presença
  eventos/              Vitrine pública de eventos
  privacidade/ termos/  Páginas legais
components/
  admin/  auth/  dashboard/  public/  ui/
lib/                    Integrações e regras de negócio
prisma/                 Schema, migrations e seed
types/                  Tipagens auxiliares
```

## Pré-requisitos

- Node.js 20 ou superior
- Um banco PostgreSQL acessível (o projeto utiliza Neon)

## Instalação

```bash
# 1. Instalar as dependências
npm install

# 2. Configurar as variáveis de ambiente
cp .env.example .env
# Edite o .env com os seus valores

# 3. Aplicar as migrations no banco
npx prisma migrate deploy

# 4. Gerar o Prisma Client
npx prisma generate

# 5. Popular o banco com dados iniciais (opcional)
npm run db:seed

# 6. Iniciar o servidor de desenvolvimento
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`.

## Variáveis de ambiente

Todas estão documentadas em `.env.example`. As principais:

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Conexão PostgreSQL. Use a conexão direta, sem `-pooler`, pois o Prisma exige para as migrations. |
| `AUTH_SECRET` | Sim | Chave que assina as sessões. Gere com `npx auth secret`. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Não | Habilitam o login com Google. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Não | Captcha do login administrativo. Em desenvolvimento, use as chaves de teste da Cloudflare. |
| `RESEND_API_KEY` / `MAIL_FROM` | Não | Envio de e-mails. Sem a chave, o código de acesso é exibido no log do servidor. |
| `PUSHER_*` | Não | Atualização em tempo real. Sem as chaves, o sistema funciona sem tempo real. |
| `MERCADO_PAGO_ACCESS_TOKEN` | Não | Cobrança Pix. Sem o token, eventos pagos exibem aviso de indisponibilidade. |
| `SEED_*` | Apenas para o seed | Credenciais iniciais criadas por `npm run db:seed`. |

O arquivo `.env` não é versionado. Nenhuma credencial deve ser adicionada ao código.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (Webpack). |
| `npm run dev:turbo` | Servidor de desenvolvimento com Turbopack. |
| `npm run build` | Build de produção. |
| `npm run start` | Executa o build de produção. |
| `npm run lint` | Análise estática com ESLint. |
| `npm run db:seed` | Popula o banco com dados iniciais. |

O script `dev` utiliza Webpack por padrão devido a uma instabilidade observada com o Turbopack no roteamento de API durante o desenvolvimento.

## Banco de dados

O schema é gerenciado pelo Prisma, em `prisma/schema.prisma`. As migrations ficam em `prisma/migrations`.

```bash
npx prisma migrate dev      # Criar e aplicar uma migration em desenvolvimento
npx prisma migrate deploy   # Aplicar migrations pendentes (produção)
npx prisma studio           # Interface visual para inspecionar os dados
```

O seed é idempotente: utiliza `upsert` com identificadores fixos e pode ser executado múltiplas vezes sem duplicar registros. As credenciais criadas por ele são lidas exclusivamente das variáveis `SEED_*`.

## Fluxos principais

**Confirmação de presença (evento gratuito)**
O convidado acessa `/e/[id]`, informa nome e e-mail, e o sistema gera uma confirmação com token único. O QR Code é gerado no servidor e enviado por e-mail junto de um convite em PDF. Caso o evento esteja lotado, o convidado entra automaticamente em lista de espera.

**Venda de ingresso (evento pago)**
O comprador seleciona o tipo de ingresso e informa nome, e-mail e CPF. O sistema cria uma cobrança Pix no Mercado Pago e registra o pagamento como pendente. A confirmação ocorre por duas vias independentes: o webhook do Mercado Pago e a verificação de status feita pela própria tela. Ambas convergem para a mesma rotina de liberação, que é idempotente — o convite e a baixa do ingresso nunca são duplicados.

**Taxa de conveniência**
Cada tipo de ingresso define se a taxa é repassada ao comprador ou absorvida pelo organizador. Quando repassada, o comprador paga o preço somado à taxa e o organizador recebe o valor cheio. Quando absorvida, o comprador paga apenas o preço e a taxa é descontada do organizador. O percentual varia conforme o plano do organizador.

**Check-in**
Na entrada, o operador lê o QR Code pela câmera ou por leitor USB. A leitura é validada contra o token da confirmação e registrada com o terminal de origem. As atualizações são propagadas em tempo real para os demais terminais e para o painel do organizador.

## Segurança

- Credenciais são lidas exclusivamente de variáveis de ambiente. O arquivo `.env` não é versionado.
- Senhas são armazenadas com hash (bcrypt).
- O acesso administrativo exige dois fatores: senha, captcha e código de uso único enviado por e-mail, com expiração e limite de tentativas.
- O webhook de pagamento valida assinatura HMAC e, adicionalmente, reconfirma o status junto à API do provedor antes de liberar qualquer convite.
- Os dados são isolados por cliente (multi-tenant): toda consulta é vinculada ao tenant da sessão.

## Licença

Projeto proprietário. Todos os direitos reservados.
