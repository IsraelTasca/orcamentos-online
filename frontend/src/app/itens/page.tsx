
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Item = {
  id: string
  nome: string
  descricao: string | null
  codigo: string | null
  valor: number
  ativo: boolean
}

const estilos = {
  pagina: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px 56px',
    color: '#172033',
    boxSizing: 'border-box',
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

  descricao: {
    margin: '7px 0 0',
    color: '#64748b',
    fontSize: '14px',
    lineHeight: 1.6,
  } as React.CSSProperties,

  rotulo: {
    display: 'block',
    marginBottom: '8px',
    color: '#334155',
    fontSize: '13px',
    fontWeight: 600,
  } as React.CSSProperties,

  campo: {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    padding: '12px 14px',
    border: '1px solid #dbe3ef',
    borderRadius: '10px',
    background: '#ffffff',
    color: '#172033',
    fontSize: '14px',
    outlineColor: '#2563eb',
  } as React.CSSProperties,

  botaoPrimario: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '10px',
    background: '#2563eb',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  } as React.CSSProperties,

  botaoSecundario: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 15px',
    border: '1px solid #dbe3ef',
    borderRadius: '10px',
    background: '#ffffff',
    color: '#334155',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,
}

export default function ItensPage() {
  const [itens, setItens] = useState<Item[]>([])
  const [empresaId, setEmpresaId] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [codigo, setCodigo] = useState('')
  const [valor, setValor] = useState('')

  const [itemEditando, setItemEditando] =
    useState<string | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    inicializar()
  }, [])

  async function inicializar() {
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

    setEmpresaId(empresa.id)

    await carregarItens(empresa.id)

    setCarregando(false)
  }

  async function carregarItens(idEmpresa: string) {
    const {
      data,
      error,
    } = await supabase
      .from('itens')
      .select(
        'id, nome, descricao, codigo, valor, ativo'
      )
      .eq('empresa_id', idEmpresa)
      .order('nome', {
        ascending: true,
      })

    if (error) {
      console.error(error)

      setMensagem(
        `Erro ao carregar itens: ${error.message}`
      )

      return
    }

    setItens(data ?? [])
  }

  function limparFormulario() {
    setNome('')
    setDescricao('')
    setCodigo('')
    setValor('')
    setItemEditando(null)
  }

  function editarItem(item: Item) {
    setItemEditando(item.id)

    setNome(item.nome)
    setDescricao(item.descricao ?? '')
    setCodigo(item.codigo ?? '')
    setValor(
      Number(item.valor).toFixed(2)
    )

    setMensagem('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function salvarItem() {
    setMensagem('')

    if (!empresaId) {
      setMensagem('Empresa não encontrada.')
      return
    }

    if (!nome.trim()) {
      setMensagem('Informe o nome do item.')
      return
    }

    if (!valor.trim()) {
      setMensagem('Informe o valor do item.')
      return
    }

    const valorNumerico =
      Number(
        valor
          .replace(',', '.')
          .replace(/[^\d.-]/g, '')
      )

    if (
      !Number.isFinite(valorNumerico) ||
      valorNumerico < 0
    ) {
      setMensagem('Informe um valor válido.')
      return
    }

    setSalvando(true)

    const dadosItem = {
      nome: nome.trim(),
      descricao:
        descricao.trim() || null,
      codigo:
        codigo.trim() || null,
      valor: valorNumerico,
    }

    if (itemEditando) {
      const {
        error,
      } = await supabase
        .from('itens')
        .update(dadosItem)
        .eq('id', itemEditando)
        .eq('empresa_id', empresaId)

      if (error) {
        console.error(error)

        setMensagem(
          `Erro ao atualizar item: ${error.message}`
        )

        setSalvando(false)
        return
      }

      setMensagem('Item atualizado com sucesso!')
    } else {
      const {
        error,
      } = await supabase
        .from('itens')
        .insert({
          empresa_id: empresaId,
          ...dadosItem,
          ativo: true,
        })

      if (error) {
        console.error(error)

        setMensagem(
          `Erro ao cadastrar item: ${error.message}`
        )

        setSalvando(false)
        return
      }

      setMensagem('Item cadastrado com sucesso!')
    }

    limparFormulario()

    await carregarItens(empresaId)

    setSalvando(false)
  }

  async function alternarStatus(item: Item) {
    if (!empresaId) {
      return
    }

    const novoStatus = !item.ativo

    const {
      error,
    } = await supabase
      .from('itens')
      .update({
        ativo: novoStatus,
      })
      .eq('id', item.id)
      .eq('empresa_id', empresaId)

    if (error) {
      console.error(error)

      setMensagem(
        `Erro ao alterar status: ${error.message}`
      )

      return
    }

    setMensagem(
      novoStatus
        ? 'Item ativado.'
        : 'Item desativado.'
    )

    await carregarItens(empresaId)
  }

  if (carregando) {
    return (
      <main style={estilos.pagina}>
        <div style={estilos.cartao}>
          <div
            style={{
              width: '44px',
              height: '44px',
              display: 'grid',
              placeItems: 'center',
              marginBottom: '18px',
              borderRadius: '12px',
              background: '#eff6ff',
              color: '#2563eb',
              fontSize: '22px',
            }}
          >
            …
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '22px',
              color: '#172033',
            }}
          >
            Carregando itens
          </h1>

          <p style={estilos.descricao}>
            Aguarde enquanto buscamos os produtos e serviços cadastrados.
          </p>
        </div>
      </main>
    )
  }

  const itensAtivos = itens.filter(
    (item) => item.ativo
  ).length

  const formatarMoeda = (valor: number) =>
    Number(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })

  return (
    <main style={estilos.pagina}>
      <style>{`
        .itens-campo:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.10);
          outline: none;
        }

        .itens-botao {
          transition: background 0.2s ease, filter 0.2s ease;
        }

        .itens-botao:hover {
          filter: brightness(0.96);
        }

        .itens-lista {
          display: grid;
          gap: 14px;
          margin-top: 20px;
        }

        .itens-grade-formulario {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          margin-top: 24px;
        }

        .itens-coluna-completa {
          grid-column: 1 / -1;
        }

        .itens-cartao {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .itens-cartao:hover {
          border-color: #cbd5e1 !important;
        }

        @media (max-width: 600px) {
          .itens-grade-formulario {
            grid-template-columns: minmax(0, 1fr);
          }

          .itens-coluna-completa {
            grid-column: auto;
          }

          .itens-pagina {
            padding: 24px 16px 40px !important;
          }

          .itens-cartao-principal {
            padding: 18px !important;
          }

          .itens-acoes {
            width: 100%;
          }

          .itens-acoes button {
            flex: 1;
          }
        }
      `}</style>

      {/* CABEÇALHO */}
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
              marginBottom: '10px',
              color: '#2563eb',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
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
            Catálogo
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
            Itens
          </h1>

          <p style={estilos.descricao}>
            Cadastre os produtos e serviços que sua empresa oferece.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            border: '1px solid #dbeafe',
            borderRadius: '12px',
            background: '#eff6ff',
            color: '#1d4ed8',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: '18px' }}>▦</span>
          Produtos e serviços
        </div>
      </header>

      {/* MENSAGEM */}
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

      {/* INDICADORES */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            ...estilos.cartao,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              borderRadius: '13px',
              background: '#eff6ff',
              color: '#2563eb',
              fontSize: '23px',
            }}
          >
            ▦
          </div>

          <div>
            <p
              style={{
                margin: 0,
                color: '#64748b',
                fontSize: '13px',
              }}
            >
              Total de itens
            </p>

            <strong
              style={{
                display: 'block',
                marginTop: '5px',
                color: '#172033',
                fontSize: '27px',
                lineHeight: 1.2,
              }}
            >
              {itens.length}
            </strong>
          </div>
        </div>

        <div
          style={{
            ...estilos.cartao,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              borderRadius: '13px',
              background: '#f0fdf4',
              color: '#15803d',
              fontSize: '23px',
            }}
          >
            ✓
          </div>

          <div>
            <p
              style={{
                margin: 0,
                color: '#64748b',
                fontSize: '13px',
              }}
            >
              Itens ativos
            </p>

            <strong
              style={{
                display: 'block',
                marginTop: '5px',
                color: '#172033',
                fontSize: '27px',
                lineHeight: 1.2,
              }}
            >
              {itensAtivos}
            </strong>
          </div>
        </div>
      </section>

      {/* FORMULÁRIO */}
      <section
        className="itens-cartao-principal"
        style={{
          ...estilos.cartao,
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              borderRadius: '12px',
              background: itemEditando ? '#fff7ed' : '#eff6ff',
              color: itemEditando ? '#c2410c' : '#2563eb',
              fontSize: '21px',
            }}
          >
            {itemEditando ? '✎' : '+'}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={estilos.tituloSecao}>
              {itemEditando ? 'Editar item' : 'Novo item'}
            </h2>

            <p style={estilos.descricao}>
              {itemEditando
                ? 'Atualize as informações do produto ou serviço selecionado.'
                : 'Preencha os dados para cadastrar um produto ou serviço.'}
            </p>
          </div>
        </div>

        <div className="itens-grade-formulario">
          <div>
            <label style={estilos.rotulo}>
              Nome do item *
            </label>

            <input
              className="itens-campo"
              type="text"
              placeholder="Nome do produto ou serviço"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={estilos.campo}
            />
          </div>

          <div>
            <label style={estilos.rotulo}>
              Código
            </label>

            <input
              className="itens-campo"
              type="text"
              placeholder="Código ou referência"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              style={estilos.campo}
            />
          </div>

          <div className="itens-coluna-completa">
            <label style={estilos.rotulo}>
              Descrição
            </label>

            <textarea
              className="itens-campo"
              placeholder="Descreva o produto ou serviço..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              style={{
                ...estilos.campo,
                resize: 'vertical',
                lineHeight: 1.6,
              }}
            />
          </div>

          <div>
            <label style={estilos.rotulo}>
              Valor (R$) *
            </label>

            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '14px',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  fontSize: '14px',
                  fontWeight: 600,
                  pointerEvents: 'none',
                }}
              >
                R$
              </span>

              <input
                className="itens-campo"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                style={{
                  ...estilos.campo,
                  paddingLeft: '42px',
                }}
              />
            </div>

            <p
              style={{
                margin: '7px 0 0',
                color: '#64748b',
                fontSize: '12px',
              }}
            >
              Informe o preço do item.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <button
            className="itens-botao"
            onClick={salvarItem}
            disabled={salvando}
            style={{
              ...estilos.botaoPrimario,
              opacity: salvando ? 0.7 : 1,
              cursor: salvando ? 'not-allowed' : 'pointer',
            }}
          >
            {salvando
              ? 'Salvando...'
              : itemEditando
                ? '✓ Salvar alterações'
                : '+ Cadastrar item'}
          </button>

          {itemEditando && (
            <button
              className="itens-botao"
              onClick={limparFormulario}
              disabled={salvando}
              style={{
                ...estilos.botaoSecundario,
                opacity: salvando ? 0.7 : 1,
                cursor: salvando ? 'not-allowed' : 'pointer',
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </section>

      {/* LISTA DE ITENS */}
      <section>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2
              style={{
                ...estilos.tituloSecao,
                fontSize: '21px',
              }}
            >
              Itens cadastrados
            </h2>

            <p style={estilos.descricao}>
              Consulte os produtos e serviços e gerencie sua disponibilidade.
            </p>
          </div>

          <span
            style={{
              padding: '8px 13px',
              borderRadius: '20px',
              background: '#f1f5f9',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {itens.length}{' '}
            {itens.length === 1 ? 'cadastro' : 'cadastros'}
          </span>
        </div>

        {itens.length === 0 ? (
          <div
            style={{
              ...estilos.cartao,
              marginTop: '20px',
              padding: '44px 24px',
              textAlign: 'center',
              background: '#f8fafc',
              borderStyle: 'dashed',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
                borderRadius: '15px',
                background: '#e2e8f0',
                color: '#64748b',
                fontSize: '25px',
              }}
            >
              ▦
            </div>

            <h3
              style={{
                margin: 0,
                color: '#334155',
                fontSize: '16px',
              }}
            >
              Nenhum item cadastrado ainda
            </h3>

            <p
              style={{
                margin: '8px 0 0',
                color: '#64748b',
                fontSize: '13px',
                lineHeight: 1.6,
              }}
            >
              Utilize o formulário acima para cadastrar seu primeiro produto ou serviço.
            </p>
          </div>
        ) : (
          <div className="itens-lista">
            {itens.map((item) => (
              <article
                key={item.id}
                className="itens-cartao"
                style={{
                  ...estilos.cartao,
                  padding: '22px',
                  opacity: item.ativo ? 1 : 0.72,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '20px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '14px',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '13px',
                        background: item.ativo
                          ? '#eff6ff'
                          : '#f1f5f9',
                        color: item.ativo
                          ? '#2563eb'
                          : '#64748b',
                        fontSize: '21px',
                      }}
                    >
                      ▦
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          flexWrap: 'wrap',
                          marginBottom: '10px',
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            color: '#172033',
                            fontSize: '16px',
                            fontWeight: 750,
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {item.nome}
                        </h3>

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 9px',
                            borderRadius: '20px',
                            background: item.ativo
                              ? '#f0fdf4'
                              : '#f1f5f9',
                            color: item.ativo
                              ? '#15803d'
                              : '#64748b',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: item.ativo
                                ? '#16a34a'
                                : '#94a3b8',
                            }}
                          />
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      {item.descricao && (
                        <p
                          style={{
                            margin: '0 0 12px',
                            color: '#64748b',
                            fontSize: '13px',
                            lineHeight: 1.6,
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {item.descricao}
                        </p>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                          color: '#64748b',
                          fontSize: '12px',
                        }}
                      >
                        {item.codigo && (
                          <span
                            style={{
                              padding: '6px 9px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '7px',
                              background: '#f8fafc',
                            }}
                          >
                            Código: {item.codigo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '14px',
                    }}
                  >
                    <div style={{ textAlign: 'right' }}>
                      <p
                        style={{
                          margin: '0 0 5px',
                          color: '#64748b',
                          fontSize: '12px',
                        }}
                      >
                        Valor
                      </p>

                      <strong
                        style={{
                          color: '#1d4ed8',
                          fontSize: '23px',
                          letterSpacing: '-0.5px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatarMoeda(Number(item.valor))}
                      </strong>
                    </div>

                    <div
                      className="itens-acoes"
                      style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        className="itens-botao"
                        onClick={() => editarItem(item)}
                        style={{
                          ...estilos.botaoSecundario,
                          padding: '9px 13px',
                        }}
                      >
                        ✎ Editar
                      </button>

                      <button
                        className="itens-botao"
                        onClick={() => alternarStatus(item)}
                        style={{
                          padding: '9px 13px',
                          border: `1px solid ${
                            item.ativo ? '#fecaca' : '#bbf7d0'
                          }`,
                          borderRadius: '10px',
                          background: item.ativo
                            ? '#fff1f2'
                            : '#f0fdf4',
                          color: item.ativo
                            ? '#be123c'
                            : '#15803d',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {item.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
