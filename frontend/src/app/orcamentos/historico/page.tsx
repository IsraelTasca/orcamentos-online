
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

type Cliente = {
  id: string
  nome: string
}

type Orcamento = {
  id: string
  numero: number
  status: string
  total: number
  created_at: string
  cliente_id: string
}

type OrcamentoComCliente = Orcamento & {
  cliente_nome: string
}

export default function HistoricoOrcamentosPage() {
  const router = useRouter()

  const [orcamentos, setOrcamentos] = useState<OrcamentoComCliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  useEffect(() => {
    carregarOrcamentos()
  }, [])

  async function carregarOrcamentos() {
    setCarregando(true)
    setMensagem('')

    try {
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
        setMensagem('Não foi possível encontrar a empresa cadastrada.')
        setCarregando(false)
        return
      }

      const {
        data: dadosOrcamentos,
        error: orcamentosError,
      } = await supabase
        .from('orcamentos')
        .select(`
          id,
          numero,
          status,
          total,
          created_at,
          cliente_id
        `)
        .eq('empresa_id', empresa.id)
        .order('created_at', {
          ascending: false,
        })

      if (orcamentosError) {
        console.error(orcamentosError)
        setMensagem(`Erro ao carregar orçamentos: ${orcamentosError.message}`)
        setCarregando(false)
        return
      }

      const listaOrcamentos = (dadosOrcamentos as Orcamento[]) ?? []

      const {
        data: dadosClientes,
        error: clientesError,
      } = await supabase
        .from('clientes')
        .select(`
          id,
          nome
        `)
        .eq('empresa_id', empresa.id)

      if (clientesError) {
        console.error(clientesError)
        setMensagem(`Erro ao carregar clientes: ${clientesError.message}`)
        setCarregando(false)
        return
      }

      const listaClientes = (dadosClientes as Cliente[]) ?? []
      const clientesPorId = new Map<string, string>()

      listaClientes.forEach((cliente) => {
        clientesPorId.set(cliente.id, cliente.nome)
      })

      const orcamentosComCliente = listaOrcamentos.map((orcamento) => ({
        ...orcamento,
        cliente_nome:
          clientesPorId.get(orcamento.cliente_id) ?? 'Cliente não encontrado',
      }))

      setOrcamentos(orcamentosComCliente)
    } catch (erro) {
      console.error(erro)
      setMensagem('Ocorreu um erro ao carregar os orçamentos.')
    } finally {
      setCarregando(false)
    }
  }

  function formatarMoeda(valor: number) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function formatarData(data: string) {
    if (!data) return '—'

    const dataObjeto = new Date(data)

    if (Number.isNaN(dataObjeto.getTime())) return '—'

    return dataObjeto.toLocaleDateString('pt-BR')
  }

  function formatarStatus(status: string) {
    const statusFormatados: Record<string, string> = {
      rascunho: 'Rascunho',
      enviado: 'Enviado',
      aprovado: 'Aprovado',
      recusado: 'Recusado',
      expirado: 'Expirado',
    }

    return statusFormatados[status] ?? status
  }

  function corStatus(status: string) {
    const cores: Record<string, { fundo: string; texto: string; ponto: string }> = {
      rascunho: {
        fundo: '#f1f5f9',
        texto: '#475569',
        ponto: '#64748b',
      },
      enviado: {
        fundo: '#dbeafe',
        texto: '#1d4ed8',
        ponto: '#3b82f6',
      },
      aprovado: {
        fundo: '#dcfce7',
        texto: '#166534',
        ponto: '#22c55e',
      },
      recusado: {
        fundo: '#fee2e2',
        texto: '#b91c1c',
        ponto: '#ef4444',
      },
      expirado: {
        fundo: '#fef3c7',
        texto: '#92400e',
        ponto: '#f59e0b',
      },
    }

    return (
      cores[status] ?? {
        fundo: '#f1f5f9',
        texto: '#475569',
        ponto: '#64748b',
      }
    )
  }

  function visualizarOrcamento(id: string) {
    router.push(`/orcamentos/${id}`)
  }

  const orcamentosFiltrados = orcamentos.filter((orcamento) => {
    const termo = busca.trim().toLowerCase()

    const correspondeBusca =
      !termo ||
      orcamento.cliente_nome.toLowerCase().includes(termo) ||
      orcamento.numero.toString().includes(termo)

    const correspondeStatus =
      filtroStatus === 'todos' || orcamento.status === filtroStatus

    return correspondeBusca && correspondeStatus
  })

  const totalOrcamentos = orcamentos.length

  const totalAprovados = orcamentos.filter(
    (orcamento) => orcamento.status === 'aprovado',
  ).length

  const totalEnviados = orcamentos.filter(
    (orcamento) => orcamento.status === 'enviado',
  ).length

  const valorTotal = orcamentos.reduce(
    (soma, orcamento) => soma + Number(orcamento.total || 0),
    0,
  )

  const estilos = {
    pagina: {
      minHeight: '100vh',
      background: '#f5f7fb',
      padding: '32px 24px 48px',
      color: '#172033',
    } as React.CSSProperties,

    conteudo: {
      maxWidth: '1250px',
      margin: '0 auto',
    } as React.CSSProperties,

    cartao: {
      background: '#ffffff',
      border: '1px solid #e6eaf0',
      borderRadius: '16px',
      boxShadow: '0 4px 18px rgba(15, 23, 42, 0.035)',
    } as React.CSSProperties,

    etiqueta: {
      display: 'block',
      fontSize: '12px',
      fontWeight: 700,
      color: '#64748b',
      marginBottom: '8px',
    } as React.CSSProperties,

    campo: {
      width: '100%',
      minHeight: '44px',
      padding: '10px 13px',
      border: '1px solid #dbe2ea',
      borderRadius: '9px',
      background: '#ffffff',
      color: '#172033',
      fontSize: '14px',
      outline: 'none',
    } as React.CSSProperties,
  }

  if (carregando) {
    return (
      <main style={estilos.pagina}>
        <div style={estilos.conteudo}>
          <div
            style={{
              ...estilos.cartao,
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                border: '4px solid #dbeafe',
                borderTopColor: '#2563eb',
                borderRadius: '50%',
                margin: '0 auto 18px',
                animation: 'historicoGirar 0.8s linear infinite',
              }}
            />
            <h2 style={{ fontSize: '18px', margin: '0 0 8px' }}>
              Carregando histórico
            </h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
              Estamos buscando seus orçamentos...
            </p>
            <style>{`
              @keyframes historicoGirar {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={estilos.pagina}>
      <div style={estilos.conteudo}>
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
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#2563eb',
                }}
              />
              Gestão comercial
            </div>

            <h1
              style={{
                fontSize: 'clamp(26px, 4vw, 34px)',
                lineHeight: 1.2,
                letterSpacing: '-1px',
                fontWeight: 800,
                margin: '0 0 9px',
                color: '#172033',
              }}
            >
              Histórico de orçamentos
            </h1>

            <p
              style={{
                color: '#64748b',
                margin: 0,
                fontSize: '15px',
                lineHeight: 1.6,
              }}
            >
              Consulte e acompanhe todos os orçamentos da sua empresa.
            </p>
          </div>

          <button
            onClick={() => router.push('/orcamentos')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '9px',
              padding: '12px 18px',
              minHeight: '44px',
              border: 'none',
              borderRadius: '10px',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.18)',
            }}
          >
            <span style={{ fontSize: '19px', lineHeight: 1 }}>+</span>
            Novo orçamento
          </button>
        </header>

        {mensagem && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '15px 17px',
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#991b1b',
              borderRadius: '12px',
              marginBottom: '22px',
              fontSize: '14px',
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontSize: '18px' }}>!</span>
            <div style={{ flex: 1 }}>{mensagem}</div>
            <button
              onClick={carregarOrcamentos}
              style={{
                border: '1px solid #fecaca',
                borderRadius: '7px',
                background: '#ffffff',
                color: '#991b1b',
                padding: '7px 10px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px',
            marginBottom: '25px',
          }}
        >
          <div style={{ ...estilos.cartao, padding: '21px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div>
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                    margin: '0 0 12px',
                  }}
                >
                  Total de orçamentos
                </p>
                <p
                  style={{
                    color: '#172033',
                    fontSize: '29px',
                    fontWeight: 800,
                    letterSpacing: '-1px',
                    margin: 0,
                  }}
                >
                  {totalOrcamentos}
                </p>
              </div>
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  fontSize: '22px',
                }}
              >
                ▤
              </div>
            </div>
            <p style={{ margin: '13px 0 0', color: '#94a3b8', fontSize: '12px' }}>
              Orçamentos cadastrados
            </p>
          </div>

          <div style={{ ...estilos.cartao, padding: '21px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div>
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                    margin: '0 0 12px',
                  }}
                >
                  Aprovados
                </p>
                <p
                  style={{
                    color: '#166534',
                    fontSize: '29px',
                    fontWeight: 800,
                    letterSpacing: '-1px',
                    margin: 0,
                  }}
                >
                  {totalAprovados}
                </p>
              </div>
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: '#dcfce7',
                  color: '#15803d',
                  fontSize: '23px',
                }}
              >
                ✓
              </div>
            </div>
            <p style={{ margin: '13px 0 0', color: '#94a3b8', fontSize: '12px' }}>
              Negócios aprovados
            </p>
          </div>

          <div style={{ ...estilos.cartao, padding: '21px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div>
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                    margin: '0 0 12px',
                  }}
                >
                  Enviados
                </p>
                <p
                  style={{
                    color: '#1d4ed8',
                    fontSize: '29px',
                    fontWeight: 800,
                    letterSpacing: '-1px',
                    margin: 0,
                  }}
                >
                  {totalEnviados}
                </p>
              </div>
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: '#dbeafe',
                  color: '#2563eb',
                  fontSize: '22px',
                }}
              >
                ↗
              </div>
            </div>
            <p style={{ margin: '13px 0 0', color: '#94a3b8', fontSize: '12px' }}>
              Aguardando resposta
            </p>
          </div>

          <div style={{ ...estilos.cartao, padding: '21px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div>
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                    margin: '0 0 12px',
                  }}
                >
                  Valor total
                </p>
                <p
                  style={{
                    color: '#172033',
                    fontSize: 'clamp(21px, 2vw, 27px)',
                    fontWeight: 800,
                    letterSpacing: '-0.7px',
                    margin: 0,
                  }}
                >
                  {formatarMoeda(valorTotal)}
                </p>
              </div>
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: '#ede9fe',
                  color: '#6d28d9',
                  fontSize: '22px',
                }}
              >
                R$
              </div>
            </div>
            <p style={{ margin: '13px 0 0', color: '#94a3b8', fontSize: '12px' }}>
              Soma dos valores cadastrados
            </p>
          </div>
        </section>

        <section style={{ ...estilos.cartao, overflow: 'hidden' }}>
          <div
            style={{
              padding: '23px 24px',
              borderBottom: '1px solid #edf0f5',
            }}
          >
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 800,
                margin: '0 0 6px',
                color: '#172033',
              }}
            >
              Seus orçamentos
            </h2>
            <p
              style={{
                margin: 0,
                color: '#64748b',
                fontSize: '13px',
              }}
            >
              Pesquise por número ou cliente e filtre pelo status.
            </p>
          </div>

          <div
            style={{
              padding: '20px 24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              background: '#fbfcfe',
              borderBottom: '1px solid #edf0f5',
            }}
          >
            <label>
              <span style={estilos.etiqueta}>Buscar orçamento</span>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '13px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    fontSize: '17px',
                  }}
                >
                  ⌕
                </span>
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Número ou nome do cliente..."
                  style={{
                    ...estilos.campo,
                    paddingLeft: '38px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </label>

            <label>
              <span style={estilos.etiqueta}>Filtrar por status</span>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                style={{
                  ...estilos.campo,
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                <option value="todos">Todos os status</option>
                <option value="rascunho">Rascunho</option>
                <option value="enviado">Enviado</option>
                <option value="aprovado">Aprovado</option>
                <option value="recusado">Recusado</option>
                <option value="expirado">Expirado</option>
              </select>
            </label>
          </div>

          {orcamentosFiltrados.length === 0 ? (
            <div
              style={{
                padding: '55px 24px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '20px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  fontSize: '30px',
                  margin: '0 auto 18px',
                }}
              >
                ▤
              </div>

              <h3
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#172033',
                  margin: '0 0 8px',
                }}
              >
                {orcamentos.length === 0
                  ? 'Nenhum orçamento encontrado'
                  : 'Nenhum resultado para sua busca'}
              </h3>

              <p
                style={{
                  maxWidth: '400px',
                  margin: '0 auto 20px',
                  color: '#64748b',
                  fontSize: '14px',
                  lineHeight: 1.6,
                }}
              >
                {orcamentos.length === 0
                  ? 'Quando você criar seus orçamentos, eles aparecerão nesta lista.'
                  : 'Tente alterar o texto da busca ou selecionar outro status.'}
              </p>

              {orcamentos.length === 0 ? (
                <button
                  onClick={() => router.push('/orcamentos')}
                  style={{
                    border: 'none',
                    borderRadius: '9px',
                    background: '#2563eb',
                    color: '#ffffff',
                    padding: '11px 17px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Criar primeiro orçamento
                </button>
              ) : (
                <button
                  onClick={() => {
                    setBusca('')
                    setFiltroStatus('todos')
                  }}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '9px',
                    background: '#ffffff',
                    color: '#334155',
                    padding: '10px 15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: '13px 24px',
                  borderBottom: '1px solid #edf0f5',
                  color: '#64748b',
                  fontSize: '12px',
                }}
              >
                Exibindo{' '}
                <strong style={{ color: '#334155' }}>
                  {orcamentosFiltrados.length}
                </strong>{' '}
                de{' '}
                <strong style={{ color: '#334155' }}>
                  {orcamentos.length}
                </strong>{' '}
                orçamento(s)
              </div>

              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table
                  style={{
                    width: '100%',
                    minWidth: '800px',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {[
                        { titulo: 'Número', alinhamento: 'left' },
                        { titulo: 'Cliente', alinhamento: 'left' },
                        { titulo: 'Data', alinhamento: 'left' },
                        { titulo: 'Status', alinhamento: 'left' },
                        { titulo: 'Valor total', alinhamento: 'right' },
                        { titulo: 'Ação', alinhamento: 'center' },
                      ].map((coluna) => (
                        <th
                          key={coluna.titulo}
                          style={{
                            padding: '15px 18px',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            borderBottom: '1px solid #e8edf3',
                            textAlign: coluna.alinhamento as
                              | 'left'
                              | 'right'
                              | 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {coluna.titulo}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {orcamentosFiltrados.map((orcamento) => {
                      const status = corStatus(orcamento.status)

                      return (
                        <tr
                          key={orcamento.id}
                          style={{
                            borderBottom: '1px solid #edf0f5',
                          }}
                        >
                          <td
                            style={{
                              padding: '17px 18px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '7px 9px',
                                borderRadius: '7px',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                fontSize: '12px',
                                fontWeight: 800,
                              }}
                            >
                              #{orcamento.numero.toString().padStart(6, '0')}
                            </span>
                          </td>

                          <td style={{ padding: '17px 18px' }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '11px',
                                minWidth: '180px',
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
                                  background: '#f1f5f9',
                                  color: '#475569',
                                  fontSize: '14px',
                                  fontWeight: 800,
                                }}
                              >
                                {(orcamento.cliente_nome || '?')
                                  .trim()
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <span
                                style={{
                                  color: '#334155',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                }}
                              >
                                {orcamento.cliente_nome}
                              </span>
                            </div>
                          </td>

                          <td
                            style={{
                              padding: '17px 18px',
                              color: '#64748b',
                              fontSize: '13px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatarData(orcamento.created_at)}
                          </td>

                          <td style={{ padding: '17px 18px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '7px',
                                padding: '7px 10px',
                                borderRadius: '20px',
                                background: status.fundo,
                                color: status.texto,
                                fontSize: '12px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: status.ponto,
                                }}
                              />
                              {formatarStatus(orcamento.status)}
                            </span>
                          </td>

                          <td
                            style={{
                              padding: '17px 18px',
                              textAlign: 'right',
                              color: '#172033',
                              fontSize: '13px',
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatarMoeda(Number(orcamento.total))}
                          </td>

                          <td
                            style={{
                              padding: '17px 18px',
                              textAlign: 'center',
                            }}
                          >
                            <button
                              onClick={() => visualizarOrcamento(orcamento.id)}
                              aria-label={`Visualizar orçamento ${orcamento.numero}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '7px',
                                padding: '9px 13px',
                                border: '1px solid #bfdbfe',
                                borderRadius: '8px',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span>↗</span>
                              Visualizar
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <footer
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '18px 3px 0',
            color: '#94a3b8',
            fontSize: '12px',
          }}
        >
          <span>Orçamentos Online · Histórico comercial</span>
          <span>Dados da sua empresa</span>
        </footer>
      </div>
    </main>
  )
}
