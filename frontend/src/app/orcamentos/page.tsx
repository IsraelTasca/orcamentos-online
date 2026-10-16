
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Cliente = {
  id: string
  nome: string
}

type Item = {
  id: string
  nome: string
  descricao: string | null
  valor: number
}

type ItemOrcamento = {
  id: string
  itemId: string
  nome: string
  descricao: string | null
  quantidade: number
  valorUnitario: number
  valorTotal: number
}

const estilos = {
  pagina: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px 56px',
    color: '#172033',
  } as React.CSSProperties,
  cartao: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.035)',
    minWidth: 0,
  } as React.CSSProperties,
  tituloSecao: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#172033',
  } as React.CSSProperties,
  descricaoSecao: {
    margin: '7px 0 0',
    fontSize: '13px',
    lineHeight: 1.6,
    color: '#64748b',
  } as React.CSSProperties,
  campo: {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    border: '1px solid #dbe3ef',
    borderRadius: '10px',
    background: '#ffffff',
    color: '#172033',
    padding: '12px 14px',
    fontSize: '14px',
    outlineColor: '#2563eb',
  } as React.CSSProperties,
  rotulo: {
    display: 'block',
    marginBottom: '8px',
    color: '#334155',
    fontSize: '13px',
    fontWeight: 600,
  } as React.CSSProperties,
  botaoPrimario: {
    border: 'none',
    borderRadius: '10px',
    background: '#2563eb',
    color: '#ffffff',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  } as React.CSSProperties,
  botaoSecundario: {
    border: '1px solid #dbe3ef',
    borderRadius: '10px',
    background: '#ffffff',
    color: '#334155',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,
  grade: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
    gap: '20px',
    alignItems: 'start',
  } as React.CSSProperties,
} 

export default function OrcamentosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [itens, setItens] = useState<Item[]>([])

  const [clienteId, setClienteId] = useState('')
  const [itemSelecionadoId, setItemSelecionadoId] = useState('')

  const [quantidade, setQuantidade] = useState('1')
  const [desconto, setDesconto] = useState('0')
  const [validade, setValidade] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [itensOrcamento, setItensOrcamento] = useState<
    ItemOrcamento[]
  >([])

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)
    setMensagem('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMensagem('Usuário não está autenticado.')
      setCarregando(false)
      return
    }

    const {
      data: empresa,
      error: empresaError,
    } = await supabase
      .from('empresas')
      .select('id')
      .eq('usuario_id', user.id)
      .single()

    if (empresaError || !empresa) {
      console.error(empresaError)

      setMensagem(
        'Não foi possível encontrar a empresa cadastrada.'
      )

      setCarregando(false)
      return
    }

    const [clientesResult, itensResult] = await Promise.all([
      supabase
        .from('clientes')
        .select('id, nome')
        .eq('empresa_id', empresa.id)
        .eq('ativo', true)
        .order('nome'),

      supabase
        .from('itens')
        .select('id, nome, descricao, valor')
        .eq('empresa_id', empresa.id)
        .eq('ativo', true)
        .order('nome'),
    ])

    if (clientesResult.error) {
      console.error(clientesResult.error)

      setMensagem(
        `Erro ao carregar clientes: ${clientesResult.error.message}`
      )

      setCarregando(false)
      return
    }

    if (itensResult.error) {
      console.error(itensResult.error)

      setMensagem(
        `Erro ao carregar itens: ${itensResult.error.message}`
      )

      setCarregando(false)
      return
    }

    setClientes(clientesResult.data ?? [])
    setItens(itensResult.data ?? [])

    setCarregando(false)
  }

  async function testarAutenticacao() {
    setMensagem('Testando autenticação...')

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        setMensagem(
          'Não foi possível obter a sessão do usuário.'
        )
        return
      }

      const resposta = await fetch(
        'http://127.0.0.1:8000/teste-autenticacao',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        console.error(dados)

        setMensagem(
          `Erro na autenticação: ${
            dados.detail ?? 'Erro desconhecido.'
          }`
        )

        return
      }

      setMensagem(
        `Autenticação funcionando! Usuário identificado: ${dados.email}`
      )
    } catch (erro) {
      console.error(erro)

      setMensagem(
        'Não foi possível conectar ao backend.'
      )
    }
  }

  function adicionarItem() {
    setMensagem('')

    if (!itemSelecionadoId) {
      setMensagem('Selecione um item.')
      return
    }

    const quantidadeNumerica = Number(
      quantidade.replace(',', '.')
    )

    if (
      !Number.isFinite(quantidadeNumerica) ||
      quantidadeNumerica <= 0
    ) {
      setMensagem('Informe uma quantidade válida.')
      return
    }

    const item = itens.find(
      (item) => item.id === itemSelecionadoId
    )

    if (!item) {
      setMensagem('Item não encontrado.')
      return
    }

    const valorUnitario = Number(item.valor)
    const valorTotal = quantidadeNumerica * valorUnitario

    const novoItem: ItemOrcamento = {
      id: crypto.randomUUID(),
      itemId: item.id,
      nome: item.nome,
      descricao: item.descricao,
      quantidade: quantidadeNumerica,
      valorUnitario,
      valorTotal,
    }

    setItensOrcamento((listaAtual) => [
      ...listaAtual,
      novoItem,
    ])

    setItemSelecionadoId('')
    setQuantidade('1')
  }

  function removerItem(id: string) {
    setItensOrcamento((listaAtual) =>
      listaAtual.filter((item) => item.id !== id)
    )
  }

  function atualizarQuantidade(
    id: string,
    novaQuantidade: string
  ) {
    const quantidadeNumerica = Number(
      novaQuantidade.replace(',', '.')
    )

    if (
      !Number.isFinite(quantidadeNumerica) ||
      quantidadeNumerica <= 0
    ) {
      return
    }

    setItensOrcamento((listaAtual) =>
      listaAtual.map((item) => {
        if (item.id !== id) {
          return item
        }

        const valorTotal =
          quantidadeNumerica * item.valorUnitario

        return {
          ...item,
          quantidade: quantidadeNumerica,
          valorTotal,
        }
      })
    )
  }

  function atualizarValorUnitario(
    id: string,
    novoValor: string
  ) {
    const valorNumerico = Number(
      novoValor.replace(',', '.')
    )

    if (
      !Number.isFinite(valorNumerico) ||
      valorNumerico < 0
    ) {
      return
    }

    setItensOrcamento((listaAtual) =>
      listaAtual.map((item) => {
        if (item.id !== id) {
          return item
        }

        const valorTotal =
          item.quantidade * valorNumerico

        return {
          ...item,
          valorUnitario: valorNumerico,
          valorTotal,
        }
      })
    )
  }

  function calcularSubtotal() {
    return itensOrcamento.reduce(
      (total, item) => total + item.valorTotal,
      0
    )
  }

  function calcularDesconto() {
    const descontoNumerico = Number(
      desconto.replace(',', '.')
    )

    if (
      !Number.isFinite(descontoNumerico) ||
      descontoNumerico < 0
    ) {
      return 0
    }

    return descontoNumerico
  }

  function calcularTotal() {
    const subtotal = calcularSubtotal()
    const descontoCalculado = calcularDesconto()

    return Math.max(
      subtotal - descontoCalculado,
      0
    )
  }

  function formatarMoeda(valor: number) {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  async function salvarOrcamento() {
    setMensagem('')

    if (!clienteId) {
      setMensagem(
        'Selecione um cliente antes de salvar o orçamento.'
      )
      return
    }

    if (itensOrcamento.length === 0) {
      setMensagem(
        'Adicione pelo menos um item ao orçamento.'
      )
      return
    }

    const descontoNumerico = calcularDesconto()
    const subtotal = calcularSubtotal()

    if (descontoNumerico > subtotal) {
      setMensagem(
        'O desconto não pode ser maior que o subtotal.'
      )
      return
    }

    setSalvando(true)

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        setMensagem(
          'Não foi possível obter a sessão do usuário.'
        )
        return
      }

      const corpo = {
        cliente_id: clienteId,

        itens: itensOrcamento.map((item) => ({
          item_id: item.itemId,
          quantidade: item.quantidade,
          valor_unitario: item.valorUnitario,
        })),

        desconto: descontoNumerico,
        validade: validade || null,
        observacoes: observacoes.trim() || null,
      }

      console.log('Enviando orçamento:', corpo)

      const resposta = await fetch(
        'http://127.0.0.1:8000/orcamentos',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(corpo),
        }
      )

      const dados = await resposta.json()

      console.log('Resposta do backend:', dados)

      // TRATAMENTO DO LIMITE MENSAL
      if (!resposta.ok) {
        if (
          resposta.status === 403 &&
          dados.detail ===
            'Limite mensal de orçamentos atingido para o plano atual.'
        ) {
          setMensagem(
            'Você atingiu o limite mensal de 10 orçamentos do plano gratuito. Para continuar criando orçamentos, consulte as opções de planos disponíveis.'
          )
        } else {
          setMensagem(
            `Erro ao salvar orçamento: ${
              dados.detail ?? 'Erro desconhecido.'
            }`
          )
        }

        return
      }

      const numeroFormatado =
        dados.orcamento?.numero_formatado

      setMensagem(
        numeroFormatado
          ? `Orçamento ${numeroFormatado} criado com sucesso!`
          : 'Orçamento criado com sucesso!'
      )

      setItensOrcamento([])
      setClienteId('')
      setDesconto('0')
      setValidade('')
      setObservacoes('')
      setItemSelecionadoId('')
      setQuantidade('1')
    } catch (erro) {
      console.error(erro)

      setMensagem(
        'Não foi possível conectar ao backend.'
      )
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <main style={estilos.pagina}>
        <div style={estilos.cartao}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'grid',
              placeItems: 'center',
              fontSize: '22px',
              marginBottom: '18px',
            }}
          >
            …
          </div>
          <h1 style={{ fontSize: '22px', margin: 0 }}>
            Preparando seu orçamento
          </h1>
          <p style={{ color: '#64748b', marginTop: '8px' }}>
            Carregando clientes e itens cadastrados...
          </p>
        </div>
      </main>
    )
  }

  const clienteSelecionado = clientes.find(
    (cliente) => cliente.id === clienteId
  )

  return (
    <main style={estilos.pagina}>
      <style>{`
        .orcamento-campo:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.10);
          outline: none;
        }
        .orcamento-botao:hover {
          filter: brightness(0.96);
        }
        .orcamento-remover:hover {
          background: #fff1f2 !important;
        }
        .orcamento-linha {
          display: grid;
          grid-template-columns: minmax(180px, 2fr) minmax(80px, .7fr) minmax(120px, 1fr) minmax(120px, 1fr) auto;
          gap: 12px;
          align-items: center;
        }
        .orcamento-adicionar {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(110px, .7fr) auto;
          gap: 12px;
          align-items: center;
        }
        @media (max-width: 760px) {
          .orcamento-linha {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .orcamento-linha > div:first-child {
            grid-column: 1 / -1;
          }
          .orcamento-adicionar {
            grid-template-columns: minmax(0, 1fr);
          }
          .orcamento-adicionar button {
            width: 100%;
          }
        }
        @media (max-width: 480px) {
          .orcamento-linha {
            grid-template-columns: minmax(0, 1fr);
          }
          .orcamento-linha > div:first-child {
            grid-column: auto;
          }
        }
      `}</style>

      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          marginBottom: '28px',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#2563eb',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#2563eb',
              }}
            />
            Orçamentos
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(28px, 4vw, 36px)',
              lineHeight: 1.2,
              letterSpacing: '-1px',
              fontWeight: 800,
              color: '#172033',
            }}
          >
            Novo orçamento
          </h1>

          <p
            style={{
              margin: '10px 0 0',
              color: '#64748b',
              fontSize: '14px',
              lineHeight: 1.6,
            }}
          >
            Selecione o cliente, adicione os itens e prepare sua proposta comercial.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #dbeafe',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: '18px' }}>＋</span>
          Criar orçamento
        </div>
      </header>

      {mensagem && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '22px',
            padding: '15px 18px',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            background: '#eff6ff',
            color: '#1e40af',
            fontSize: '14px',
            lineHeight: 1.6,
            overflowWrap: 'anywhere',
          }}
        >
          <span style={{ fontSize: '17px' }}>ⓘ</span>
          <span>{mensagem}</span>
        </div>
      )}

      {/* TESTE DE AUTENTICAÇÃO */}
      <section
        style={{
          ...estilos.cartao,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          marginBottom: '22px',
          background: '#f8fafc',
        }}
      >
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              borderRadius: '12px',
              background: '#e0e7ff',
              color: '#3730a3',
              fontSize: '20px',
            }}
          >
            ↔
          </div>

          <div>
            <h2 style={estilos.tituloSecao}>
              Teste de conexão
            </h2>
            <p style={estilos.descricaoSecao}>
              Verifique se o FastAPI consegue identificar o usuário conectado.
            </p>
          </div>
        </div>

        <button
          className="orcamento-botao"
          onClick={testarAutenticacao}
          style={estilos.botaoSecundario}
        >
          Testar autenticação
        </button>
      </section>

      <div style={{ display: 'grid', gap: '22px' }}>
        {/* CLIENTE */}
        <section style={estilos.cartao}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              marginBottom: '22px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '11px',
                background: '#eff6ff',
                color: '#2563eb',
                fontWeight: 800,
              }}
            >
              01
            </div>

            <div>
              <h2 style={estilos.tituloSecao}>Cliente</h2>
              <p style={estilos.descricaoSecao}>
                Escolha para quem este orçamento será preparado.
              </p>
            </div>
          </div>

          <label style={estilos.rotulo}>
            Cliente
          </label>

          <select
            className="orcamento-campo"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            style={estilos.campo}
          >
            <option value="">Selecione um cliente</option>

            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </option>
            ))}
          </select>

          {clienteSelecionado && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '14px',
                padding: '12px 14px',
                background: '#f0fdf4',
                border: '1px solid #dcfce7',
                borderRadius: '10px',
                color: '#166534',
                fontSize: '13px',
              }}
            >
              <span>✓</span>
              Cliente selecionado:{' '}
              <strong>{clienteSelecionado.nome}</strong>
            </div>
          )}
        </section>

        {/* ADICIONAR ITEM */}
        <section style={estilos.cartao}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              marginBottom: '22px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '11px',
                background: '#eff6ff',
                color: '#2563eb',
                fontWeight: 800,
              }}
            >
              02
            </div>

            <div>
              <h2 style={estilos.tituloSecao}>
                Adicionar itens
              </h2>
              <p style={estilos.descricaoSecao}>
                Selecione um produto ou serviço e informe a quantidade.
              </p>
            </div>
          </div>

          <div className="orcamento-adicionar">
            <div>
              <label style={estilos.rotulo}>Produto ou serviço</label>

              <select
                className="orcamento-campo"
                value={itemSelecionadoId}
                onChange={(e) =>
                  setItemSelecionadoId(e.target.value)
                }
                style={estilos.campo}
              >
                <option value="">Selecione um item</option>

                {itens.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} —{' '}
                    {formatarMoeda(Number(item.valor))}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={estilos.rotulo}>Quantidade</label>

              <input
                className="orcamento-campo"
                type="text"
                inputMode="decimal"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="Quantidade"
                style={estilos.campo}
              />
            </div>

            <button
              className="orcamento-botao"
              onClick={adicionarItem}
              style={{
                ...estilos.botaoPrimario,
                alignSelf: 'end',
                minHeight: '44px',
              }}
            >
              + Adicionar
            </button>
          </div>
        </section>

        {/* ITENS DO ORÇAMENTO */}
        <section style={estilos.cartao}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '20px',
            }}
          >
            <div>
              <h2 style={estilos.tituloSecao}>
                Itens do orçamento
              </h2>
              <p style={estilos.descricaoSecao}>
                Confira os valores e ajuste as quantidades.
              </p>
            </div>

            <span
              style={{
                padding: '7px 12px',
                borderRadius: '20px',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {itensOrcamento.length}{' '}
              {itensOrcamento.length === 1 ? 'item' : 'itens'}
            </span>
          </div>

          {itensOrcamento.length === 0 ? (
            <div
              style={{
                padding: '36px 20px',
                border: '1px dashed #cbd5e1',
                borderRadius: '12px',
                background: '#f8fafc',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 14px',
                  borderRadius: '14px',
                  background: '#e2e8f0',
                  color: '#64748b',
                  fontSize: '23px',
                }}
              >
                ＋
              </div>

              <p
                style={{
                  margin: 0,
                  fontWeight: 700,
                  color: '#334155',
                }}
              >
                Nenhum item adicionado
              </p>

              <p
                style={{
                  margin: '7px 0 0',
                  color: '#64748b',
                  fontSize: '13px',
                }}
              >
                Selecione um produto ou serviço acima para começar.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {itensOrcamento.map((item, indice) => (
                <div
                  key={item.id}
                  style={{
                    padding: '18px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    background: '#ffffff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      marginBottom: '18px',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '10px',
                        background: '#eff6ff',
                        color: '#2563eb',
                        fontSize: '13px',
                        fontWeight: 800,
                      }}
                    >
                      {String(indice + 1).padStart(2, '0')}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong
                        style={{
                          display: 'block',
                          color: '#172033',
                          fontSize: '15px',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {item.nome}
                      </strong>

                      {item.descricao && (
                        <p
                          style={{
                            margin: '5px 0 0',
                            color: '#64748b',
                            fontSize: '13px',
                            lineHeight: 1.5,
                          }}
                        >
                          {item.descricao}
                        </p>
                      )}
                    </div>

                    <button
                      className="orcamento-remover"
                      onClick={() => removerItem(item.id)}
                      style={{
                        border: '1px solid #fecdd3',
                        borderRadius: '9px',
                        background: '#fff1f2',
                        color: '#be123c',
                        padding: '8px 11px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Remover
                    </button>
                  </div>

                  <div className="orcamento-linha">
                    <div>
                      <label style={estilos.rotulo}>Produto/serviço</label>
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#64748b',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {item.nome}
                      </div>
                    </div>

                    <div>
                      <label style={estilos.rotulo}>Quantidade</label>
                      <input
                        className="orcamento-campo"
                        type="text"
                        inputMode="decimal"
                        value={item.quantidade}
                        onChange={(e) =>
                          atualizarQuantidade(
                            item.id,
                            e.target.value
                          )
                        }
                        title="Quantidade"
                        style={{
                          ...estilos.campo,
                          padding: '10px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={estilos.rotulo}>Valor unitário</label>
                      <input
                        className="orcamento-campo"
                        type="text"
                        inputMode="decimal"
                        value={item.valorUnitario}
                        onChange={(e) =>
                          atualizarValorUnitario(
                            item.id,
                            e.target.value
                          )
                        }
                        title="Valor unitário"
                        style={{
                          ...estilos.campo,
                          padding: '10px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={estilos.rotulo}>Total do item</label>
                      <strong
                        style={{
                          display: 'block',
                          color: '#1d4ed8',
                          fontSize: '15px',
                          padding: '10px 0',
                        }}
                      >
                        {formatarMoeda(item.valorTotal)}
                      </strong>
                    </div>

                    <div />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* VALORES */}
        <section style={estilos.cartao}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              marginBottom: '22px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '11px',
                background: '#eff6ff',
                color: '#2563eb',
                fontWeight: 800,
              }}
            >
              03
            </div>

            <div>
              <h2 style={estilos.tituloSecao}>
                Valores do orçamento
              </h2>
              <p style={estilos.descricaoSecao}>
                Confira o subtotal e informe o desconto, se houver.
              </p>
            </div>
          </div>

          <div style={estilos.grade}>
            <div>
              <label style={estilos.rotulo}>Desconto em reais (R$)</label>

              <input
                className="orcamento-campo"
                type="text"
                inputMode="decimal"
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                placeholder="0,00"
                style={estilos.campo}
              />

              <p
                style={{
                  margin: '8px 0 0',
                  color: '#64748b',
                  fontSize: '12px',
                }}
              >
                Informe o valor total do desconto.
              </p>
            </div>

            <div
              style={{
                padding: '18px',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                background: '#f8fafc',
                display: 'grid',
                gap: '14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  color: '#64748b',
                  fontSize: '14px',
                }}
              >
                <span>Subtotal</span>
                <strong style={{ color: '#334155' }}>
                  {formatarMoeda(calcularSubtotal())}
                </strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  color: '#64748b',
                  fontSize: '14px',
                }}
              >
                <span>Desconto</span>
                <strong style={{ color: '#be123c' }}>
                  − {formatarMoeda(calcularDesconto())}
                </strong>
              </div>

              <div
                style={{
                  height: '1px',
                  background: '#e2e8f0',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <strong style={{ fontSize: '14px', color: '#172033' }}>
                  Total
                </strong>
                <strong
                  style={{
                    fontSize: 'clamp(22px, 3vw, 28px)',
                    color: '#1d4ed8',
                    letterSpacing: '-0.5px',
                  }}
                >
                  {formatarMoeda(calcularTotal())}
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* VALIDADE E OBSERVAÇÕES */}
        <section style={estilos.cartao}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              marginBottom: '22px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '11px',
                background: '#eff6ff',
                color: '#2563eb',
                fontWeight: 800,
              }}
            >
              04
            </div>

            <div>
              <h2 style={estilos.tituloSecao}>
                Informações adicionais
              </h2>
              <p style={estilos.descricaoSecao}>
                Defina a validade e acrescente observações, se necessário.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={estilos.rotulo}>
                Validade do orçamento
              </label>

              <input
                className="orcamento-campo"
                type="date"
                value={validade}
                onChange={(e) => setValidade(e.target.value)}
                style={{
                  ...estilos.campo,
                  maxWidth: '360px',
                }}
              />
            </div>

            <div>
              <label style={estilos.rotulo}>
                Observações
              </label>

              <textarea
                className="orcamento-campo"
                value={observacoes}
                onChange={(e) =>
                  setObservacoes(e.target.value)
                }
                rows={4}
                placeholder="Observações do orçamento..."
                style={{
                  ...estilos.campo,
                  resize: 'vertical',
                  lineHeight: 1.6,
                }}
              />
            </div>
          </div>
        </section>

        {/* RESUMO */}
        <section
          style={{
            borderRadius: '18px',
            padding: '26px',
            background: 'linear-gradient(135deg, #172554 0%, #1d4ed8 100%)',
            color: '#ffffff',
            boxShadow: '0 12px 30px rgba(37, 99, 235, 0.18)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '20px',
              flexWrap: 'wrap',
              marginBottom: '24px',
            }}
          >
            <div>
              <p
                style={{
                  margin: '0 0 8px',
                  color: '#bfdbfe',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                }}
              >
                Conferência final
              </p>

              <h2
                style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                }}
              >
                Resumo do orçamento
              </h2>

              <p
                style={{
                  margin: '8px 0 0',
                  color: '#dbeafe',
                  fontSize: '13px',
                  lineHeight: 1.6,
                }}
              >
                Revise os dados antes de salvar.
              </p>
            </div>

            <div
              style={{
                border: '1px solid rgba(255,255,255,0.22)',
                background: 'rgba(255,255,255,0.10)',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '13px',
                color: '#ffffff',
              }}
            >
              {itensOrcamento.length}{' '}
              {itensOrcamento.length === 1 ? 'item' : 'itens'}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.09)',
                border: '1px solid rgba(255,255,255,0.12)',
                minWidth: 0,
              }}
            >
              <p
                style={{
                  margin: '0 0 8px',
                  color: '#bfdbfe',
                  fontSize: '12px',
                }}
              >
                Cliente
              </p>
              <strong
                style={{
                  display: 'block',
                  fontSize: '14px',
                  overflowWrap: 'anywhere',
                }}
              >
                {clienteId
                  ? clientes.find(
                      (cliente) => cliente.id === clienteId
                    )?.nome
                  : 'Não selecionado'}
              </strong>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.09)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <p
                style={{
                  margin: '0 0 8px',
                  color: '#bfdbfe',
                  fontSize: '12px',
                }}
              >
                Quantidade de itens
              </p>
              <strong style={{ fontSize: '14px' }}>
                {itensOrcamento.length}
              </strong>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.09)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <p
                style={{
                  margin: '0 0 8px',
                  color: '#bfdbfe',
                  fontSize: '12px',
                }}
              >
                Total do orçamento
              </p>
              <strong
                style={{
                  fontSize: 'clamp(20px, 3vw, 25px)',
                  letterSpacing: '-0.5px',
                }}
              >
                {formatarMoeda(calcularTotal())}
              </strong>
            </div>
          </div>

          <button
            className="orcamento-botao"
            onClick={salvarOrcamento}
            disabled={salvando}
            style={{
              width: '100%',
              border: 'none',
              borderRadius: '11px',
              padding: '16px 22px',
              background: salvando ? '#bfdbfe' : '#ffffff',
              color: '#1d4ed8',
              fontSize: '15px',
              fontWeight: 800,
              cursor: salvando ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
            }}
          >
            {salvando
              ? 'Salvando orçamento...'
              : '✓  Salvar orçamento'}
          </button>

          <p
            style={{
              margin: '13px 0 0',
              textAlign: 'center',
              color: '#dbeafe',
              fontSize: '12px',
              lineHeight: 1.5,
            }}
          >
            Confira o cliente e os valores antes de confirmar.
          </p>
        </section>
      </div>
    </main>
  )
}
