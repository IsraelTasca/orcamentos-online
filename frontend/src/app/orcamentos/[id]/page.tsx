
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { jsPDF } from "jspdf"
import { supabase } from "../../../../lib/supabase"

type Orcamento = {
  id: string
  numero: number
  cliente_id: string
  created_at: string
  status: string
  validade: string | null
  subtotal: number
  desconto: number
  total: number
  observacoes: string | null
  token_publico: string
}

type Cliente = {
  id: string
  nome: string
}

type OrcamentoItem = {
  id: string
  item_id: string
  nome: string
  descricao: string | null
  quantidade: number
  valor_unitario: number
}

type Empresa = {
  id: string
  nome: string
  logo_url: string | null
}

const estilos = {
  pagina: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "32px 24px 56px",
    color: "#172033",
  } as React.CSSProperties,
  cartao: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 4px 16px rgba(15,23,42,0.035)",
    minWidth: 0,
  } as React.CSSProperties,
  titulo: {
    margin: 0,
    color: "#172033",
    fontSize: "clamp(25px, 4vw, 34px)",
    lineHeight: 1.2,
    fontWeight: 800,
    letterSpacing: "-0.8px",
  } as React.CSSProperties,
  subtitulo: {
    margin: "9px 0 0",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.6,
  } as React.CSSProperties,
  tituloSecao: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 750,
    color: "#172033",
  } as React.CSSProperties,
  descricaoSecao: {
    margin: "7px 0 0",
    fontSize: "13px",
    lineHeight: 1.6,
    color: "#64748b",
  } as React.CSSProperties,
  rotulo: {
    display: "block",
    marginBottom: "7px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 600,
  } as React.CSSProperties,
  valor: {
    margin: 0,
    color: "#172033",
    fontSize: "14px",
    fontWeight: 650,
    overflowWrap: "anywhere",
  } as React.CSSProperties,
  botao: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    border: "1px solid #dbe3ef",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#334155",
    padding: "11px 16px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
  } as React.CSSProperties,
}

export default function VisualizarOrcamentoPage() {
  const params = useParams()
  const router = useRouter()
  const orcamentoId = params.id as string

  const [orcamento, setOrcamento] = useState<Orcamento | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [itens, setItens] = useState<OrcamentoItem[]>([])
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [compartilhando, setCompartilhando] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [atualizandoStatus, setAtualizandoStatus] = useState(false)
  const [mensagemStatus, setMensagemStatus] = useState("")

  useEffect(() => {
    async function carregarOrcamento() {
      try {
        setCarregando(true)
        setErro("")

        const {
          data: { user },
          error: erroUsuario,
        } = await supabase.auth.getUser()

        if (erroUsuario) {
          throw new Error("Não foi possível identificar o usuário.")
        }

        if (!user) {
          router.push("/login")
          return
        }

        const { data: dadosEmpresa, error: erroEmpresa } =
          await supabase
            .from("empresas")
            .select("id, nome, logo_url")
            .eq("usuario_id", user.id)
            .single()

        if (erroEmpresa || !dadosEmpresa) {
          throw new Error("Empresa não encontrada.")
        }

        setEmpresa(dadosEmpresa)

        const { data: dadosOrcamento, error: erroOrcamento } =
          await supabase
            .from("orcamentos")
            .select(
              "id, numero, cliente_id, created_at, status, validade, subtotal, desconto, total, observacoes, token_publico"
            )
            .eq("id", orcamentoId)
            .eq("empresa_id", dadosEmpresa.id)
            .single()

        if (erroOrcamento || !dadosOrcamento) {
          console.error(erroOrcamento)
          throw new Error("Orçamento não encontrado.")
        }

        setOrcamento(dadosOrcamento)

        const { data: dadosCliente, error: erroCliente } =
          await supabase
            .from("clientes")
            .select("id, nome")
            .eq("id", dadosOrcamento.cliente_id)
            .eq("empresa_id", dadosEmpresa.id)
            .single()

        if (erroCliente || !dadosCliente) {
          console.error(erroCliente)
          throw new Error("Não foi possível carregar o cliente.")
        }

        setCliente(dadosCliente)

        const { data: dadosItens, error: erroItens } =
          await supabase
            .from("orcamento_itens")
            .select(
              "id, item_id, nome, descricao, quantidade, valor_unitario"
            )
            .eq("orcamento_id", orcamentoId)
            .order("id", { ascending: true })

        if (erroItens) {
          console.error(erroItens)
          throw new Error("Não foi possível carregar os itens do orçamento.")
        }

        setItens(dadosItens || [])
      } catch (error) {
        console.error(error)
        setErro(
          error instanceof Error
            ? error.message
            : "Ocorreu um erro ao carregar o orçamento."
        )
      } finally {
        setCarregando(false)
      }
    }

    if (orcamentoId) carregarOrcamento()
  }, [orcamentoId, router])

  function formatarMoeda(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  function formatarMoedaPdf(valor: number) {
    return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`
  }

  function formatarData(data: string | null) {
    if (!data) return "-"
    const partes = data.split("T")[0].split("-")
    if (partes.length !== 3) return data
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

  function formatarStatus(status: string) {
    const nomes: Record<string, string> = {
      rascunho: "Rascunho",
      enviado: "Enviado",
      aprovado: "Aprovado",
      recusado: "Recusado",
      expirado: "Expirado",
    }
    return nomes[status] || status
  }

  function coresStatus(status: string) {
    const cores: Record<string, { fundo: string; texto: string }> = {
      aprovado: { fundo: "#dcfce7", texto: "#166534" },
      recusado: { fundo: "#fee2e2", texto: "#b91c1c" },
      enviado: { fundo: "#dbeafe", texto: "#1d4ed8" },
      expirado: { fundo: "#fef3c7", texto: "#92400e" },
      rascunho: { fundo: "#f1f5f9", texto: "#475569" },
    }
    return cores[status] || cores.rascunho
  }

  async function atualizarStatus(novoStatus: string) {
    if (!orcamento || !empresa) {
      setMensagemStatus("Não foi possível identificar o orçamento ou a empresa.")
      return false
    }

    // A expiração é automática, não pode ser definida manualmente.
    if (novoStatus === "expirado") {
      setMensagemStatus("O status Expirado é atualizado automaticamente.")
      return false
    }

    if (orcamento.status === novoStatus) {
      setMensagemStatus("Este orçamento já está com esse status.")
      return true
    }

    try {
      setAtualizandoStatus(true)
      setMensagemStatus("")

      const { error } = await supabase
        .from("orcamentos")
        .update({ status: novoStatus })
        .eq("id", orcamento.id)
        .eq("empresa_id", empresa.id)
        .select("id")
        .single()

      if (error) {
        console.error(error)
        throw new Error(
          "Não foi possível salvar o status. Verifique as permissões e tente novamente."
        )
      }

      setOrcamento((atual) =>
        atual ? { ...atual, status: novoStatus } : atual
      )
      setMensagemStatus(
        `Status atualizado para: ${formatarStatus(novoStatus)}.`
      )
      return true
    } catch (error) {
      console.error(error)
      setMensagemStatus(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao atualizar o status."
      )
      return false
    } finally {
      setAtualizandoStatus(false)
    }
  }

  async function compartilharOrcamento() {
    if (!orcamento) return

    try {
      setCompartilhando(true)
      setLinkCopiado(false)

      const link = `${window.location.origin}/orcamento/${orcamento.token_publico}`
      await navigator.clipboard.writeText(link)

      setLinkCopiado(true)
      window.setTimeout(() => setLinkCopiado(false), 3000)
    } catch (error) {
      console.error("Erro ao copiar link público:", error)
      alert(
        "Não foi possível copiar o link automaticamente. Verifique as permissões do navegador."
      )
    } finally {
      setCompartilhando(false)
    }
  }

  async function compartilharWhatsApp() {
    if (!orcamento) return

    const link = `${window.location.origin}/orcamento/${orcamento.token_publico}`
    const numero = String(orcamento.numero).padStart(6, "0")
    const nomeCliente = cliente?.nome || "cliente"

    const mensagem =
      `Olá, ${nomeCliente}!\n\n` +
      `Segue o orçamento nº ${numero}.\n\n` +
      `Você pode visualizar o orçamento pelo link abaixo:\n` +
      `${link}\n\n` +
      `Qualquer dúvida, estamos à disposição.`

    window.open(
      `https://wa.me/?text=${encodeURIComponent(mensagem)}`,
      "_blank"
    )

    if (orcamento.status === "rascunho") {
      await atualizarStatus("enviado")
    }
  }

  async function converterImagemParaDataUrl(url: string) {
    const resposta = await fetch(url)
    if (!resposta.ok) {
      throw new Error("Não foi possível carregar a logo da empresa.")
    }

    const blob = await resposta.blob()

    return await new Promise<string>((resolve, reject) => {
      const leitor = new FileReader()
      leitor.onloadend = () => {
        if (typeof leitor.result === "string") {
          resolve(leitor.result)
        } else {
          reject(new Error("Não foi possível converter a logo."))
        }
      }
      leitor.onerror = () =>
        reject(new Error("Não foi possível ler a logo."))
      leitor.readAsDataURL(blob)
    })
  }

  async function gerarPdf() {
    if (!orcamento) return

    try {
      setGerandoPdf(true)

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const margem = 18
      const larguraPagina = 210
      const larguraUtil = larguraPagina - margem * 2
      const numero = String(orcamento.numero).padStart(6, "0")
      const corPrincipal = [31, 41, 55] as [number, number, number]
      const corSecundaria = [107, 114, 128] as [number, number, number]
      const corLinha = [226, 232, 240] as [number, number, number]
      const corFundo = [248, 250, 252] as [number, number, number]

      let y = 20

      if (empresa?.logo_url) {
        try {
          const dataUrl = await converterImagemParaDataUrl(empresa.logo_url)
          const formato = dataUrl.startsWith("data:image/jpeg")
            ? "JPEG"
            : "PNG"
          doc.addImage(dataUrl, formato, margem, 15, 30, 20)
        } catch (error) {
          console.warn("Não foi possível carregar a logo no PDF:", error)
        }
      }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(23)
      doc.setTextColor(...corPrincipal)
      doc.text("ORÇAMENTO", margem, 48)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.setTextColor(...corSecundaria)
      if (empresa?.nome) doc.text(empresa.nome, margem, 55)
      doc.text(`Número: ${numero}`, larguraPagina - margem, 48, {
        align: "right",
      })
      doc.text(`Emissão: ${formatarData(orcamento.created_at)}`, larguraPagina - margem, 55, {
        align: "right",
      })

      y = 65
      doc.setDrawColor(...corLinha)
      doc.line(margem, y, larguraPagina - margem, y)
      y += 12

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(...corSecundaria)
      doc.text("DADOS DO CLIENTE", margem, y)
      y += 8

      doc.setFillColor(...corFundo)
      doc.roundedRect(margem, y - 5, larguraUtil, 20, 2, 2, "F")

      doc.setFont("helvetica", "bold")
      doc.setTextColor(...corPrincipal)
      doc.text("CLIENTE", margem + 5, y + 1)
      doc.text("VALIDADE", larguraPagina - margem - 5, y + 1, {
        align: "right",
      })

      doc.setFont("helvetica", "normal")
      doc.setFontSize(11)
      doc.text(cliente?.nome || "Cliente não encontrado", margem + 5, y + 9)
      doc.text(formatarData(orcamento.validade), larguraPagina - margem - 5, y + 9, {
        align: "right",
      })

      y += 28
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(...corSecundaria)
      doc.text("ITENS DO ORÇAMENTO", margem, y)
      y += 8

      const xDescricao = margem + 3
      const xQuantidade = 128
      const xUnitario = 163
      const xTotal = larguraPagina - margem - 3

      function cabecalhoTabela() {
        doc.setFillColor(...corPrincipal)
        doc.roundedRect(margem, y - 5, larguraUtil, 9, 1.5, 1.5, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(8)
        doc.setTextColor(255, 255, 255)
        doc.text("DESCRIÇÃO", xDescricao, y)
        doc.text("QTD.", xQuantidade, y, { align: "center" })
        doc.text("VALOR UNIT.", xUnitario, y, { align: "right" })
        doc.text("TOTAL", xTotal, y, { align: "right" })
        y += 10
      }

      cabecalhoTabela()

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)

      for (const [indice, item] of itens.entries()) {
        const descricao = item.descricao?.trim()
          ? `${item.nome}\n${item.descricao.trim()}`
          : item.nome
        const linhas = doc.splitTextToSize(descricao || "Item sem nome", 82)
        const altura = Math.max(10, linhas.length * 5 + 5)

        if (y + altura > 265) {
          doc.addPage()
          y = 20
          doc.setFont("helvetica", "bold")
          doc.setFontSize(9)
          doc.setTextColor(...corSecundaria)
          doc.text(`ORÇAMENTO Nº ${numero}`, margem, y)
          y += 10
          cabecalhoTabela()
          doc.setFont("helvetica", "normal")
          doc.setFontSize(9)
        }

        if (indice % 2 === 0) {
          doc.setFillColor(...corFundo)
          doc.rect(margem, y - 5, larguraUtil, altura, "F")
        }

        doc.setTextColor(...corPrincipal)
        doc.text(linhas, xDescricao, y)
        doc.text(String(item.quantidade), xQuantidade, y, { align: "center" })
        doc.text(formatarMoedaPdf(Number(item.valor_unitario)), xUnitario, y, {
          align: "right",
        })
        doc.setFont("helvetica", "bold")
        doc.text(
          formatarMoedaPdf(Number(item.quantidade) * Number(item.valor_unitario)),
          xTotal,
          y,
          { align: "right" }
        )
        doc.setFont("helvetica", "normal")
        doc.setDrawColor(...corLinha)
        doc.line(margem, y + altura - 5, larguraPagina - margem, y + altura - 5)
        y += altura
      }

      if (y + 55 > 270) {
        doc.addPage()
        y = 25
      }

      y += 10
      const larguraTotais = 82
      const xTotais = larguraPagina - margem - larguraTotais

      doc.setFillColor(...corFundo)
      doc.roundedRect(xTotais, y - 5, larguraTotais, 38, 2, 2, "F")
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(...corSecundaria)
      doc.text("Subtotal", xTotais + 5, y + 2)
      doc.text(formatarMoedaPdf(Number(orcamento.subtotal)), larguraPagina - margem - 5, y + 2, {
        align: "right",
      })
      y += 9
      doc.text("Desconto", xTotais + 5, y + 2)
      doc.text(formatarMoedaPdf(Number(orcamento.desconto)), larguraPagina - margem - 5, y + 2, {
        align: "right",
      })
      y += 9
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.setTextColor(...corPrincipal)
      doc.text("TOTAL", xTotais + 5, y + 6)
      doc.text(formatarMoedaPdf(Number(orcamento.total)), larguraPagina - margem - 5, y + 6, {
        align: "right",
      })
      y += 25

      if (orcamento.observacoes) {
        if (y > 255) {
          doc.addPage()
          y = 25
        }

        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(...corSecundaria)
        doc.text("OBSERVAÇÕES", margem, y)
        y += 7

        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(...corPrincipal)
        const linhas = doc.splitTextToSize(orcamento.observacoes, larguraUtil - 8)
        doc.text(linhas, margem + 4, y)
      }

      const paginas = doc.getNumberOfPages()
      for (let pagina = 1; pagina <= paginas; pagina++) {
        doc.setPage(pagina)
        doc.setDrawColor(...corLinha)
        doc.line(margem, 283, larguraPagina - margem, 283)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(...corSecundaria)
        doc.text(`Orçamento nº ${numero}`, margem, 289)
        doc.text(`Página ${pagina} de ${paginas}`, larguraPagina - margem, 289, {
          align: "right",
        })
      }

      doc.save(`orcamento-${numero}.pdf`)
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
      alert("Não foi possível gerar o PDF.")
    } finally {
      setGerandoPdf(false)
    }
  }

  if (carregando) {
    return (
      <main style={estilos.pagina}>
        <div style={estilos.cartao}>
          <p style={estilos.subtitulo}>Carregando os dados do orçamento...</p>
        </div>
      </main>
    )
  }

  if (erro || !orcamento) {
    return (
      <main style={estilos.pagina}>
        <section style={estilos.cartao}>
          <h1 style={estilos.titulo}>Não foi possível abrir o orçamento</h1>
          <p style={estilos.subtitulo}>{erro || "Orçamento não encontrado."}</p>
          <button
            type="button"
            onClick={() => router.push("/orcamentos/historico")}
            style={{ ...estilos.botao, marginTop: "20px" }}
          >
            ← Voltar ao histórico
          </button>
        </section>
      </main>
    )
  }

  const statusCores = coresStatus(orcamento.status)
  const numeroFormatado = String(orcamento.numero).padStart(6, "0")

  return (
    <main style={estilos.pagina}>
      <style>{`
        .detalhe-botao { transition: transform .15s ease, box-shadow .15s ease, filter .15s ease; }
        .detalhe-botao:hover { filter: brightness(.97); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(15,23,42,.08); }
        .detalhe-tabela { width:100%; border-collapse:collapse; }
        .detalhe-tabela th { padding:13px 12px; background:#f8fafc; color:#64748b; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.5px; text-align:left; }
        .detalhe-tabela td { padding:16px 12px; border-bottom:1px solid #edf1f7; font-size:13px; color:#334155; vertical-align:top; }
        .detalhe-tabela tbody tr:last-child td { border-bottom:none; }
        @media(max-width:640px) {
          .detalhe-pagina { padding:22px 14px 36px !important; }
          .detalhe-cartao { padding:17px !important; }
          .detalhe-tabela th, .detalhe-tabela td { padding:11px 7px; }
          .detalhe-tabela { font-size:12px; }
        }
      `}</style>

      <div
        className="detalhe-pagina"
        style={{ display: "grid", gap: "22px" }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                color: "#2563eb",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#2563eb",
                }}
              />
              Orçamentos
            </div>

            <h1 style={estilos.titulo}>Orçamento {numeroFormatado}</h1>
            <p style={estilos.subtitulo}>
              Consulte os detalhes, acompanhe o status e compartilhe sua proposta.
            </p>
          </div>

          <button
            type="button"
            className="detalhe-botao"
            onClick={() => router.push("/orcamentos/historico")}
            style={estilos.botao}
          >
            ← Voltar ao histórico
          </button>
        </header>

        <section
          className="detalhe-cartao"
          style={{
            ...estilos.cartao,
            padding: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={estilos.rotulo}>CLIENTE</p>
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                  lineHeight: 1.4,
                  overflowWrap: "anywhere",
                }}
              >
                {cliente?.nome || "Cliente não encontrado"}
              </h2>
              <p style={estilos.subtitulo}>
                Orçamento nº {numeroFormatado}
              </p>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 14px",
                borderRadius: "30px",
                background: statusCores.fundo,
                color: statusCores.texto,
                fontSize: "13px",
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: statusCores.texto,
                }}
              />
              {formatarStatus(orcamento.status)}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
              gap: "14px",
              marginTop: "25px",
            }}
          >
            {[
              {
                rotulo: "Número",
                valor: numeroFormatado,
              },
              {
                rotulo: "Data de emissão",
                valor: formatarData(orcamento.created_at),
              },
              {
                rotulo: "Validade",
                valor: formatarData(orcamento.validade),
              },
            ].map((campo) => (
              <div
                key={campo.rotulo}
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  border: "1px solid #edf1f7",
                  minWidth: 0,
                }}
              >
                <p style={estilos.rotulo}>{campo.rotulo}</p>
                <p style={estilos.valor}>{campo.valor}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="detalhe-cartao" style={estilos.cartao}>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={estilos.tituloSecao}>Status do orçamento</h2>
            <p style={estilos.descricaoSecao}>
              Atualize o andamento da proposta. A expiração é controlada automaticamente.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
              alignItems: "end",
              gap: "16px",
            }}
          >
            <div>
              <label
                htmlFor="status-orcamento"
                style={{ ...estilos.rotulo, marginBottom: "8px" }}
              >
                Alterar status
              </label>
              <select
                id="status-orcamento"
                value={orcamento.status}
                disabled={atualizandoStatus}
                onChange={(evento) => atualizarStatus(evento.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1px solid #dbe3ef",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  background: "#ffffff",
                  color: "#172033",
                  fontSize: "14px",
                  cursor: atualizandoStatus ? "wait" : "pointer",
                }}
              >
                <option value="rascunho">Rascunho</option>
                <option value="enviado">Enviado</option>
                <option value="aprovado">Aprovado</option>
                <option value="recusado">Recusado</option>
                <option value="expirado" disabled>
                  Expirado (automático)
                </option>
              </select>
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#eff6ff",
                color: "#1e40af",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              {atualizandoStatus
                ? "Salvando alteração..."
                : "As alterações de status são salvas no sistema."}
            </div>
          </div>

          {mensagemStatus && (
            <p
              role="status"
              style={{
                margin: "14px 0 0",
                color:
                  mensagemStatus.startsWith("Não foi") ||
                  mensagemStatus.startsWith("Ocorreu")
                    ? "#b91c1c"
                    : "#166534",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              {mensagemStatus}
            </p>
          )}
        </section>

        <section className="detalhe-cartao" style={estilos.cartao}>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={estilos.tituloSecao}>Itens do orçamento</h2>
            <p style={estilos.descricaoSecao}>
              Confira os produtos e serviços que compõem a proposta.
            </p>
          </div>

          {itens.length === 0 ? (
            <div
              style={{
                padding: "30px 20px",
                border: "1px dashed #cbd5e1",
                borderRadius: "12px",
                background: "#f8fafc",
                textAlign: "center",
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Nenhum item cadastrado neste orçamento.
            </div>
          ) : (
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table className="detalhe-tabela">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: "center" }}>Quantidade</th>
                    <th style={{ textAlign: "right" }}>Valor unitário</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => {
                    const totalItem =
                      Number(item.quantidade) * Number(item.valor_unitario)

                    return (
                      <tr key={item.id}>
                        <td>
                          <strong
                            style={{
                              display: "block",
                              color: "#172033",
                              fontSize: "14px",
                            }}
                          >
                            {item.nome || "Item sem nome"}
                          </strong>
                          {item.descricao?.trim() && (
                            <p
                              style={{
                                margin: "5px 0 0",
                                color: "#64748b",
                                fontSize: "12px",
                                lineHeight: 1.6,
                              }}
                            >
                              {item.descricao}
                            </p>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {item.quantidade}
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          {formatarMoeda(Number(item.valor_unitario))}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            whiteSpace: "nowrap",
                            color: "#172033",
                            fontWeight: 750,
                          }}
                        >
                          {formatarMoeda(totalItem)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section
          className="detalhe-cartao"
          style={{
            ...estilos.cartao,
            background: "linear-gradient(135deg, #172554 0%, #1d4ed8 100%)",
            color: "#ffffff",
            border: "none",
            boxShadow: "0 12px 30px rgba(37,99,235,.16)",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: "#bfdbfe",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}
          >
            Resumo financeiro
          </p>
          <h2
            style={{
              margin: "0 0 22px",
              color: "#ffffff",
              fontSize: "22px",
              fontWeight: 800,
            }}
          >
            Valores do orçamento
          </h2>

          <div style={{ display: "grid", gap: "15px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                color: "#dbeafe",
                fontSize: "14px",
              }}
            >
              <span>Subtotal</span>
              <strong style={{ color: "#ffffff" }}>
                {formatarMoeda(Number(orcamento.subtotal))}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                color: "#dbeafe",
                fontSize: "14px",
              }}
            >
              <span>Desconto</span>
              <strong style={{ color: "#ffffff" }}>
                − {formatarMoeda(Number(orcamento.desconto))}
              </strong>
            </div>

            <div
              style={{
                height: "1px",
                background: "rgba(255,255,255,.22)",
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <strong style={{ fontSize: "15px", color: "#ffffff" }}>
                Total do orçamento
              </strong>
              <strong
                style={{
                  color: "#ffffff",
                  fontSize: "clamp(25px, 4vw, 34px)",
                  letterSpacing: "-.7px",
                }}
              >
                {formatarMoeda(Number(orcamento.total))}
              </strong>
            </div>
          </div>
        </section>

        {orcamento.observacoes && (
          <section className="detalhe-cartao" style={estilos.cartao}>
            <h2 style={estilos.tituloSecao}>Observações</h2>
            <p
              style={{
                ...estilos.subtitulo,
                marginTop: "12px",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {orcamento.observacoes}
            </p>
          </section>
        )}

        <section className="detalhe-cartao" style={estilos.cartao}>
          <h2 style={estilos.tituloSecao}>Ações do orçamento</h2>
          <p style={{ ...estilos.descricaoSecao, marginBottom: "20px" }}>
            Edite a proposta, gere um PDF ou compartilhe com seu cliente.
          </p>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="detalhe-botao"
              onClick={() => router.push(`/orcamentos/${orcamento.id}/editar`)}
              style={{
                ...estilos.botao,
                background: "#2563eb",
                borderColor: "#2563eb",
                color: "#ffffff",
              }}
            >
              ✎ Editar
            </button>

            <button
              type="button"
              className="detalhe-botao"
              onClick={gerarPdf}
              disabled={gerandoPdf}
              style={{
                ...estilos.botao,
                opacity: gerandoPdf ? 0.7 : 1,
                cursor: gerandoPdf ? "wait" : "pointer",
              }}
            >
              {gerandoPdf ? "Gerando PDF..." : "↓ Gerar PDF"}
            </button>

            <button
              type="button"
              className="detalhe-botao"
              onClick={compartilharOrcamento}
              disabled={compartilhando}
              style={{
                ...estilos.botao,
                opacity: compartilhando ? 0.7 : 1,
                cursor: compartilhando ? "wait" : "pointer",
              }}
            >
              {compartilhando
                ? "Copiando..."
                : linkCopiado
                  ? "✓ Link copiado!"
                  : "↗ Compartilhar link"}
            </button>

            <button
              type="button"
              className="detalhe-botao"
              onClick={compartilharWhatsApp}
              style={{
                ...estilos.botao,
                background: "#16a34a",
                borderColor: "#16a34a",
                color: "#ffffff",
              }}
            >
              WhatsApp
            </button>
          </div>

          <p
            style={{
              margin: "16px 0 0",
              color: "#64748b",
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          >
            O link compartilhado permite que o cliente visualize este orçamento
            sem precisar fazer login.
          </p>
        </section>
      </div>
    </main>
  )
}
