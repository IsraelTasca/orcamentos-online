
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Cliente = {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  cpf_cnpj: string | null
  endereco: string | null
  observacoes: string | null
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
    padding: '11px 16px',
    border: '1px solid #dbe3ef',
    borderRadius: '10px',
    background: '#ffffff',
    color: '#334155',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [empresaId, setEmpresaId] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [endereco, setEndereco] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [clienteEditando, setClienteEditando] =
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

    await carregarClientes(empresa.id)

    setCarregando(false)
  }

  async function carregarClientes(idEmpresa: string) {
    const {
      data,
      error,
    } = await supabase
      .from('clientes')
      .select(
        'id, nome, telefone, email, cpf_cnpj, endereco, observacoes, ativo'
      )
      .eq('empresa_id', idEmpresa)
      .order('nome', {
        ascending: true,
      })

    if (error) {
      console.error(error)

      setMensagem(
        `Erro ao carregar clientes: ${error.message}`
      )

      return
    }

    setClientes(data ?? [])
  }

  function limparFormulario() {
    setNome('')
    setTelefone('')
    setEmail('')
    setCpfCnpj('')
    setEndereco('')
    setObservacoes('')
    setClienteEditando(null)
  }

  function editarCliente(cliente: Cliente) {
    setClienteEditando(cliente.id)

    setNome(cliente.nome)
    setTelefone(cliente.telefone ?? '')
    setEmail(cliente.email ?? '')
    setCpfCnpj(cliente.cpf_cnpj ?? '')
    setEndereco(cliente.endereco ?? '')
    setObservacoes(cliente.observacoes ?? '')

    setMensagem('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function salvarCliente() {
    setMensagem('')

    if (!empresaId) {
      setMensagem('Empresa não encontrada.')
      return
    }

    if (!nome.trim()) {
      setMensagem('Informe o nome do cliente.')
      return
    }

    setSalvando(true)

    const dadosCliente = {
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      email: email.trim() || null,
      cpf_cnpj: cpfCnpj.trim() || null,
      endereco: endereco.trim() || null,
      observacoes: observacoes.trim() || null,
    }

    if (clienteEditando) {
      const {
        error,
      } = await supabase
        .from('clientes')
        .update(dadosCliente)
        .eq('id', clienteEditando)
        .eq('empresa_id', empresaId)

      if (error) {
        console.error(error)

        setMensagem(
          `Erro ao atualizar cliente: ${error.message}`
        )

        setSalvando(false)
        return
      }

      setMensagem('Cliente atualizado com sucesso!')
    } else {
      const {
        error,
      } = await supabase
        .from('clientes')
        .insert({
          empresa_id: empresaId,
          ...dadosCliente,
          ativo: true,
        })

      if (error) {
        console.error(error)

        setMensagem(
          `Erro ao cadastrar cliente: ${error.message}`
        )

        setSalvando(false)
        return
      }

      setMensagem('Cliente cadastrado com sucesso!')
    }

    limparFormulario()

    await carregarClientes(empresaId)

    setSalvando(false)
  }

  async function alternarStatus(cliente: Cliente) {
    if (!empresaId) {
      return
    }

    const novoStatus = !cliente.ativo

    const {
      error,
    } = await supabase
      .from('clientes')
      .update({
        ativo: novoStatus,
      })
      .eq('id', cliente.id)
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
        ? 'Cliente ativado.'
        : 'Cliente desativado.'
    )

    await carregarClientes(empresaId)
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
            Carregando clientes
          </h1>

          <p style={estilos.descricao}>
            Aguarde enquanto buscamos os clientes cadastrados.
          </p>
        </div>
      </main>
    )
  }

  const clientesAtivos = clientes.filter(
    (cliente) => cliente.ativo
  ).length

  return (
    <main style={estilos.pagina}>
      <style>{`
        .clientes-campo:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.10);
          outline: none;
        }

        .clientes-botao {
          transition: background 0.2s ease, filter 0.2s ease;
        }

        .clientes-botao:hover {
          filter: brightness(0.96);
        }

        .clientes-lista {
          display: grid;
          gap: 14px;
          margin-top: 20px;
        }

        .clientes-grade-formulario {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          margin-top: 24px;
        }

        .clientes-coluna-completa {
          grid-column: 1 / -1;
        }

        .clientes-cartao {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .clientes-cartao:hover {
          border-color: #cbd5e1 !important;
        }

        @media (max-width: 600px) {
          .clientes-grade-formulario {
            grid-template-columns: minmax(0, 1fr);
          }

          .clientes-coluna-completa {
            grid-column: auto;
          }

          .clientes-pagina {
            padding: 24px 16px 40px !important;
          }

          .clientes-cartao-principal {
            padding: 18px !important;
          }

          .clientes-acoes {
            width: 100%;
          }

          .clientes-acoes button {
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
            Cadastro e relacionamento
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
            Clientes
          </h1>

          <p style={estilos.descricao}>
            Cadastre e gerencie os clientes da sua empresa.
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
          <span style={{ fontSize: '18px' }}>♙</span>
          Gestão de clientes
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
            ♙
          </div>

          <div>
            <p
              style={{
                margin: 0,
                color: '#64748b',
                fontSize: '13px',
              }}
            >
              Total de clientes
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
              {clientes.length}
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
              Clientes ativos
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
              {clientesAtivos}
            </strong>
          </div>
        </div>
      </section>

      {/* FORMULÁRIO */}
      <section
        className="clientes-cartao-principal"
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
              background: clienteEditando ? '#fff7ed' : '#eff6ff',
              color: clienteEditando ? '#c2410c' : '#2563eb',
              fontSize: '21px',
            }}
          >
            {clienteEditando ? '✎' : '+'}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={estilos.tituloSecao}>
              {clienteEditando ? 'Editar cliente' : 'Novo cliente'}
            </h2>

            <p style={estilos.descricao}>
              {clienteEditando
                ? 'Atualize os dados do cliente selecionado.'
                : 'Preencha os dados para cadastrar um novo cliente.'}
            </p>
          </div>
        </div>

        <div className="clientes-grade-formulario">
          <div>
            <label style={estilos.rotulo}>
              Nome do cliente *
            </label>

            <input
              className="clientes-campo"
              type="text"
              placeholder="Digite o nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={estilos.campo}
            />
          </div>

          <div>
            <label style={estilos.rotulo}>
              WhatsApp / Telefone
            </label>

            <input
              className="clientes-campo"
              type="text"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              style={estilos.campo}
            />
          </div>

          <div>
            <label style={estilos.rotulo}>
              E-mail
            </label>

            <input
              className="clientes-campo"
              type="email"
              placeholder="cliente@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={estilos.campo}
            />
          </div>

          <div>
            <label style={estilos.rotulo}>
              CPF / CNPJ
            </label>

            <input
              className="clientes-campo"
              type="text"
              placeholder="Documento do cliente"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              style={estilos.campo}
            />
          </div>

          <div className="clientes-coluna-completa">
            <label style={estilos.rotulo}>
              Endereço
            </label>

            <input
              className="clientes-campo"
              type="text"
              placeholder="Rua, número, bairro, cidade..."
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              style={estilos.campo}
            />
          </div>

          <div className="clientes-coluna-completa">
            <label style={estilos.rotulo}>
              Observações
            </label>

            <textarea
              className="clientes-campo"
              placeholder="Informações adicionais sobre o cliente..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
              style={{
                ...estilos.campo,
                resize: 'vertical',
                lineHeight: 1.6,
              }}
            />
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
            className="clientes-botao"
            onClick={salvarCliente}
            disabled={salvando}
            style={{
              ...estilos.botaoPrimario,
              opacity: salvando ? 0.7 : 1,
              cursor: salvando ? 'not-allowed' : 'pointer',
            }}
          >
            {salvando
              ? 'Salvando...'
              : clienteEditando
                ? '✓ Salvar alterações'
                : '+ Cadastrar cliente'}
          </button>

          {clienteEditando && (
            <button
              className="clientes-botao"
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

      {/* LISTA DE CLIENTES */}
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
              Clientes cadastrados
            </h2>

            <p style={estilos.descricao}>
              Consulte os dados e gerencie a situação dos seus clientes.
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
            {clientes.length}{' '}
            {clientes.length === 1 ? 'cadastro' : 'cadastros'}
          </span>
        </div>

        {clientes.length === 0 ? (
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
              ♙
            </div>

            <h3
              style={{
                margin: 0,
                color: '#334155',
                fontSize: '16px',
              }}
            >
              Nenhum cliente cadastrado ainda
            </h3>

            <p
              style={{
                margin: '8px 0 0',
                color: '#64748b',
                fontSize: '13px',
                lineHeight: 1.6,
              }}
            >
              Utilize o formulário acima para cadastrar seu primeiro cliente.
            </p>
          </div>
        ) : (
          <div className="clientes-lista">
            {clientes.map((cliente) => (
              <article
                key={cliente.id}
                className="clientes-cartao"
                style={{
                  ...estilos.cartao,
                  opacity: cliente.ativo ? 1 : 0.72,
                  padding: '22px',
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
                        background: cliente.ativo
                          ? '#eff6ff'
                          : '#f1f5f9',
                        color: cliente.ativo
                          ? '#2563eb'
                          : '#64748b',
                        fontSize: '20px',
                        fontWeight: 800,
                      }}
                    >
                      {cliente.nome.trim().charAt(0).toUpperCase() || 'C'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          flexWrap: 'wrap',
                          marginBottom: '12px',
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
                          {cliente.nome}
                        </h3>

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 9px',
                            borderRadius: '20px',
                            background: cliente.ativo
                              ? '#f0fdf4'
                              : '#f1f5f9',
                            color: cliente.ativo
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
                              background: cliente.ativo
                                ? '#16a34a'
                                : '#94a3b8',
                            }}
                          />
                          {cliente.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                          gap: '12px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '9px',
                            color: '#475569',
                            fontSize: '13px',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          <span style={{ color: '#2563eb' }}>☎</span>
                          <span>
                            {cliente.telefone || 'Telefone não informado'}
                          </span>
                        </div>

                        {cliente.email && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '9px',
                              color: '#475569',
                              fontSize: '13px',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            <span style={{ color: '#2563eb' }}>✉</span>
                            <span>{cliente.email}</span>
                          </div>
                        )}

                        {cliente.cpf_cnpj && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '9px',
                              color: '#475569',
                              fontSize: '13px',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            <span style={{ color: '#2563eb' }}>▤</span>
                            <span>{cliente.cpf_cnpj}</span>
                          </div>
                        )}

                        {cliente.endereco && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '9px',
                              color: '#475569',
                              fontSize: '13px',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            <span style={{ color: '#2563eb' }}>⌖</span>
                            <span>{cliente.endereco}</span>
                          </div>
                        )}
                      </div>

                      {cliente.observacoes && (
                        <div
                          style={{
                            marginTop: '16px',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <p
                            style={{
                              margin: '0 0 5px',
                              color: '#475569',
                              fontSize: '12px',
                              fontWeight: 700,
                            }}
                          >
                            Observações
                          </p>

                          <p
                            style={{
                              margin: 0,
                              color: '#64748b',
                              fontSize: '13px',
                              lineHeight: 1.6,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {cliente.observacoes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className="clientes-acoes"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      className="clientes-botao"
                      onClick={() => editarCliente(cliente)}
                      style={{
                        ...estilos.botaoSecundario,
                        padding: '9px 13px',
                      }}
                    >
                      ✎ Editar
                    </button>

                    <button
                      className="clientes-botao"
                      onClick={() => alternarStatus(cliente)}
                      style={{
                        padding: '9px 13px',
                        border: `1px solid ${
                          cliente.ativo ? '#fecaca' : '#bbf7d0'
                        }`,
                        borderRadius: '10px',
                        background: cliente.ativo
                          ? '#fff1f2'
                          : '#f0fdf4',
                        color: cliente.ativo
                          ? '#be123c'
                          : '#15803d',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {cliente.ativo ? 'Desativar' : 'Ativar'}
                    </button>
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
