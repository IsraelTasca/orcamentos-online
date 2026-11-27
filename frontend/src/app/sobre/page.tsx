export default function SobrePage() {
  return (
    <main className="sobre-page">
      <style>{`
        .sobre-page { max-width: 1100px; margin: 0 auto; padding: 28px 20px 48px; color: #172033; }
        .sobre-top { margin-bottom: 26px; }
        .sobre-kicker { color: #2563eb; font-size: 12px; font-weight: 800; letter-spacing: .12em; margin-bottom: 10px; }
        .sobre-page h1 { font-size: clamp(28px, 4vw, 38px); line-height: 1.15; margin: 0 0 12px; letter-spacing: -.03em; }
        .sobre-lead { max-width: 760px; color: #64748b; font-size: 16px; line-height: 1.7; margin: 0; }
        .sobre-hero { background: linear-gradient(135deg, #eff6ff, #f8fafc); border: 1px solid #dbeafe; border-radius: 20px; padding: 28px; margin: 26px 0; }
        .sobre-hero h2 { font-size: 24px; margin: 0 0 10px; letter-spacing: -.02em; }
        .sobre-hero p { margin: 0; color: #475569; line-height: 1.7; max-width: 780px; }
        .sobre-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
        .sobre-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px; box-shadow: 0 3px 12px rgba(15,23,42,.035); }
        .sobre-card h3 { margin: 0 0 10px; font-size: 18px; }
        .sobre-card p { color: #64748b; line-height: 1.65; margin: 0; font-size: 14px; }
        .sobre-card ul { margin: 12px 0 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8; }
        .sobre-icon { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; background: #eff6ff; color: #2563eb; font-size: 20px; margin-bottom: 14px; }
        .sobre-note { margin-top: 22px; border-radius: 14px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; color: #64748b; font-size: 13px; line-height: 1.6; }
        @media (max-width: 680px) {
          .sobre-page { padding: 22px 16px 36px; }
          .sobre-hero { padding: 22px; }
          .sobre-grid { grid-template-columns: 1fr; gap: 14px; }
        }
      `}</style>

      <header className="sobre-top">
        <div className="sobre-kicker">INFORMAÇÕES</div>
        <h1>Sobre / Contato</h1>
        <p className="sobre-lead">
          Conheça o Orçamentos Online, entenda o que você pode fazer na plataforma
          e saiba onde encontrar informações e suporte.
        </p>
      </header>

      <section className="sobre-hero">
        <h2>Orçamentos mais simples. Negócios mais organizados.</h2>
        <p>
          O Orçamentos Online foi pensado para facilitar a criação, organização e
          compartilhamento de orçamentos, reunindo em um só lugar as informações
          necessárias para apresentar seus produtos ou serviços aos clientes.
        </p>
      </section>

      <section className="sobre-grid">
        <article className="sobre-card">
          <div className="sobre-icon" aria-hidden="true">ℹ</div>
          <h3>Quem somos</h3>
          <p>
            Somos uma iniciativa voltada a tornar a elaboração de orçamentos mais
            prática e acessível para profissionais, autônomos e pequenos negócios,
            com uma ferramenta simples de usar no dia a dia.
          </p>
        </article>

        <article className="sobre-card">
          <div className="sobre-icon" aria-hidden="true">▣</div>
          <h3>O que você pode fazer</h3>
          <p>Organize seu trabalho e prepare propostas de forma rápida:</p>
          <ul>
            <li>Cadastrar clientes;</li>
            <li>Registrar produtos e serviços;</li>
            <li>Criar e consultar orçamentos;</li>
            <li>Gerar PDF e compartilhar seu orçamento.</li>
          </ul>
        </article>

        <article className="sobre-card">
          <div className="sobre-icon" aria-hidden="true">✉</div>
          <h3>Contato e suporte</h3>
          <p>
            Estamos preparando nossos canais de atendimento. As informações de
            contato e suporte serão divulgadas por aqui assim que estiverem
            disponíveis.
          </p>
        </article>

        <article className="sobre-card">
          <div className="sobre-icon" aria-hidden="true">⌑</div>
          <h3>Privacidade</h3>
          <p>Consulte como os dados são tratados, quais são seus direitos e como solicitar informações.</p>
          <p style={{ marginTop: 14 }}><a href="/privacidade" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>Ler Política de Privacidade →</a></p>
        </article>

        <article className="sobre-card">
          <div className="sobre-icon" aria-hidden="true">§</div>
          <h3>Termos de Uso</h3>
          <p>Veja as regras gerais de uso da plataforma, responsabilidades e condições dos planos.</p>
          <p style={{ marginTop: 14 }}><a href="/termos" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>Ler Termos de Uso →</a></p>
        </article>
      </section>

      <div className="sobre-note">
        Esta página será atualizada conforme novos canais de atendimento e
        informações institucionais forem disponibilizados.
      </div>
    </main>
  );
}