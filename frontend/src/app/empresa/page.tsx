
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Empresa = {
  id: string
  nome: string
  responsavel: string | null
  cpf_cnpj: string | null
  whatsapp: string | null
  email: string | null
  endereco: string | null
  logo_url: string | null
}

const estilos = {
  pagina: {
    maxWidth: '1100px',
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
    padding: '13px 20px',
    border: 'none',
    borderRadius: '10px',
    background: '#2563eb',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  } as React.CSSProperties,
}

export default function EmpresaPage() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null)

  const [nome, setNome] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [endereco, setEndereco] = useState('')

  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')

  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarEmpresa()
  }, [])

  async function carregarEmpresa() {
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
      data: empresaData,
      error: empresaError,
    } = await supabase
      .from('empresas')
      .select(
        'id, nome, responsavel, cpf_cnpj, whatsapp, email, endereco, logo_url'
      )
      .eq('usuario_id', user.id)
      .single()

    if (empresaError || !empresaData) {
      console.error(empresaError)

      setMensagem(
        'Não foi possível encontrar a empresa cadastrada.'
      )

      setCarregando(false)
      return
    }

    setEmpresa(empresaData)

    setNome(empresaData.nome)
    setResponsavel(empresaData.responsavel ?? '')
    setCpfCnpj(empresaData.cpf_cnpj ?? '')
    setWhatsapp(empresaData.whatsapp ?? '')
    setEmail(empresaData.email ?? '')
    setEndereco(empresaData.endereco ?? '')

    setLogoPreview(empresaData.logo_url ?? '')

    setCarregando(false)
  }

  function selecionarLogo(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const arquivo = event.target.files?.[0]

    if (!arquivo) {
      return
    }

    if (!arquivo.type.startsWith('image/')) {
      setMensagem(
        'Selecione um arquivo de imagem válido.'
      )
      return
    }

    if (arquivo.size > 2 * 1024 * 1024) {
      setMensagem(
        'A logo deve ter no máximo 2 MB.'
      )
      return
    }

    setLogo(arquivo)
    setLogoPreview(
      URL.createObjectURL(arquivo)
    )
    setMensagem('')
  }

  async function salvarEmpresa() {
    setMensagem('Salvando...')
    setSalvando(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMensagem('Usuário não está autenticado.')
      setSalvando(false)
      return
    }

    if (!empresa) {
      setMensagem('Empresa não encontrada.')
      setSalvando(false)
      return
    }

    if (!nome.trim()) {
      setMensagem('Informe o nome da empresa.')
      setSalvando(false)
      return
    }

    // Atualiza os dados da empresa
    const {
      error: empresaError,
    } = await supabase
      .from('empresas')
      .update({
        nome: nome.trim(),
        responsavel:
          responsavel.trim() || null,
        cpf_cnpj:
          cpfCnpj.trim() || null,
        whatsapp:
          whatsapp.trim() || null,
        email:
          email.trim() || null,
        endereco:
          endereco.trim() || null,
      })
      .eq('id', empresa.id)

    if (empresaError) {
      console.error(empresaError)

      setMensagem(
        `Erro ao salvar empresa: ${empresaError.message}`
      )

      setSalvando(false)
      return
    }

    // Se foi escolhida uma nova logo
    if (logo) {
      setMensagem(
        'Dados salvos. Enviando logo...'
      )

      const extensao =
        logo.name
          .split('.')
          .pop()
          ?.toLowerCase() || 'png'

      const caminhoArquivo =
        `${user.id}/logo.${extensao}`

      const {
        error: uploadError,
      } = await supabase.storage
        .from('logos')
        .upload(
          caminhoArquivo,
          logo,
          {
            upsert: true,
            contentType: logo.type,
          }
        )

      if (uploadError) {
        console.error(uploadError)

        setMensagem(
          `Dados salvos, mas não foi possível enviar a logo: ${uploadError.message}`
        )

        setSalvando(false)
        return
      }

      const {
        data: urlData,
      } = supabase.storage
        .from('logos')
        .getPublicUrl(
          caminhoArquivo
        )

      const logoUrl =
        urlData.publicUrl

      const {
        error: logoUpdateError,
      } = await supabase
        .from('empresas')
        .update({
          logo_url: logoUrl,
        })
        .eq('id', empresa.id)

      if (logoUpdateError) {
        console.error(
          logoUpdateError
        )

        setMensagem(
          `Dados salvos, mas não foi possível salvar a URL da logo: ${logoUpdateError.message}`
        )

        setSalvando(false)
        return
      }

      setLogo(null)
      setLogoPreview(logoUrl)
    }

    setMensagem(
      'Empresa atualizada com sucesso!'
    )

    setSalvando(false)

    await carregarEmpresa()
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
            Carregando dados da empresa
          </h1>

          <p style={estilos.descricao}>
            Aguarde enquanto buscamos as informações cadastradas.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={estilos.pagina}>
      <style>{`
        .empresa-campo:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.10);
          outline: none;
        }

        .empresa-botao {
          transition: background 0.2s ease, filter 0.2s ease;
        }

        .empresa-botao:hover:not(:disabled) {
          filter: brightness(0.96);
        }

        .empresa-grade {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }

        .empresa-coluna-completa {
          grid-column: 1 / -1;
        }

        .empresa-upload {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 48px;
          padding: 12px;
          box-sizing: border-box;
          border: 1px dashed #93c5fd;
          border-radius: 10px;
          background: #f8fbff;
          color: #1d4ed8;
          font-size: 13px;
        }

        .empresa-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 160px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
          overflow: hidden;
        }

        @media (max-width: 600px) {
          .empresa-pagina {
            padding: 24px 16px 40px !important;
          }

          .empresa-grade {
            grid-template-columns: minmax(0, 1fr);
          }

          .empresa-coluna-completa {
            grid-column: auto;
          }

          .empresa-cartao {
            padding: 18px !important;
          }

          .empresa-salvar {
            width: 100%;
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
            Configurações
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
            Minha empresa
          </h1>

          <p style={estilos.descricao}>
            Gerencie os dados comerciais e a identidade visual da sua empresa.
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
          <span style={{ fontSize: '18px' }}>▣</span>
          Dados comerciais
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

      <div style={{ display: 'grid', gap: '22px' }}>
        {/* DADOS DA EMPRESA */}
        <section
          className="empresa-cartao"
          style={estilos.cartao}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              marginBottom: '24px',
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
                background: '#eff6ff',
                color: '#2563eb',
                fontSize: '21px',
              }}
            >
              ▣
            </div>

            <div>
              <h2 style={estilos.tituloSecao}>
                Dados da empresa
              </h2>

              <p style={estilos.descricao}>
                Mantenha as informações da sua empresa atualizadas.
              </p>
            </div>
          </div>

          <div className="empresa-grade">
            <div>
              <label style={estilos.rotulo}>
                Nome da empresa *
              </label>

              <input
                className="empresa-campo"
                type="text"
                placeholder="Nome da empresa"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                style={estilos.campo}
              />
            </div>

            <div>
              <label style={estilos.rotulo}>
                Nome do responsável
              </label>

              <input
                className="empresa-campo"
                type="text"
                placeholder="Nome do responsável"
                value={responsavel}
                onChange={(e) =>
                  setResponsavel(e.target.value)
                }
                style={estilos.campo}
              />
            </div>

            <div>
              <label style={estilos.rotulo}>
                CPF / CNPJ
              </label>

              <input
                className="empresa-campo"
                type="text"
                placeholder="Documento da empresa"
                value={cpfCnpj}
                onChange={(e) =>
                  setCpfCnpj(e.target.value)
                }
                style={estilos.campo}
              />
            </div>

            <div>
              <label style={estilos.rotulo}>
                WhatsApp
              </label>

              <input
                className="empresa-campo"
                type="text"
                placeholder="Telefone com DDD"
                value={whatsapp}
                onChange={(e) =>
                  setWhatsapp(e.target.value)
                }
                style={estilos.campo}
              />
            </div>

            <div className="empresa-coluna-completa">
              <label style={estilos.rotulo}>
                E-mail
              </label>

              <input
                className="empresa-campo"
                type="email"
                placeholder="contato@empresa.com.br"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                style={estilos.campo}
              />
            </div>

            <div className="empresa-coluna-completa">
              <label style={estilos.rotulo}>
                Endereço
              </label>

              <input
                className="empresa-campo"
                type="text"
                placeholder="Rua, número, bairro, cidade..."
                value={endereco}
                onChange={(e) =>
                  setEndereco(e.target.value)
                }
                style={estilos.campo}
              />
            </div>
          </div>
        </section>

        {/* LOGO DA EMPRESA */}
        <section
          className="empresa-cartao"
          style={estilos.cartao}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              marginBottom: '24px',
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
                background: '#eff6ff',
                color: '#2563eb',
                fontSize: '21px',
              }}
            >
              ◈
            </div>

            <div>
              <h2 style={estilos.tituloSecao}>
                Logo da empresa
              </h2>

              <p style={estilos.descricao}>
                Adicione sua identidade visual para representar sua empresa.
              </p>
            </div>
          </div>

          <div className="empresa-grade">
            <div>
              <label style={estilos.rotulo}>
                Pré-visualização
              </label>

              <div className="empresa-preview">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo da empresa"
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: '180px',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: '58px',
                        height: '58px',
                        display: 'grid',
                        placeItems: 'center',
                        margin: '0 auto 12px',
                        borderRadius: '15px',
                        background: '#e2e8f0',
                        color: '#64748b',
                        fontSize: '25px',
                      }}
                    >
                      ◈
                    </div>

                    <p
                      style={{
                        margin: 0,
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      Nenhuma logo selecionada
                    </p>

                    <p
                      style={{
                        margin: '6px 0 0',
                        color: '#94a3b8',
                        fontSize: '12px',
                      }}
                    >
                      A prévia aparecerá aqui.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label style={estilos.rotulo}>
                Escolher imagem
              </label>

              <div
                style={{
                  padding: '18px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  background: '#f8fafc',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: '14px',
                    borderRadius: '11px',
                    background: '#dbeafe',
                    color: '#1d4ed8',
                    fontSize: '20px',
                  }}
                >
                  ↑
                </div>

                <p
                  style={{
                    margin: '0 0 8px',
                    color: '#334155',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  Selecione sua logo
                </p>

                <p
                  style={{
                    margin: '0 0 16px',
                    color: '#64748b',
                    fontSize: '12px',
                    lineHeight: 1.6,
                  }}
                >
                  Formatos aceitos: PNG, JPG ou WEBP. Tamanho máximo: 2 MB.
                </p>

                <input
                  className="empresa-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={selecionarLogo}
                />
              </div>
            </div>
          </div>
        </section>

        {/* AÇÕES */}
        <section
          style={{
            ...estilos.cartao,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '18px',
            flexWrap: 'wrap',
            background: '#f8fafc',
          }}
        >
          <div>
            <h2 style={estilos.tituloSecao}>
              Salvar informações
            </h2>

            <p style={estilos.descricao}>
              Confira os dados antes de confirmar as alterações.
            </p>
          </div>

          <button
            className="empresa-botao empresa-salvar"
            onClick={salvarEmpresa}
            disabled={salvando}
            style={{
              ...estilos.botaoPrimario,
              opacity: salvando ? 0.7 : 1,
              cursor: salvando ? 'not-allowed' : 'pointer',
            }}
          >
            {salvando
              ? 'Salvando...'
              : '✓ Salvar alterações'}
          </button>
        </section>
      </div>
    </main>
  )
}
