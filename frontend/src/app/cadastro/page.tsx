'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

export default function Cadastro() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false)
  const [tipoMensagem, setTipoMensagem] = useState<'erro' | 'info' | 'sucesso'>('info')

  async function cadastrar() {
    if (!nome.trim() || !email.trim() || !senha || !confirmarSenha) {
      setTipoMensagem('erro')
      setMensagem('Preencha todos os campos para criar sua conta.')
      return
    }

    if (senha !== confirmarSenha) {
      setTipoMensagem('erro')
      setMensagem('As senhas informadas não são iguais.')
      return
    }

    setCarregando(true)
    setTipoMensagem('info')
    setMensagem('Criando sua conta...')

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          data: {
            nome: nome.trim(),
          },
        },
      })

      if (error) {
        setTipoMensagem('erro')
        setMensagem(error.message)
        return
      }

      setTipoMensagem('sucesso')
      setMensagem('Cadastro realizado com sucesso!')
    } catch {
      setTipoMensagem('erro')
      setMensagem('Ocorreu um erro inesperado ao criar sua conta. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-layout">
        <aside className="login-presentation">
          <div className="login-brand">
            <div className="login-brand-icon" aria-hidden="true">
              O
            </div>

            <div>
              <div className="login-brand-name">Orçamentos Online</div>
              <div className="login-brand-caption">
                GESTÃO SIMPLES E PROFISSIONAL
              </div>
            </div>
          </div>

          <div className="login-presentation-content">
            <span className="login-eyebrow">
              <span className="login-eyebrow-dot" />
              SEU NEGÓCIO, MAIS ORGANIZADO
            </span>

            <h1>
              Comece a organizar
              <br />
              <span>seu negócio.</span>
            </h1>

            <p className="login-presentation-text">
              Crie sua conta e tenha mais praticidade para elaborar orçamentos,
              organizar clientes e compartilhar suas propostas.
            </p>

            <div className="login-preview" aria-hidden="true">
              <div className="login-preview-top">
                <div className="login-preview-title">
                  <span className="login-preview-symbol">▤</span>
                  <div>
                    <strong>Seu negócio, em boas mãos</strong>
                    <small>Organização para o seu dia a dia</small>
                  </div>
                </div>

                <span className="login-preview-badge">Comece hoje</span>
              </div>

              <div className="login-preview-line">
                <span />
                <span />
              </div>

              <div className="login-preview-line login-preview-line-short">
                <span />
                <span />
              </div>

              <div className="login-preview-total">
                <span>Mais praticidade para sua empresa</span>
                <span className="login-preview-check">✓</span>
              </div>
            </div>
          </div>

          <div className="login-presentation-footer">
            Simplicidade para cuidar melhor do seu negócio.
          </div>
        </aside>

        <section className="login-form-side">
          <div className="login-form-card">
            <div className="login-mobile-brand">
              <div className="login-brand-icon" aria-hidden="true">
                O
              </div>
              <strong>Orçamentos Online</strong>
            </div>

            <div className="login-form-heading">
              <span className="login-form-overline">CRIE SUA CONTA</span>

              <h2>Comece agora</h2>

              <p>Preencha seus dados para criar seu espaço de trabalho.</p>
            </div>

            <form
              className="login-form cadastro-form"
              onSubmit={(e) => {
                e.preventDefault()
                if (!carregando) {
                  void cadastrar()
                }
              }}
            >
              <div className="login-field">
                <label htmlFor="cadastro-nome">Nome</label>

                <div className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M5 21a7 7 0 0 1 14 0" />
                    </svg>
                  </span>

                  <input
                    id="cadastro-nome"
                    type="text"
                    placeholder="Seu nome"
                    autoComplete="name"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    disabled={carregando}
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="cadastro-email">E-mail</label>

                <div className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                  </span>

                  <input
                    id="cadastro-email"
                    type="email"
                    placeholder="voce@empresa.com.br"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={carregando}
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="cadastro-senha">Senha</label>

                <div className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      <path d="M12 14v3" />
                    </svg>
                  </span>

                  <input
                    id="cadastro-senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="Crie uma senha"
                    autoComplete="new-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    disabled={carregando}
                    required
                  />

                  <button
                    className="login-password-toggle"
                    type="button"
                    onClick={() => setMostrarSenha((atual) => !atual)}
                    disabled={carregando}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {mostrarSenha ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 8.5 4.5 9 7-.2 1.1-1 2.5-2.3 3.7" />
                        <path d="M6.2 6.2C3.8 7.7 2.3 10 2 12c.5 2.5 4 7 10 7 1 0 2-.2 2.9-.5" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="cadastro-confirmar-senha">Confirme sua senha</label>

                <div className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      <path d="m9 15 2 2 4-4" />
                    </svg>
                  </span>

                  <input
                    id="cadastro-confirmar-senha"
                    type={mostrarConfirmacao ? 'text' : 'password'}
                    placeholder="Digite novamente sua senha"
                    autoComplete="new-password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    disabled={carregando}
                    required
                  />

                  <button
                    className="login-password-toggle"
                    type="button"
                    onClick={() => setMostrarConfirmacao((atual) => !atual)}
                    disabled={carregando}
                    aria-label={mostrarConfirmacao ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                    title={mostrarConfirmacao ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                  >
                    {mostrarConfirmacao ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 8.5 4.5 9 7-.2 1.1-1 2.5-2.3 3.7" />
                        <path d="M6.2 6.2C3.8 7.7 2.3 10 2 12c.5 2.5 4 7 10 7 1 0 2-.2 2.9-.5" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                className="login-submit"
                type="submit"
                disabled={carregando}
              >
                {carregando ? (
                  <>
                    <span className="login-spinner" />
                    Criando sua conta...
                  </>
                ) : (
                  <>
                    Criar minha conta
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>

              {mensagem && (
                <p
                  className={`login-message cadastro-message cadastro-message-${tipoMensagem}`}
                  role="status"
                  aria-live="polite"
                >
                  {mensagem}
                </p>
              )}
            </form>

            <div className="login-signup">
              Já possui uma conta?{' '}
              <Link href="/login">Entrar na minha conta</Link>
            </div>

            <div className="login-security-note">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              <span>Seus dados são utilizados para criar sua conta.</span>
            </div>
          </div>

          <footer className="login-bottom-footer">
            © {new Date().getFullYear()} Orçamentos Online
          </footer>
        </section>
      </section>
    </main>
  )
}