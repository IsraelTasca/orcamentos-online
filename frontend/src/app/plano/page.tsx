
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Assinatura = {
  id: string;
  plano_id: string;
  status: string;
  valor_mensal: number;
  moeda: string;
  url_autorizacao: string | null;
  created_at: string;
  updated_at: string;
};

export default function PlanoPage() {
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [contratando, setContratando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarAssinatura();
  }, []);

  async function obterToken() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      throw new Error("Sua sessão expirou. Entre novamente na sua conta.");
    }

    return session.access_token;
  }

  async function carregarAssinatura() {
    setCarregando(true);
    setMensagem("");

    try {
      const token = await obterToken();

      const resposta = await fetch(`${API_URL}/assinaturas/minha`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.detail || "Não foi possível consultar seu plano."
        );
      }

      setAssinatura(dados.assinatura ?? null);
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Erro ao carregar informações do plano."
      );
    } finally {
      setCarregando(false);
    }
  }

  async function contratarPlus() {
    if (contratando) return;

    setContratando(true);
    setMensagem("");

    try {
      const token = await obterToken();

      const resposta = await fetch(`${API_URL}/assinaturas/plus`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.detail || "Não foi possível iniciar a contratação."
        );
      }

      if (dados.url_autorizacao) {
        window.location.assign(dados.url_autorizacao);
        return;
      }

      if (dados.status === "authorized") {
        await carregarAssinatura();
        setMensagem("Sua assinatura PLUS já está autorizada.");
        return;
      }

      throw new Error(
        dados.mensagem || "O Mercado Pago não retornou o link de autorização."
      );
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível conectar ao servidor."
      );
    } finally {
      setContratando(false);
    }
  }

  function formatarStatus(status: string) {
    const nomes: Record<string, string> = {
      pending: "Aguardando autorização",
      authorized: "Ativa",
      paused: "Pausada",
      canceled: "Cancelada",
      rejected: "Rejeitada",
      expired: "Expirada",
    };

    return nomes[status] || status;
  }

  const planoAtivo = assinatura?.status === "authorized";
  const aguardando = assinatura?.status === "pending";

  const estilos = {
    pagina: {
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "32px 24px 56px",
      color: "#172033",
      boxSizing: "border-box" as const,
    },
    cartao: {
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "16px",
      padding: "24px",
      boxShadow: "0 4px 16px rgba(15, 23, 42, 0.035)",
    },
    titulo: {
      margin: 0,
      fontSize: "18px",
      fontWeight: 700,
      color: "#172033",
    },
    descricao: {
      margin: "8px 0 0",
      color: "#64748b",
      fontSize: "14px",
      lineHeight: 1.6,
    },
    botao: {
      width: "100%",
      border: "none",
      borderRadius: "10px",
      padding: "15px 20px",
      background: "#2563eb",
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: 800,
      cursor: "pointer",
    },
  };

  if (carregando) {
    return (
      <main style={estilos.pagina}>
        <section style={estilos.cartao}>
          <h1 style={estilos.titulo}>Carregando seu plano...</h1>
          <p style={estilos.descricao}>
            Estamos consultando sua assinatura.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main style={estilos.pagina}>
      <style>{`
        .plano-grade {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
          align-items: stretch;
        }

        .plano-botao {
          transition: filter .2s ease;
        }

        .plano-botao:hover:not(:disabled) {
          filter: brightness(.94);
        }

        @media (max-width: 700px) {
          .plano-grade {
            grid-template-columns: minmax(0, 1fr);
          }

          .plano-pagina {
            padding: 24px 16px 40px !important;
          }
        }
      `}</style>

      <header style={{ marginBottom: "28px" }}>
        <div
          style={{
            color: "#2563eb",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "1.5px",
            marginBottom: "10px",
          }}
        >
          ASSINATURA
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 800,
            letterSpacing: "-1px",
          }}
        >
          Meu plano
        </h1>

        <p style={estilos.descricao}>
          Consulte seu plano e conheça as opções disponíveis para sua empresa.
        </p>
      </header>

      {mensagem && (
        <div
          role="status"
          style={{
            marginBottom: "22px",
            padding: "15px 18px",
            border: "1px solid #bfdbfe",
            borderRadius: "12px",
            background: "#eff6ff",
            color: "#1e40af",
            fontSize: "14px",
            lineHeight: 1.6,
          }}
        >
          {mensagem}
        </div>
      )}

      <section
        style={{
          ...estilos.cartao,
          marginBottom: "24px",
          background: planoAtivo ? "#f0fdf4" : "#f8fafc",
          borderColor: planoAtivo ? "#bbf7d0" : "#e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={estilos.titulo}>Seu plano atual</h2>

            <p style={estilos.descricao}>
              {planoAtivo
                ? "Sua empresa possui uma assinatura PLUS autorizada."
                : aguardando
                ? "Sua contratação está aguardando autorização no Mercado Pago."
                : "Sua empresa está utilizando o plano gratuito."}
            </p>
          </div>

          <span
            style={{
              padding: "9px 15px",
              borderRadius: "20px",
              background: planoAtivo ? "#dcfce7" : "#dbeafe",
              color: planoAtivo ? "#166534" : "#1d4ed8",
              fontSize: "13px",
              fontWeight: 800,
            }}
          >
            {planoAtivo ? "PLUS" : "GRATUITO"}
          </span>
        </div>

        {assinatura && (
          <div
            style={{
              marginTop: "18px",
              paddingTop: "16px",
              borderTop: "1px solid #e2e8f0",
              color: "#475569",
              fontSize: "13px",
            }}
          >
            Situação da assinatura:{" "}
            <strong>{formatarStatus(assinatura.status)}</strong>
          </div>
        )}

        {aguardando && assinatura?.url_autorizacao && (
          <button
            className="plano-botao"
            onClick={() =>
              window.location.assign(assinatura.url_autorizacao!)
            }
            style={{
              ...estilos.botao,
              marginTop: "18px",
            }}
          >
            Continuar autorização no Mercado Pago
          </button>
        )}

        <button
          onClick={() => void carregarAssinatura()}
          style={{
            marginTop: "15px",
            border: "1px solid #dbe3ef",
            borderRadius: "9px",
            background: "#ffffff",
            color: "#334155",
            padding: "10px 15px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Atualizar informações
        </button>
      </section>

      <div className="plano-grade">
        <section style={estilos.cartao}>
          <div
            style={{
              color: "#64748b",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "1px",
            }}
          >
            PLANO GRATUITO
          </div>

          <h2
            style={{
              margin: "15px 0 0",
              fontSize: "32px",
              fontWeight: 800,
            }}
          >
            R$ 0
            <span style={{ fontSize: "14px", color: "#64748b" }}>
              {" "}
              / mês
            </span>
          </h2>

          <p style={estilos.descricao}>
            Para começar a organizar os orçamentos da sua empresa.
          </p>

          <div
            style={{
              marginTop: "25px",
              display: "grid",
              gap: "15px",
              color: "#334155",
              fontSize: "14px",
            }}
          >
            <div>✓ Cadastro de clientes</div>
            <div>✓ Cadastro de produtos e serviços</div>
            <div>✓ Criação de orçamentos</div>
            <div>✓ Limite de 10 orçamentos mensais</div>
          </div>

          {!planoAtivo && (
            <div
              style={{
                marginTop: "28px",
                padding: "13px",
                borderRadius: "10px",
                background: "#f1f5f9",
                color: "#475569",
                textAlign: "center",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              {aguardando ? "Contratação em andamento" : "Plano disponível"}
            </div>
          )}
        </section>

        <section
          style={{
            ...estilos.cartao,
            border: "2px solid #2563eb",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "6px 10px",
              borderRadius: "20px",
              background: "#dbeafe",
              color: "#1d4ed8",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            RECOMENDADO
          </div>

          <div
            style={{
              color: "#1d4ed8",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "1px",
              marginTop: "17px",
            }}
          >
            PLANO PLUS
          </div>

          <h2
            style={{
              margin: "10px 0 0",
              fontSize: "36px",
              fontWeight: 800,
              letterSpacing: "-1px",
            }}
          >
            R$ 19,90
          </h2>

          <p style={estilos.descricao}>Por mês, com cobrança recorrente.</p>

          <div
            style={{
              marginTop: "25px",
              display: "grid",
              gap: "15px",
              color: "#334155",
              fontSize: "14px",
            }}
          >
            <div>✓ Todos os recursos do plano gratuito</div>
            <div>✓ Remoção do limite mensal de orçamentos</div>
            <div>✓ Mais liberdade para crescer com sua empresa</div>
          </div>

          <button
            className="plano-botao"
            onClick={() => void contratarPlus()}
            disabled={contratando || planoAtivo}
            style={{
              ...estilos.botao,
              marginTop: "28px",
              opacity: contratando || planoAtivo ? 0.65 : 1,
              cursor:
                contratando || planoAtivo ? "not-allowed" : "pointer",
            }}
          >
            {planoAtivo
              ? "Seu plano já é PLUS"
              : contratando
              ? "Preparando contratação..."
              : aguardando
              ? "Continuar contratação"
              : "Contratar PLUS"}
          </button>

          <p
            style={{
              margin: "13px 0 0",
              color: "#64748b",
              fontSize: "11px",
              lineHeight: 1.6,
              textAlign: "center",
            }}
          >
            A autorização e o pagamento são realizados no ambiente seguro do
            Mercado Pago.
          </p>
        </section>
      </div>
    </main>
  );
}
