import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff, Download, ScanLine, RefreshCw, Check, X, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { urlAbsoluta } from "@/lib/site";

/**
 * Página de conteúdo sobre operar a portaria sem internet.
 *
 * FORMATO "RESPOSTA PRIMEIRO", escolhido pelo Lucas em 19/08 (opção B): a
 * resposta cabe nas duas primeiras linhas e o resto é reforço. É o trecho que
 * buscador de IA extrai e cita. Abrir com cena ou promessa não deixaria nada
 * citável na parte que ele lê.
 *
 * ⚠️ NADA AQUI PODE SER MARKETING SOLTO. Cada afirmação foi conferida no código
 * do app desktop antes de ser escrita.
 *
 * ⚠️ E NÃO AFIRMAMOS EXCLUSIVIDADE: a pesquisa de 19/08 mostrou que Sympla,
 * Even3, Lets, Yazo e Portya também anunciam check-in offline. O diferencial
 * aqui é EXPLICAR COMO funciona, não dizer que só nós temos.
 *
 * A seção de limites existe de propósito. Dizer o que NÃO funciona aumenta a
 * credibilidade e é justamente o tipo de trecho que uma IA prefere citar.
 */

const TITULO = "Controle de acesso que funciona sem internet";
const RESPOSTA =
  "O aplicativo de portaria do Peltrack baixa a lista de convidados antes do evento e valida cada QR Code no próprio computador. Se a internet cair no meio da entrada, o check-in continua normalmente.";

export const metadata: Metadata = {
  title: `${TITULO} — Peltrack`,
  description: RESPOSTA,
  alternates: { canonical: "/controle-de-acesso-offline" },
  openGraph: {
    type: "article",
    locale: "pt_BR",
    siteName: "Peltrack",
    title: TITULO,
    description: RESPOSTA,
    url: "/controle-de-acesso-offline",
  },
  twitter: { card: "summary_large_image", title: TITULO, description: RESPOSTA },
};

const PASSOS = [
  {
    Icon: Download,
    titulo: "A lista é baixada antes",
    texto:
      "No dia do evento, antes de abrir os portões, o operador baixa a lista de convidados. Ela fica gravada no computador da portaria.",
  },
  {
    Icon: ScanLine,
    titulo: "A validação é local",
    texto:
      "Cada QR Code é conferido contra essa lista gravada. Nenhuma consulta sai para a internet, então a resposta é imediata mesmo sem sinal.",
  },
  {
    Icon: WifiOff,
    titulo: "As entradas ficam numa fila",
    texto:
      "Cada pessoa que entra é registrada no próprio aparelho, numa fila de envio. O operador vê na tela quantas ainda não subiram.",
  },
  {
    Icon: RefreshCw,
    titulo: "A fila sobe sozinha",
    texto:
      "Quando a conexão volta, a fila é enviada automaticamente. O operador não precisa apertar nada nem lembrar de nada.",
  },
];

const FUNCIONA = [
  "Ler e validar o QR Code dos convidados",
  "Registrar quem entrou, com data e hora",
  "Consultar a lista de convidados completa",
  "Acompanhar quantas pessoas já entraram",
  "Exportar a lista em planilha",
  "Avisar quando alguém tenta entrar duas vezes",
];

const NAO_FUNCIONA = [
  "Vender ingresso, porque o pagamento depende do banco",
  "Receber confirmações feitas no site durante a queda",
  "Baixar a lista pela primeira vez, que exige conexão",
];

const PERGUNTAS = [
  {
    p: "O Peltrack funciona sem internet?",
    r: "Sim. O aplicativo de portaria baixa a lista de convidados antes do evento e valida cada QR Code no próprio computador. Se a internet cair durante a entrada, o check-in continua funcionando e os registros sobem sozinhos quando a conexão voltar.",
  },
  {
    p: "O horário registrado é o da entrada ou o da sincronização?",
    r: "É o da entrada. Cada check-in guarda a hora em que a pessoa passou pela portaria, e não a hora em que a internet voltou. Por isso o relatório de fluxo continua correto mesmo depois de horas sem conexão.",
  },
  {
    p: "E se dois guichês lerem o mesmo convite enquanto estão sem internet?",
    r: "Cada convite vale uma entrada. Se dois terminais registrarem a mesma pessoa durante a queda, o sistema mantém o primeiro registro e descarta o segundo no momento da sincronização, sem gerar entrada duplicada no relatório.",
  },
  {
    p: "Preciso instalar alguma coisa?",
    r: "Para operar sem internet, sim. O aplicativo de portaria é instalado num computador com Windows, e é ele que guarda a lista localmente. A validação pelo navegador também existe, mas depende de conexão.",
  },
  {
    p: "O que acontece com quem confirmou presença depois de a lista ser baixada?",
    r: "Essa pessoa não estará na lista gravada e será recusada na portaria. Por isso o aplicativo avisa quando a lista está velha e permite atualizá-la a qualquer momento em que houver conexão.",
  },
  {
    p: "Dá para usar leitor de código de barras?",
    r: "Sim. A portaria pode usar um leitor USB comum ou a câmera do próprio computador. O leitor USB costuma ser mais rápido quando a fila é grande.",
  },
];

export default function ControleDeAcessoOfflinePage() {
  // FAQPage é o formato que o Google usa para resultado rico e um dos que os
  // buscadores de IA leem com mais facilidade. O conteúdo é o mesmo da seção
  // visível abaixo, de propósito: schema que não corresponde ao texto da página
  // é penalizado.
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: urlAbsoluta("/controle-de-acesso-offline"),
    mainEntity: PERGUNTAS.map((q) => ({
      "@type": "Question",
      name: q.p,
      acceptedAnswer: { "@type": "Answer", text: q.r },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
      />
      <Navbar />

      <main className="bg-fundo">
        {/* Resposta primeiro: este bloco é o que a IA copia. */}
        <section className="max-w-3xl mx-auto px-4 pt-16 sm:pt-24 pb-12">
          <span className="inline-flex items-center gap-2 text-laranja text-xs font-semibold uppercase tracking-wider bg-laranja/10 border border-laranja/20 px-3 py-1.5 rounded-full">
            <WifiOff className="w-3.5 h-3.5" /> Portaria offline
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground tracking-tight mt-5 leading-tight">
            {TITULO}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mt-5">{RESPOSTA}</p>
          <p className="text-muted-foreground text-lg leading-relaxed mt-3">
            Nada se perde. As entradas registradas durante a queda sobem sozinhas assim que a
            conexão volta, com o horário em que cada pessoa passou pela porta.
          </p>
        </section>

        <section className="max-w-3xl mx-auto px-4 py-12 border-t border-border">
          <h2 className="text-2xl font-bold text-foreground">Como funciona, passo a passo</h2>
          <ol className="mt-8 space-y-6">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="flex gap-4">
                <div className="w-11 h-11 rounded-xl bg-laranja/10 border border-laranja/20 flex items-center justify-center flex-shrink-0">
                  <p.Icon className="w-5 h-5 text-laranja" />
                </div>
                <div>
                  <h3 className="text-foreground font-semibold">
                    {i + 1}. {p.titulo}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mt-1">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Os dois detalhes que quase nenhum concorrente explica. */}
        <section className="max-w-3xl mx-auto px-4 py-12 border-t border-border space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              O horário que vale é o da entrada, não o do envio
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Quando a fila sobe, cada check-in é gravado com a hora em que a pessoa passou pela
              portaria, e não com a hora em que a internet voltou. É isso que mantém o relatório de
              fluxo correto: se a conexão caiu às 20h e só voltou às 22h, o gráfico continua
              mostrando o pico real da entrada.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Um convite não entra duas vezes</h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Cada convite vale uma entrada. Se dois guichês registrarem a mesma pessoa enquanto
              estavam sem rede, o sistema mantém o primeiro registro e descarta o segundo na
              sincronização. O relatório final não fica com entrada duplicada.
            </p>
          </div>
        </section>

        {/* Dizer o limite é o ponto desta seção, não uma concessão. */}
        <section className="max-w-3xl mx-auto px-4 py-12 border-t border-border">
          <h2 className="text-2xl font-bold text-foreground">
            O que funciona sem internet, e o que não funciona
          </h2>
          <p className="text-muted-foreground mt-3">
            Nem tudo continua disponível com a rede fora, e isso é melhor saber antes do evento do
            que durante ele.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mt-8">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-foreground font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" /> Continua funcionando
              </h3>
              <ul className="mt-4 space-y-2.5">
                {FUNCIONA.map((t) => (
                  <li key={t} className="text-muted-foreground text-sm flex gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-foreground font-semibold flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" /> Precisa de conexão
              </h3>
              <ul className="mt-4 space-y-2.5">
                {NAO_FUNCIONA.map((t) => (
                  <li key={t} className="text-muted-foreground text-sm flex gap-2">
                    <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 py-12 border-t border-border">
          <h2 className="text-2xl font-bold text-foreground">Perguntas frequentes</h2>
          <div className="mt-8 divide-y divide-border">
            {PERGUNTAS.map((q) => (
              <div key={q.p} className="py-5">
                <h3 className="text-foreground font-semibold">{q.p}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mt-2">{q.r}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 pb-20">
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-foreground">Quer testar na sua portaria?</h2>
            <p className="text-muted-foreground text-sm mt-2">
              Crie uma conta e use o Peltrack no seu próximo evento.
            </p>
            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 mt-6 bg-laranja hover:bg-laranja-dark text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Criar conta <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
