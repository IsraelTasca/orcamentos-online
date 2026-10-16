'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

export default function Login() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  async function entrar() {
    if (!email.trim() || !senha) {
      setMensagem('Informe o e-mail e a senha.')
      return
    }

    setCarregando(true)
    setMensagem('Verificando acesso...')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      })

      if (error) {
        setMensagem(
          'Não foi possível entrar. Confira o e-mail e a senha.'
        )
        return
      }

      setMensagem('Login realizado! Verificando sua empresa...')

      const {
        data: { user },
        error: erroUsuario,
      } = await supabase.auth.getUser()

      if (erroUsuario || !user) {
        await supabase.auth.signOut()
        setMensagem('Não foi possível identificar o usuário.')
        return
      }

      const { data: empresa, error: erroEmpresa } = await supabase
        .from('empresas')
        .select('id, nome')
        .eq('usuario_id', user.id)
        .maybeSingle()

      if (erroEmpresa) {
        setMensagem(
          'Login realizado, mas houve um erro ao consultar sua empresa: ' +
            erroEmpresa.message
        )
        return
      }

      if (!empresa) {
        setMensagem(
          'Login realizado, mas não encontramos uma empresa vinculada a esta conta.'
        )
        return
      }

      router.replace('/orcamentos')
    } catch {
      setMensagem('Ocorreu um erro inesperado ao tentar entrar.')
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
              SUA EMPRESA, MAIS ORGANIZADA
            </span>

            <h1>
              Seus orçamentos
              <br />
              <span>em um só lugar.</span>
            </h1>

            <p className="login-presentation-text">
              Crie orçamentos profissionais, organize seus clientes
              e compartilhe suas propostas com facilidade.
            </p>

            <div className="login-preview" aria-hidden="true">
              <div className="login-preview-top">
                <div className="login-preview-title">
                  <span className="login-preview-symbol">▤</span>
                  <div>
                    <strong>Seu próximo orçamento</strong>
                    <small>Organização para o seu negócio</small>
                  </div>
                </div>

                <span className="login-preview-badge">
                  Em dia
                </span>
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
                <span>Pronto para compartilhar</span>
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
              <span className="login-form-overline">
                BEM-VINDO DE VOLTA
              </span>

              <h2>Entre na sua conta</h2>

              <p>
                Informe seus dados para acessar seu espaço de trabalho.
              </p>
            </div>

            <form
              className="login-form"
              onSubmit={(e) => {
                e.preventDefault()
                if (!carregando) {
                  void entrar()
                }
              }}
            >
              <div className="login-field">
                <label htmlFor="login-email">E-mail</label>

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
                    id="login-email"
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
                <div className="login-label-row">
                  <label htmlFor="login-senha">Senha</label>
                </div>

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
                    id="login-senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
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
                    aria-label={
                      mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'
                    }
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

              <button
                className="login-submit"
                type="submit"
                disabled={carregando}
              >
                {carregando ? (
                  <>
                    <span className="login-spinner" />
                    Verificando acesso...
                  </>
                ) : (
                  <>
                    Entrar na minha conta
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>

              {mensagem && (
                <p
                  className={`login-message ${
                    mensagem.includes('Não foi possível') ||
                    mensagem.includes('não encontramos') ||
                    mensagem.includes('erro') ||
                    mensagem.includes('Erro')
                      ? 'login-message-error'
                      : 'login-message-info'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {mensagem}
                </p>
              )}
            </form>

            <div className="login-signup">
              Ainda não tem uma conta?
              {' '}
              <Link href="/cadastro">Criar minha conta</Link>
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
              <span>Acesso seguro à sua conta</span>
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
