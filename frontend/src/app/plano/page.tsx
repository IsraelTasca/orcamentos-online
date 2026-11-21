"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// IDs dos planos cadastrados no Supabase
const PLANO_PLUS_ID = "be2bd336-6ec1-4501-9180-cd6c8828ab81";
const PLANO_PRO_ID = "8f3d6b21-7c94-4e5a-9b12-6d8f0a3c5e71";

type PlanoAtual = {
  id: string;
  nome: string;
  preco: number;
  limite_orcamentos: number | null;
};

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
  const [planoAtual, setPlanoAtual] = useState<PlanoAtual | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [semEmpresa, setSemEmpresa] = useState(false);
  const [contratando, setContratando] = useState<"plus" | "pro" | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);

  useEffect(() => {
    carregarAssinatura();
  }, []);

  useEffect(() => {
    if (assinatura?.status !== "pending" || !assinatura.created_at) {
      setTempoRestante(null);
      return;
    }

    const expiraEm = new Date(assinatura.created_at).getTime() + 60 * 60 * 1000;
    const atualizarContador = () => {
      const segundos = Math.max(0, Math.ceil((expiraEm - Date.now()) / 1000));
      setTempoRestante(segundos);
    };

    atualizarContador();
    const intervalo = window.setInterval(atualizarContador, 1000);
    return () => window.clearInterval(intervalo);
  }, [assinatura?.status, assinatura?.created_at]);

  function formatarTempo(segundos: number) {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segundosRestantes = segundos % 60;
    return [horas, minutos, segundosRestantes]
      .map((parte) => String(parte).padStart(2, "0"))
      .join(":");
  }

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

      // Antes de consultar o backend de assinaturas, verifica se o usuário
      // já possui uma empresa. A assinatura é vinculada à empresa.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Não foi possível identificar o usuário autenticado.");
      }

      const {
        data: empresa,
        error: empresaError,
      } = await supabase
        .from("empresas")
        .select("id")
        .eq("usuario_id", user.id)
        .maybeSingle();

      if (empresaError) {
        throw new Error(
          `Não foi possível consultar sua empresa: ${empresaError.message}`
        );
      }

      if (!empresa) {
        setSemEmpresa(true);
        setAssinatura(null);
        return;
      }

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
      setPlanoAtual(dados.plano_atual ?? null);
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

  async function contratarPlano(planoCodigo: "plus" | "pro") {
    if (contratando !== null || planoAtivo || aguardando) return;

    setContratando(planoCodigo);
    setMensagem("");

    try {
      const token = await obterToken();

      const resposta = await fetch(`${API_URL}/assinaturas/${planoCodigo}`, {
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
        setMensagem(`Sua assinatura ${planoCodigo.toUpperCase()} já está autorizada.`);
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
      setContratando(null);
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
      abandoned: "Checkout expirado",
    };

    return nomes[status] || status;
  }

  const planoAtivo = assinatura?.status === "authorized";
  const aguardando = assinatura?.status === "pending";
  const pendentePlus = aguardando && assinatura?.plano_id === PLANO_PLUS_ID;
  const pendentePro = aguardando && assinatura?.plano_id === PLANO_PRO_ID;
  const nomePlanoAtual = planoAtivo
    ? planoAtual?.nome?.toUpperCase() || "PLANO PAGO"
    : "GRATUITO";

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

  if (semEmpresa) {
    return (
      <main style={estilos.pagina}>
        <section
          style={{
            ...estilos.cartao,
            maxWidth: "720px",
            margin: "48px auto",
            padding: "42px 28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 18px",
              borderRadius: "16px",
              background: "#eff6ff",
              color: "#2563eb",
              fontSize: "26px",
              fontWeight: 800,
            }}
          >
            !
          </div>

          <h1
            style={{
              margin: 0,
              color: "#172033",
              fontSize: "24px",
              fontWeight: 800,
            }}
          >
            Cadastre sua empresa para começar
          </h1>

          <p
            style={{
              margin: "12px auto 24px",
              maxWidth: "520px",
              color: "#64748b",
              fontSize: "14px",
              lineHeight: 1.7,
            }}
          >
            Sua conta está ativa! Para consultar seu plano e gerenciar uma
            assinatura, primeiro precisamos dos dados da sua empresa.
          </p>

          <Link
            href="/empresa"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              borderRadius: "10px",
              background: "#2563eb",
              color: "#ffffff",
              padding: "13px 22px",
              fontSize: "14px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Cadastrar minha empresa →
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main style={estilos.pagina}>
      <style>{`
        .plano-grade {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
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
                ? `Sua empresa possui uma assinatura ${planoAtual?.nome || "paga"} autorizada.`
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
            {nomePlanoAtual}
          </span>
        </div>

        {aguardando && tempoRestante !== null && (
          <div
            role="status"
            style={{
              marginTop: "20px",
              padding: "18px",
              border: `1px solid ${tempoRestante > 0 ? "#fed7aa" : "#fecaca"}`,
              borderRadius: "12px",
              background: tempoRestante > 0 ? "#fff7ed" : "#fef2f2",
              color: tempoRestante > 0 ? "#9a3412" : "#991b1b",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: 800 }}>
              Contratação pendente — {assinatura.plano_id === PLANO_PLUS_ID ? "Plus" : assinatura.plano_id === PLANO_PRO_ID ? "Pro" : "plano pago"}
            </div>
            <div style={{ fontSize: "12px", marginTop: "6px", lineHeight: 1.6 }}>
              {tempoRestante > 0
                ? "Finalize a autorização no Mercado Pago dentro do prazo. Esta tentativa expira ao completar 60 minutos desde o início."
                : "O prazo de 60 minutos desta tentativa terminou. Clique em Atualizar informações para confirmar a expiração."}
            </div>
            <div
              style={{
                marginTop: "12px",
                fontSize: "30px",
                fontWeight: 900,
                letterSpacing: "1px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {tempoRestante > 0 ? formatarTempo(tempoRestante) : "00:00:00"}
            </div>
            <div style={{ fontSize: "12px", marginTop: "3px", fontWeight: 600 }}>
              {tempoRestante > 0 ? "Tempo restante para concluir sua contratação" : "Tempo para autorização encerrado"}
            </div>
          </div>
        )}

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
              {"Plano disponível"}
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


          <div style={{ color: "#1d4ed8", fontSize: "12px", fontWeight: 800, letterSpacing: "1px", marginTop: "17px" }}>
            PLANO PLUS
          </div>
          <h2 style={{ margin: "10px 0 0", fontSize: "36px", fontWeight: 800, letterSpacing: "-1px" }}>
            R$ 29,90 <span style={{ fontSize: "14px", color: "#64748b" }}>/ mês</span>
          </h2>
          <p style={estilos.descricao}>Para quem precisa de mais espaço para trabalhar.</p>
          <div style={{ marginTop: "25px", display: "grid", gap: "15px", color: "#334155", fontSize: "14px" }}>
            <div>✓ Todos os recursos disponíveis</div>
            <div>✓ Até 50 orçamentos por mês</div>
            <div>✓ Clientes e produtos sem limite</div>
          </div>
          <button
            className="plano-botao"
            onClick={() => void contratarPlano("plus")}
            disabled={contratando !== null || planoAtivo || aguardando}
            style={{
              ...estilos.botao,
              marginTop: "28px",
              opacity:
                contratando === "plus" || planoAtivo || pendentePlus || aguardando
                  ? 0.65
                  : 1,
              cursor:
                contratando !== null || planoAtivo || aguardando
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {planoAtivo
              ? "Assinatura ativa"
              : pendentePlus
                ? "Finalize a contratação pendente"
                : pendentePro
                  ? "Aguarde finalizar a contratação do Pro"
                  : contratando === "plus"
                    ? "Preparando contratação..."
                    : "Contratar PLUS"}
          </button>
          <p style={{ margin: "13px 0 0", color: "#64748b", fontSize: "11px", lineHeight: 1.6, textAlign: "center" }}>
            Autorização e pagamento realizados no ambiente seguro do Mercado Pago.
          </p>
        </section>


        <section style={estilos.cartao}>
          <div style={{ color: "#64748b", fontSize: "12px", fontWeight: 800, letterSpacing: "1px" }}>
            PLANO PRO
          </div>
          <h2 style={{ margin: "15px 0 0", fontSize: "36px", fontWeight: 800, letterSpacing: "-1px" }}>
            R$ 59,90 <span style={{ fontSize: "14px", color: "#64748b" }}>/ mês</span>
          </h2>
          <p style={estilos.descricao}>Para empresas que criam orçamentos com frequência.</p>
          <div style={{ marginTop: "25px", display: "grid", gap: "15px", color: "#334155", fontSize: "14px" }}>
            <div>✓ Todos os recursos disponíveis</div>
            <div>✓ Orçamentos ilimitados</div>
            <div>✓ Clientes e produtos sem limite</div>
          </div>
          <button
            className="plano-botao"
            onClick={() => void contratarPlano("pro")}
            disabled={contratando !== null || planoAtivo || aguardando}
            style={{
              ...estilos.botao,
              marginTop: "28px",
              opacity:
                contratando === "pro" || planoAtivo || pendentePro || aguardando
                  ? 0.65
                  : 1,
              cursor:
                contratando !== null || planoAtivo || aguardando
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {planoAtivo
              ? "Assinatura ativa"
              : pendentePro
                ? "Finalize a contratação pendente"
                : pendentePlus
                  ? "Aguarde finalizar a contratação do Plus"
                  : contratando === "pro"
                    ? "Preparando contratação..."
                    : "Contratar PRO"}
          </button>
          <p style={{ margin: "13px 0 0", color: "#64748b", fontSize: "11px", lineHeight: 1.6, textAlign: "center" }}>
            Autorização e pagamento realizados no ambiente seguro do Mercado Pago.
          </p>
        </section>
      </div>
    </main>
  );
}