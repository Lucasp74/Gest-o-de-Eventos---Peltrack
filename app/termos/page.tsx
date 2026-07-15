import type { Metadata } from "next";
import LegalLayout, { Section, Bullets } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Termos de Uso — Peltrack",
  description: "Regras e condições de uso da plataforma Peltrack.",
};

export default function TermosPage() {
  return (
    <LegalLayout title="Termos de Uso" updatedAt="24 de junho de 2026">
      <p className="text-grafite-muted text-sm leading-relaxed">
        Estes Termos de Uso regem o acesso e a utilização da plataforma Peltrack, operada por
        [Razão Social], inscrita no CNPJ [CNPJ] (&ldquo;Peltrack&rdquo;, &ldquo;nós&rdquo;). Ao criar uma conta ou
        utilizar o serviço, você concorda com estes termos.
      </p>

      <Section n={1} title="Descrição do serviço">
        <p>
          O Peltrack é uma plataforma de controle de acesso a eventos que permite criar eventos, coletar
          confirmações de presença, gerar QR Codes de convite, realizar check-in e gerar relatórios.
        </p>
      </Section>

      <Section n={2} title="Cadastro e conta">
        <Bullets items={[
          "Você é responsável pela veracidade das informações fornecidas no cadastro;",
          "As credenciais de acesso são pessoais e intransferíveis — você é responsável por mantê-las em sigilo;",
          "É necessário ter capacidade legal para celebrar contratos.",
        ]} />
      </Section>

      <Section n={3} title="Planos, pagamentos e taxas">
        <Bullets items={[
          "O Peltrack oferece um plano gratuito e planos pagos, com recursos e limites distintos;",
          "Em eventos com ingressos pagos, pode incidir uma taxa de serviço sobre as vendas, informada no momento da contratação;",
          "Assinaturas são cobradas de forma recorrente e podem ser canceladas a qualquer momento, sem reembolso de períodos já utilizados.",
        ]} />
      </Section>

      <Section n={4} title="Responsabilidades do organizador">
        <p>O cliente (organizador) é o responsável pelo evento e pelos dados dos seus convidados. Compromete-se a:</p>
        <Bullets items={[
          "Tratar os dados dos convidados em conformidade com a LGPD, na qualidade de controlador;",
          "Garantir que possui base legal para coletar e usar os dados dos convidados;",
          "Não utilizar a plataforma para fins ilícitos, fraudulentos ou que violem direitos de terceiros.",
        ]} />
      </Section>

      <Section n={5} title="Uso aceitável">
        <p>É proibido, entre outras condutas:</p>
        <Bullets items={[
          "Tentar acessar áreas ou dados de outros clientes;",
          "Realizar engenharia reversa, sobrecarregar ou comprometer a segurança da plataforma;",
          "Reproduzir ou revender o serviço sem autorização.",
        ]} />
      </Section>

      <Section n={6} title="Propriedade intelectual">
        <p>
          A marca, o nome &ldquo;Peltrack&rdquo;, o software, o design e os demais elementos da plataforma são de
          propriedade do Peltrack. O uso do serviço não transfere qualquer direito de propriedade intelectual.
        </p>
      </Section>

      <Section n={7} title="Limitação de responsabilidade">
        <p>
          O Peltrack se empenha em manter o serviço disponível e seguro, mas não garante operação ininterrupta
          ou livre de erros. Na máxima extensão permitida em lei, não nos responsabilizamos por danos indiretos
          decorrentes do uso ou da indisponibilidade do serviço.
        </p>
      </Section>

      <Section n={8} title="Suspensão e encerramento">
        <p>
          Podemos suspender ou encerrar contas que violem estes termos. Você pode encerrar sua conta a qualquer
          momento. Dados poderão ser excluídos conforme a Política de Privacidade.
        </p>
      </Section>

      <Section n={9} title="Alterações dos termos">
        <p>
          Estes termos podem ser atualizados. A data da última atualização consta no topo desta página. O uso
          continuado após mudanças implica concordância com a versão vigente.
        </p>
      </Section>

      <Section n={10} title="Lei aplicável e foro">
        <p>
          Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de [Cidade/UF] para
          dirimir eventuais controvérsias, salvo disposição legal em contrário.
        </p>
      </Section>

      <Section n={11} title="Contato">
        <p>
          Em caso de dúvidas sobre estes Termos de Uso, escreva para{" "}
          <a href="mailto:contato@peltrack.com.br" className="text-laranja hover:underline font-medium">
            contato@peltrack.com.br
          </a>.
        </p>
      </Section>
    </LegalLayout>
  );
}
