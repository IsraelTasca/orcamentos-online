
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

type ItemPublico = {
  id: string
  nome: string
  descricao: string | null
  quantidade: number
  valor_unitario: number
  valor_total: number
}

type OrcamentoPublico = {
  numero: number
  created_at: string
  status: string
  validade: string | null
  subtotal: number
  desconto: number
  total: number
  observacoes: string | null
  empresa: {
    nome: string
  }
  cliente: {
    nome: string
  }
  itens: ItemPublico[]
}

export default function OrcamentoPublicoPage() {
  const params = useParams()
  const token = params.token as string

  const [orcamento, setOrcamento] =
    useState<OrcamentoPublico | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  useEffect(() => {
    async function carregarOrcamento() {
      try {
        setCarregando(true)
        setErro("")

        if (!token) {
          throw new Error("Link do orçamento inválido.")
        }

        const resposta = await fetch(
          `${API_URL}/orcamentos/publico/${encodeURIComponent(
            token
          )}`
        )

        if (!resposta.ok) {
          if (resposta.status === 404) {
            throw new Error(
              "Orçamento não encontrado ou link inválido."
            )
          }

          throw new Error(
            "Não foi possível carregar o orçamento."
          )
        }

        const dados = await resposta.json()
        setOrcamento(dados)
      } catch (error) {
        console.error(
          "Erro ao carregar orçamento público:",
          error
        )

        if (error instanceof Error) {
          setErro(error.message)
        } else {
          setErro(
            "Ocorreu um erro ao carregar o orçamento."
          )
        }
      } finally {
        setCarregando(false)
      }
    }

    carregarOrcamento()
  }, [token])

  function formatarMoeda(valor: number) {
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  function formatarData(data: string | null) {
    if (!data) {
      return "-"
    }

    const dataParte = data.split("T")[0]
    const partes = dataParte.split("-")

    if (partes.length !== 3) {
      return data
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

  if (carregando) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            width: "100%",
            maxWidth: "500px",
            borderRadius: "14px",
            padding: "40px 30px",
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
            }}
          >
            Carregando orçamento...
          </h1>

          <p
            style={{
              marginTop: "10px",
              color: "#6b7280",
            }}
          >
            Aguarde enquanto carregamos os dados.
          </p>
        </div>
      </main>
    )
  }

  if (erro) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            width: "100%",
            maxWidth: "500px",
            borderRadius: "14px",
            padding: "40px 30px",
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              color: "#111827",
            }}
          >
            Orçamento não disponível
          </h1>

          <p
            style={{
              marginTop: "12px",
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            {erro}
          </p>
        </div>
      </main>
    )
  }

  if (!orcamento) {
    return null
  }

  const numeroOrcamento = String(
    orcamento.numero
  ).padStart(6, "0")

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "30px 16px 50px",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#111827",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "950px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 5px 25px rgba(0,0,0,0.08)",
        }}
      >
        {/* CABEÇALHO */}
        <header
          style={{
            padding: "32px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "25px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  fontWeight: "bold",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Empresa
              </p>

              <h1
                style={{
                  margin: "6px 0 0",
                  fontSize: "30px",
                  lineHeight: 1.2,
                }}
              >
                {orcamento.empresa.nome}
              </h1>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#6b7280",
                  fontSize: "14px",
                }}
              >
                Orçamento comercial
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "bold",
                  color: "#6b7280",
                  letterSpacing: "1px",
                }}
              >
                ORÇAMENTO
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontSize: "24px",
                  fontWeight: "bold",
                }}
              >
                Nº {numeroOrcamento}
              </div>
            </div>
          </div>
        </header>

        {/* DADOS PRINCIPAIS */}
        <section
          style={{
            padding: "30px 32px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "16px",
            }}
          >
            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "6px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                }}
              >
                Cliente
              </div>

              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                {orcamento.cliente.nome}
              </div>
            </div>

            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "6px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                }}
              >
                Data
              </div>

              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                {formatarData(orcamento.created_at)}
              </div>
            </div>

            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "6px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                }}
              >
                Validade
              </div>

              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                {formatarData(orcamento.validade)}
              </div>
            </div>
          </div>
        </section>

        {/* ITENS */}
        <section style={{ padding: "32px" }}>
          <h2
            style={{
              margin: "0 0 20px",
              fontSize: "20px",
            }}
          >
            Itens do orçamento
          </h2>

          {orcamento.itens.length === 0 ? (
            <div
              style={{
                padding: "20px",
                background: "#f9fafb",
                borderRadius: "10px",
                color: "#6b7280",
              }}
            >
              Nenhum item encontrado.
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "650px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "14px 16px",
                        borderBottom: "1px solid #e5e7eb",
                        fontSize: "13px",
                        color: "#4b5563",
                      }}
                    >
                      Item
                    </th>

                    <th
                      style={{
                        textAlign: "center",
                        padding: "14px 16px",
                        borderBottom: "1px solid #e5e7eb",
                        fontSize: "13px",
                        color: "#4b5563",
                      }}
                    >
                      Quantidade
                    </th>

                    <th
                      style={{
                        textAlign: "right",
                        padding: "14px 16px",
                        borderBottom: "1px solid #e5e7eb",
                        fontSize: "13px",
                        color: "#4b5563",
                      }}
                    >
                      Valor unitário
                    </th>

                    <th
                      style={{
                        textAlign: "right",
                        padding: "14px 16px",
                        borderBottom: "1px solid #e5e7eb",
                        fontSize: "13px",
                        color: "#4b5563",
                      }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orcamento.itens.map((item) => (
                    <tr key={item.id}>
                      <td
                        style={{
                          padding: "16px",
                          borderBottom: "1px solid #f1f1f1",
                          fontWeight: "500",
                        }}
                      >
                        {item.nome ||
                          item.descricao ||
                          "Item sem descrição"}
                      </td>

                      <td
                        style={{
                          textAlign: "center",
                          padding: "16px",
                          borderBottom: "1px solid #f1f1f1",
                        }}
                      >
                        {item.quantidade}
                      </td>

                      <td
                        style={{
                          textAlign: "right",
                          padding: "16px",
                          borderBottom: "1px solid #f1f1f1",
                        }}
                      >
                        {formatarMoeda(item.valor_unitario)}
                      </td>

                      <td
                        style={{
                          textAlign: "right",
                          padding: "16px",
                          borderBottom: "1px solid #f1f1f1",
                          fontWeight: "bold",
                        }}
                      >
                        {formatarMoeda(item.valor_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* RESUMO FINANCEIRO */}
        <section style={{ padding: "0 32px 32px" }}>
          <div
            style={{
              maxWidth: "400px",
              marginLeft: "auto",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "20px",
              background: "#fafafa",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px",
                color: "#4b5563",
              }}
            >
              <span>Subtotal</span>

              <strong>
                {formatarMoeda(orcamento.subtotal)}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingBottom: "15px",
                borderBottom: "1px solid #e5e7eb",
                color: "#4b5563",
              }}
            >
              <span>Desconto</span>

              <strong>
                {formatarMoeda(orcamento.desconto)}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "16px",
              }}
            >
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                }}
              >
                Total
              </span>

              <span
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                }}
              >
                {formatarMoeda(orcamento.total)}
              </span>
            </div>
          </div>
        </section>

        {/* OBSERVAÇÕES */}
        {orcamento.observacoes && (
          <section style={{ padding: "0 32px 32px" }}>
            <h2
              style={{
                fontSize: "18px",
                margin: "0 0 12px",
              }}
            >
              Observações
            </h2>

            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "16px",
                color: "#4b5563",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {orcamento.observacoes}
            </div>
          </section>
        )}

        {/* RODAPÉ */}
        <footer
          style={{
            padding: "22px 32px",
            background: "#f9fafb",
            borderTop: "1px solid #e5e7eb",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "12px",
          }}
        >
          Este orçamento foi disponibilizado
          eletronicamente.
        </footer>
      </div>
    </main>
  )
}
