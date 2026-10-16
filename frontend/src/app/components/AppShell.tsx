"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type AppShellProps = {
  children: ReactNode;
};

const links = [
  {
    nome: "Orçamentos",
    caminho: "/orcamentos",
    simbolo: "▤",
  },
  {
    nome: "Histórico",
    caminho: "/orcamentos/historico",
    simbolo: "◷",
  },
  {
    nome: "Clientes",
    caminho: "/clientes",
    simbolo: "♙",
  },
  {
    nome: "Produtos e serviços",
    caminho: "/itens",
    simbolo: "▦",
  },
  {
    nome: "Minha empresa",
    caminho: "/empresa",
    simbolo: "⌂",
  },
];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState("");

  const paginasIndependentes =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/cadastro" ||
    pathname.startsWith("/cadastro/") ||
    pathname === "/orcamento" ||
    pathname.startsWith("/orcamento/");

  async function sair() {
    if (saindo) return;

    setSaindo(true);
    setErro("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setErro("Não foi possível sair da conta. Tente novamente.");
        return;
      }

      router.replace("/login");
    } catch {
      setErro("Ocorreu um erro ao sair da conta.");
    } finally {
      setSaindo(false);
    }
  }

  if (paginasIndependentes) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <div className="app-brand-icon">O</div>

          <div className="app-brand-text">
            <span className="app-brand-name">Orçamentos</span>
            <span className="app-brand-subtitle">ONLINE</span>
          </div>
        </div>

        <div className="app-nav-heading">MENU PRINCIPAL</div>

        <nav className="app-navigation" aria-label="Menu principal">
          {links.map((link) => {
            const ativo =
              pathname === link.caminho ||
              (link.caminho === "/orcamentos" &&
                pathname.startsWith("/orcamentos/") &&
                pathname !== "/orcamentos/historico");

            return (
              <a
                key={link.caminho}
                href={link.caminho}
                className={`app-nav-link${ativo ? " app-nav-link-active" : ""}`}
                aria-current={ativo ? "page" : undefined}
              >
                <span className="app-nav-icon" aria-hidden="true">
                  {link.simbolo}
                </span>

                <span>{link.nome}</span>

                {ativo && <span className="app-nav-indicator" />}
              </a>
            );
          })}
        </nav>

        <div className="app-sidebar-bottom">
          {erro && (
            <p className="app-sidebar-error" role="alert">
              {erro}
            </p>
          )}

          <button
            type="button"
            className="app-logout-button"
            onClick={() => void sair()}
            disabled={saindo}
          >
            <span className="app-nav-icon" aria-hidden="true">
              ↪
            </span>
            {saindo ? "Saindo..." : "Sair da conta"}
          </button>

          <div className="app-sidebar-footer">
            Orçamentos Online
            <span>Gestão simples e profissional</span>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div>
            <span className="app-topbar-label">ÁREA DA EMPRESA</span>
            <span className="app-topbar-title">Painel de gestão</span>
          </div>

          <div className="app-topbar-status">
            <span className="app-status-dot" />
            Área administrativa
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}