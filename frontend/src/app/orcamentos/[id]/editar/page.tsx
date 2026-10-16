
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "../../../../../lib/supabase"

type Cliente = {
  id: string
  nome: string
}

type ItemCadastro = {
  id: string
  nome: string
  descricao: string | null
  valor: number
}

type ItemOrcamento = {
  id: string
  item_id: string
  nome: string
  descricao: string | null
  quantidade: number
  valor_unitario: number
  valor_total: number
}

const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })

const campoEstilo: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  marginTop: "7px",
  border: "1px solid #dbe3ef",
  borderRadius: "10px",
  background: "#fff",
  color: "#172033",
  fontSize: "14px",
  outlineColor: "#2563eb",
}

const rotuloEstilo: React.CSSProperties = {
  display: "block",
  color: "#475569",
  fontSize: "13px",
  fontWeight: 700,
}

const cartaoEstilo: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "24px",
  boxShadow: "0 4px 16px rgba(15,23,42,.035)",
  minWidth: 0,
}

const botaoEstilo: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "12px 18px",
  border: "1px solid #dbe3ef",
  borderRadius: "10px",
  background: "#fff",
  color: "#334155",
  fontSize: "13px",
  fontWeight: 750,
  cursor: "pointer",
  transition: "all .15s ease",
}

export default function EditarOrcamentoPage() {
  const params = useParams()
  const router = useRouter()
  const orcamentoId = params.id as string

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [numero, setNumero] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [validade, setValidade] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const [desconto, setDesconto] = useState("0")

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [itensCadastro, setItensCadastro] = useState<ItemCadastro[]>([])
  const [itens, setItens] = useState<ItemOrcamento[]>([])

  const [novoItemId, setNovoItemId] = useState("")
  const [novaQuantidade, setNovaQuantidade] = useState("1")
  const [erro, setErro] = useState("")

  useEffect(() => {
    carregarDados()
  }, [orcamentoId])

  async function carregarDados() {
    try {
      setCarregando(true)
      setErro("")

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      const { data: empresa, error: erroEmpresa } = await supabase
        .from("empresas")
        .select("id")
        .eq("usuario_id", session.user.id)
        .single()

      if (erroEmpresa || !empresa) {
        throw new Error("Empresa não encontrada.")
      }

      const { data: orcamento, error: erroOrcamento } = await supabase
        .from("orcamentos")
        .select(`
          id,
          numero,
          cliente_id,
          desconto,
          validade,
          observacoes
        `)
        .eq("id", orcamentoId)
        .eq("empresa_id", empresa.id)
        .single()

      if (erroOrcamento || !orcamento) {
        throw new Error("Orçamento não encontrado.")
      }

      setNumero(String(orcamento.numero))
      setClienteId(orcamento.cliente_id)
      setDesconto(String(orcamento.desconto ?? 0))
      setValidade(orcamento.validade ?? "")
      setObservacoes(orcamento.observacoes ?? "")

      const { data: dadosClientes, error: erroClientes } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("empresa_id", empresa.id)
        .eq("ativo", true)
        .order("nome")

      if (erroClientes) throw erroClientes

      setClientes(dadosClientes ?? [])

      const { data: dadosItensCadastro, error: erroItensCadastro } =
        await supabase
          .from("itens")
          .select("id, nome, descricao, valor")
          .eq("empresa_id", empresa.id)
          .eq("ativo", true)
          .order("nome")

      if (erroItensCadastro) throw erroItensCadastro

      setItensCadastro(dadosItensCadastro ?? [])

      const { data: dadosItensOrcamento, error: erroItensOrcamento } =
        await supabase
          .from("orcamento_itens")
          .select(`
            id,
            item_id,
            nome,
            descricao,
            quantidade,
            valor_unitario,
            valor_total
          `)
          .eq("orcamento_id", orcamentoId)
          .order("id")

      if (erroItensOrcamento) throw erroItensOrcamento

      const itensCarregados: ItemOrcamento[] =
        (dadosItensOrcamento ?? []).map((item) => ({
          id: item.id,
          item_id: item.item_id,
          nome: item.nome,
          descricao: item.descricao,
          quantidade: Number(item.quantidade),
          valor_unitario: Number(item.valor_unitario),
          valor_total:
            Number(item.quantidade) * Number(item.valor_unitario),
        }))

      setItens(itensCarregados)
    } catch (error) {
      console.error(error)
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao carregar o orçamento."
      )
    } finally {
      setCarregando(false)
    }
  }

  function gerarIdTemporario() {
    return `novo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  function adicionarItem() {
    if (!novoItemId) {
      setErro("Selecione um item.")
      return
    }

    const quantidade = Number(novaQuantidade)

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      setErro("Informe uma quantidade válida.")
      return
    }

    const itemCadastro = itensCadastro.find(
      (item) => item.id === novoItemId
    )

    if (!itemCadastro) {
      setErro("Item não encontrado.")
      return
    }

    const itemExistente = itens.find(
      (item) => item.item_id === novoItemId
    )

    if (itemExistente) {
      setItens(
        itens.map((item) => {
          if (item.item_id !== novoItemId) return item

          const novaQtd = item.quantidade + quantidade

          return {
            ...item,
            quantidade: novaQtd,
            valor_total: novaQtd * item.valor_unitario,
          }
        })
      )
    } else {
      setItens([
        ...itens,
        {
          id: gerarIdTemporario(),
          item_id: itemCadastro.id,
          nome: itemCadastro.nome,
          descricao: itemCadastro.descricao,
          quantidade,
          valor_unitario: itemCadastro.valor,
          valor_total: quantidade * itemCadastro.valor,
        },
      ])
    }

    setNovoItemId("")
    setNovaQuantidade("1")
    setErro("")
  }

  function removerItem(id: string) {
    setItens(itens.filter((item) => item.id !== id))
  }

  function alterarQuantidade(id: string, valor: string) {
    const quantidade = Number(valor)

    setItens(
      itens.map((item) => {
        if (item.id !== id) return item

        const quantidadeValida =
          Number.isFinite(quantidade) && quantidade > 0

        return {
          ...item,
          quantidade: quantidadeValida ? quantidade : 0,
          valor_total: quantidadeValida
            ? quantidade * item.valor_unitario
            : 0,
        }
      })
    )
  }

  function alterarValorUnitario(id: string, valor: string) {
    const valorNumerico = Number(valor)

    setItens(
      itens.map((item) => {
        if (item.id !== id) return item

        const valorValido =
          Number.isFinite(valorNumerico) && valorNumerico >= 0

        const novoValor = valorValido ? valorNumerico : 0

        return {
          ...item,
          valor_unitario: novoValor,
          valor_total: item.quantidade * novoValor,
        }
      })
    )
  }

  const subtotal = itens.reduce(
    (soma, item) => soma + item.valor_total,
    0
  )

  const descontoNumerico = Number(desconto) || 0
  const total = Math.max(subtotal - descontoNumerico, 0)

  async function salvarAlteracoes() {
    try {
      setSalvando(true)
      setErro("")

      if (!clienteId) {
        setErro("Selecione um cliente.")
        return
      }

      if (itens.length === 0) {
        setErro("Adicione pelo menos um item ao orçamento.")
        return
      }

      const algumItemInvalido = itens.some(
        (item) =>
          !Number.isFinite(item.quantidade) ||
          item.quantidade <= 0 ||
          !Number.isFinite(item.valor_unitario) ||
          item.valor_unitario < 0
      )

      if (algumItemInvalido) {
        setErro("Verifique as quantidades e valores dos itens.")
        return
      }

      if (!Number.isFinite(descontoNumerico) || descontoNumerico < 0) {
        setErro("Informe um desconto válido.")
        return
      }

      if (descontoNumerico > subtotal) {
        setErro("O desconto não pode ser maior que o subtotal.")
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        router.push("/login")
        return
      }

      const resposta = await fetch(
        `http://127.0.0.1:8000/orcamentos/${orcamentoId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            cliente_id: clienteId,
            itens: itens.map((item) => ({
              item_id: item.item_id,
              quantidade: item.quantidade,
              valor_unitario: item.valor_unitario,
            })),
            desconto: descontoNumerico,
            validade: validade || null,
            observacoes: observacoes || null,
          }),
        }
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.detail || "Erro ao atualizar o orçamento."
        )
      }

      router.push(`/orcamentos/${orcamentoId}`)
    } catch (error) {
      console.error(error)
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao salvar as alterações."
      )
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <main className="editar-pagina">
        <div className="editar-carregamento">
          <div className="editar-spinner" />
          <h1>Carregando orçamento</h1>
          <p>Estamos preparando os dados para edição.</p>
        </div>

        <style>{`
          .editar-pagina {
            min-height: 100%;
            padding: 36px 24px;
            color: #172033;
          }
          .editar-carregamento {
            max-width: 600px;
            margin: 50px auto;
            padding: 36px;
            text-align: center;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
          }
          .editar-carregamento h1 { font-size: 22px; margin: 16px 0 8px; }
          .editar-carregamento p { color: #64748b; font-size: 14px; }
          .editar-spinner {
            width: 30px; height: 30px; margin: auto;
            border: 3px solid #dbeafe; border-top-color: #2563eb;
            border-radius: 50%; animation: editar-spin .8s linear infinite;
          }
          @keyframes editar-spin { to { transform: rotate(360deg); } }
        `}</style>
      </main>
    )
  }

  return (
    <main className="editar-pagina">
      <style>{`
        .editar-pagina {
          box-sizing: border-box;
          max-width: 1240px;
          margin: 0 auto;
          padding: 32px 24px 56px;
          color: #172033;
        }
        .editar-pagina * { box-sizing: border-box; }
        .editar-cabecalho {
          display: flex; justify-content: space-between;
          align-items: flex-start; gap: 20px; flex-wrap: wrap;
          margin-bottom: 25px;
        }
        .editar-eyebrow {
          display: flex; align-items: center; gap: 8px;
          color: #2563eb; font-size: 11px; font-weight: 800;
          letter-spacing: 1.4px; text-transform: uppercase;
          margin-bottom: 10px;
        }
        .editar-pagina h1 {
          margin: 0; font-size: clamp(26px, 4vw, 34px);
          line-height: 1.2; letter-spacing: -.8px; font-weight: 800;
          color: #172033;
        }
        .editar-subtitulo {
          margin: 9px 0 0; color: #64748b; font-size: 14px;
          line-height: 1.7;
        }
        .editar-card {
          background: #fff; border: 1px solid #e2e8f0;
          border-radius: 16px; padding: 24px; margin-bottom: 20px;
          box-shadow: 0 4px 16px rgba(15,23,42,.035);
          min-width: 0;
        }
        .editar-card-cabecalho { margin-bottom: 22px; }
        .editar-card h2 {
          margin: 0; color: #172033; font-size: 18px;
          line-height: 1.4; font-weight: 800;
        }
        .editar-card-descricao {
          margin: 7px 0 0; color: #64748b; font-size: 13px;
          line-height: 1.6;
        }
        .editar-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
          gap: 20px;
        }
        .editar-campo { min-width: 0; }
        .editar-campo label {
          display: block; color: #475569; font-size: 13px;
          font-weight: 700; margin-bottom: 8px;
        }
        .editar-campo input, .editar-campo select,
        .editar-campo textarea {
          display: block; width: 100%; min-width: 0;
          padding: 12px 14px; border: 1px solid #dbe3ef;
          border-radius: 10px; background: #fff; color: #172033;
          font: inherit; font-size: 14px; outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .editar-campo input:focus, .editar-campo select:focus,
        .editar-campo textarea:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(37,99,235,.1);
        }
        .editar-campo textarea { resize: vertical; line-height: 1.6; }
        .editar-adicionar-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 130px auto;
          gap: 14px; align-items: end;
        }
        .editar-botao {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; padding: 12px 17px; border: 1px solid #dbe3ef;
          border-radius: 10px; background: white; color: #334155;
          font-size: 13px; font-weight: 750; cursor: pointer;
          transition: transform .15s, box-shadow .15s, filter .15s;
        }
        .editar-botao:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15,23,42,.08);
          filter: brightness(.98);
        }
        .editar-botao:disabled { opacity: .6; cursor: not-allowed; }
        .editar-botao-principal {
          color: white; background: #2563eb; border-color: #2563eb;
        }
        .editar-botao-perigo {
          padding: 8px 11px; border-color: #fecaca;
          color: #b91c1c; background: #fff7f7;
        }
        .editar-erro {
          padding: 14px 16px; border: 1px solid #fecaca;
          border-radius: 12px; background: #fff1f2;
          color: #b91c1c; font-size: 13px; line-height: 1.6;
          margin-bottom: 20px;
        }
        .editar-tabela-wrapper { width: 100%; overflow-x: auto; }
        .editar-tabela { width: 100%; border-collapse: collapse; }
        .editar-tabela th {
          padding: 13px 12px; background: #f8fafc;
          color: #64748b; font-size: 11px; font-weight: 800;
          text-transform: uppercase; letter-spacing: .4px; text-align: left;
        }
        .editar-tabela td {
          padding: 15px 12px; border-bottom: 1px solid #edf1f7;
          font-size: 13px; color: #334155; vertical-align: middle;
        }
        .editar-tabela tbody tr:last-child td { border-bottom: none; }
        .editar-tabela input {
          width: 100%; min-width: 85px; padding: 10px;
          border: 1px solid #dbe3ef; border-radius: 8px;
          color: #172033; font-size: 13px; background: #fff;
        }
        .editar-vazio {
          padding: 35px 20px; text-align: center;
          border: 1px dashed #cbd5e1; border-radius: 12px;
          color: #64748b; background: #f8fafc; font-size: 13px;
        }
        .editar-resumo {
          max-width: 480px; margin-left: auto;
          background: linear-gradient(135deg, #172554, #1d4ed8);
          color: white; border: none;
        }
        .editar-resumo h2 { color: white; }
        .editar-resumo .editar-card-descricao { color: #bfdbfe; }
        .editar-resumo-linha {
          display: flex; justify-content: space-between;
          align-items: center; gap: 16px; margin-top: 16px;
          color: #dbeafe; font-size: 14px;
        }
        .editar-resumo-linha strong { color: white; }
        .editar-resumo-total {
          display: flex; justify-content: space-between;
          align-items: center; flex-wrap: wrap; gap: 12px;
          margin-top: 20px; padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,.22);
        }
        .editar-resumo-valor {
          font-size: clamp(25px, 4vw, 32px);
          font-weight: 850; letter-spacing: -.7px;
        }
        .editar-acoes {
          display: flex; justify-content: space-between;
          gap: 12px; flex-wrap: wrap; margin-top: 24px;
        }
        .editar-acoes-direita {
          display: flex; gap: 10px; flex-wrap: wrap;
        }
        @media(max-width: 700px) {
          .editar-pagina { padding: 22px 14px 36px; }
          .editar-card { padding: 18px; }
          .editar-adicionar-grid { grid-template-columns: 1fr; }
          .editar-adicionar-grid .editar-botao { width: 100%; }
          .editar-tabela th, .editar-tabela td { padding: 11px 8px; }
          .editar-acoes, .editar-acoes-direita { width: 100%; }
          .editar-acoes > button, .editar-acoes-direita > button { flex: 1; }
        }
      `}</style>

      <header className="editar-cabecalho">
        <div>
          <div className="editar-eyebrow">
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#2563eb",
              }}
            />
            Orçamentos / Edição
          </div>

          <h1>Editar orçamento</h1>
          <p className="editar-subtitulo">
            Atualize os dados da proposta, os itens e os valores antes de salvar.
          </p>
        </div>

        <button
          type="button"
          className="editar-botao"
          onClick={() => router.push(`/orcamentos/${orcamentoId}`)}
          disabled={salvando}
        >
          ← Voltar ao orçamento
        </button>
      </header>

      {erro && (
        <div className="editar-erro" role="alert">
          <strong>Não foi possível concluir a operação.</strong>
          <div>{erro}</div>
        </div>
      )}

      <section className="editar-card">
        <div className="editar-card-cabecalho">
          <h2>Dados do orçamento</h2>
          <p className="editar-card-descricao">
            Confira o cliente, a validade e as condições comerciais.
          </p>
        </div>

        <div className="editar-grid">
          <div className="editar-campo">
            <label htmlFor="cliente">Cliente</label>
            <select
              id="cliente"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">Selecione um cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="editar-campo">
            <label htmlFor="validade">Validade do orçamento</label>
            <input
              id="validade"
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
            />
          </div>

          <div className="editar-campo">
            <label htmlFor="desconto">Desconto (R$)</label>
            <input
              id="desconto"
              type="number"
              min="0"
              step="0.01"
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
            />
          </div>
        </div>

        <div className="editar-campo" style={{ marginTop: 22 }}>
          <label htmlFor="observacoes">Observações</label>
          <textarea
            id="observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={4}
            placeholder="Inclua condições, prazos ou informações adicionais..."
          />
        </div>
      </section>

      <section className="editar-card">
        <div className="editar-card-cabecalho">
          <h2>Adicionar produto ou serviço</h2>
          <p className="editar-card-descricao">
            Escolha um item cadastrado e informe a quantidade desejada.
          </p>
        </div>

        <div className="editar-adicionar-grid">
          <div className="editar-campo">
            <label htmlFor="novo-item">Produto ou serviço</label>
            <select
              id="novo-item"
              value={novoItemId}
              onChange={(e) => setNovoItemId(e.target.value)}
            >
              <option value="">Selecione um item</option>
              {itensCadastro.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome} — {moeda(Number(item.valor))}
                </option>
              ))}
            </select>
          </div>

          <div className="editar-campo">
            <label htmlFor="nova-quantidade">Quantidade</label>
            <input
              id="nova-quantidade"
              type="number"
              min="1"
              step="1"
              value={novaQuantidade}
              onChange={(e) => setNovaQuantidade(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="editar-botao editar-botao-principal"
            onClick={adicionarItem}
          >
            + Adicionar item
          </button>
        </div>
      </section>

      <section className="editar-card">
        <div className="editar-card-cabecalho">
          <h2>Itens do orçamento</h2>
          <p className="editar-card-descricao">
            Altere quantidades e valores unitários ou remova itens da proposta.
          </p>
        </div>

        {itens.length === 0 ? (
          <div className="editar-vazio">
            Nenhum item adicionado. Escolha um produto ou serviço acima para começar.
          </div>
        ) : (
          <div className="editar-tabela-wrapper">
            <table className="editar-tabela">
              <thead>
                <tr>
                  <th>Produto ou serviço</th>
                  <th>Quantidade</th>
                  <th>Valor unitário</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th style={{ textAlign: "center" }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong
                        style={{
                          display: "block",
                          color: "#172033",
                          fontSize: 13,
                        }}
                      >
                        {item.nome}
                      </strong>
                      {item.descricao && (
                        <span
                          style={{
                            display: "block",
                            marginTop: 5,
                            color: "#64748b",
                            fontSize: 12,
                            lineHeight: 1.5,
                          }}
                        >
                          {item.descricao}
                        </span>
                      )}
                    </td>

                    <td>
                      <input
                        aria-label={`Quantidade de ${item.nome}`}
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantidade}
                        onChange={(e) =>
                          alterarQuantidade(item.id, e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        aria-label={`Valor unitário de ${item.nome}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.valor_unitario}
                        onChange={(e) =>
                          alterarValorUnitario(item.id, e.target.value)
                        }
                      />
                    </td>

                    <td
                      style={{
                        textAlign: "right",
                        whiteSpace: "nowrap",
                        fontWeight: 800,
                        color: "#172033",
                      }}
                    >
                      {moeda(item.valor_total)}
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="editar-botao editar-botao-perigo"
                        onClick={() => removerItem(item.id)}
                        aria-label={`Remover ${item.nome}`}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="editar-card editar-resumo">
        <div className="editar-card-cabecalho">
          <h2>Resumo financeiro</h2>
          <p className="editar-card-descricao">
            Confira os valores atualizados antes de salvar.
          </p>
        </div>

        <div className="editar-resumo-linha">
          <span>Subtotal</span>
          <strong>{moeda(subtotal)}</strong>
        </div>

        <div className="editar-resumo-linha">
          <span>Desconto</span>
          <strong>− {moeda(descontoNumerico)}</strong>
        </div>

        <div className="editar-resumo-total">
          <span style={{ fontSize: 14, fontWeight: 750 }}>
            Total do orçamento
          </span>
          <span className="editar-resumo-valor">{moeda(total)}</span>
        </div>
      </section>

      <div className="editar-acoes">
        <button
          type="button"
          className="editar-botao"
          onClick={() => router.push(`/orcamentos/${orcamentoId}`)}
          disabled={salvando}
        >
          Cancelar
        </button>

        <div className="editar-acoes-direita">
          <button
            type="button"
            className="editar-botao"
            onClick={() => router.push(`/orcamentos/${orcamentoId}`)}
            disabled={salvando}
          >
            Descartar alterações
          </button>

          <button
            type="button"
            className="editar-botao editar-botao-principal"
            onClick={salvarAlteracoes}
            disabled={salvando}
          >
            {salvando ? "Salvando alterações..." : "✓ Salvar alterações"}
          </button>
        </div>
      </div>
    </main>
  )
}
