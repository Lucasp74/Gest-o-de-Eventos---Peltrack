import type { Metadata } from "next";
import LegalLayout, { Section, Bullets } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Política de Privacidade — Peltrack",
  description: "Como o Peltrack coleta, usa e protege os dados pessoais.",
};

export default function PrivacidadePage() {
  return (
    <LegalLayout title="Política de Privacidade" updatedAt="24 de junho de 2026">
      <p className="text-muted-foreground text-sm leading-relaxed">
        Esta Política de Privacidade descreve como o Peltrack, operado por [Razão Social],
        inscrita no CNPJ [CNPJ] (&ldquo;Peltrack&rdquo;, &ldquo;nós&rdquo;), trata os dados pessoais coletados
        em sua plataforma de controle de acesso a eventos, em conformidade com a Lei Geral de
        Proteção de Dados (Lei nº 13.709/2018 — LGPD).
      </p>

      <Section n={1} title="Quem é o responsável pelos dados">
        <p>
          Para os dados de <strong>cadastro dos clientes</strong> (organizadores de eventos), o Peltrack
          atua como <strong>controlador</strong>. Para os dados dos <strong>convidados</strong> de cada evento,
          o organizador é o <strong>controlador</strong> e o Peltrack atua como <strong>operador</strong>,
          tratando os dados em nome e sob as instruções do organizador.
        </p>
      </Section>

      <Section n={2} title="Dados que coletamos">
        <p>Coletamos apenas o necessário para o funcionamento do serviço:</p>
        <Bullets items={[
          <><strong>Do cliente (organizador):</strong> nome, e-mail e senha (armazenada de forma criptografada). Ao usar o login com Google, recebemos nome, e-mail e foto de perfil.</>,
          <><strong>Do convidado:</strong> nome e e-mail informados na confirmação de presença.</>,
          <><strong>De uso:</strong> registros de confirmação, check-in (horário e terminal) e dados técnicos necessários à operação.</>,
        ]} />
      </Section>

      <Section n={3} title="Como usamos os dados">
        <Bullets items={[
          "Permitir a criação e o gerenciamento de eventos pelo organizador;",
          "Processar a confirmação de presença e gerar o QR Code do convite;",
          "Enviar o convite e comunicações relacionadas ao evento por e-mail;",
          "Realizar e registrar o controle de acesso (check-in) no dia do evento;",
          "Gerar relatórios de presença para o organizador.",
        ]} />
      </Section>

      <Section n={4} title="Base legal">
        <p>
          O tratamento se fundamenta na <strong>execução de contrato</strong> (prestação do serviço), no
          <strong> legítimo interesse</strong> (segurança e melhoria da plataforma) e, quando aplicável, no
          <strong> consentimento</strong> do titular.
        </p>
      </Section>

      <Section n={5} title="Compartilhamento com terceiros">
        <p>Não vendemos dados. Compartilhamos apenas com provedores que viabilizam o serviço, atuando como operadores:</p>
        <Bullets items={[
          <><strong>Neon</strong> — banco de dados (hospedado no Brasil);</>,
          <><strong>Resend</strong> — envio de e-mails;</>,
          <><strong>Mercado Pago</strong> — processamento de pagamentos via Pix (eventos pagos);</>,
          <><strong>Google</strong> — autenticação, quando o usuário opta pelo login com Google.</>,
        ]} />
      </Section>

      <Section n={6} title="Armazenamento e segurança">
        <p>
          Os dados são armazenados em banco de dados na região do <strong>Brasil (São Paulo)</strong>. Senhas são
          guardadas com criptografia (hash). Adotamos medidas técnicas e organizacionais para proteger os dados
          contra acesso não autorizado.
        </p>
      </Section>

      <Section n={7} title="Retenção dos dados">
        <p>
          Mantemos os dados pelo tempo necessário às finalidades descritas ou conforme exigido por lei. O
          organizador pode solicitar a exclusão dos dados de um evento; o cliente pode encerrar sua conta a
          qualquer momento.
        </p>
      </Section>

      <Section n={8} title="Direitos do titular">
        <p>Nos termos da LGPD, você pode solicitar a qualquer momento:</p>
        <Bullets items={[
          "Confirmação da existência de tratamento e acesso aos seus dados;",
          "Correção de dados incompletos ou desatualizados;",
          "Anonimização, bloqueio ou eliminação de dados desnecessários;",
          "Portabilidade e informação sobre compartilhamento;",
          "Revogação do consentimento.",
        ]} />
        <p>Para exercer seus direitos, entre em contato pelo e-mail informado ao final desta política.</p>
      </Section>

      <Section n={9} title="Cookies">
        <p>
          Utilizamos cookies essenciais para manter sua sessão de login ativa e garantir o funcionamento da
          plataforma. Não utilizamos cookies para publicidade.
        </p>
      </Section>

      <Section n={10} title="Alterações nesta política">
        <p>
          Podemos atualizar esta política periodicamente. A data da última atualização é indicada no topo
          desta página. Mudanças relevantes serão comunicadas pelos canais disponíveis.
        </p>
      </Section>

      <Section n={11} title="Contato">
        <p>
          Para dúvidas ou solicitações sobre privacidade e proteção de dados, escreva para{" "}
          <a href="mailto:contato@peltrack.com.br" className="text-laranja hover:underline font-medium">
            contato@peltrack.com.br
          </a>.
        </p>
      </Section>
    </LegalLayout>
  );
}
