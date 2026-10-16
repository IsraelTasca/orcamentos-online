'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function Cadastro() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mensagem, setMensagem] = useState('')

  async function cadastrar() {
    setMensagem('Cadastrando...')

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome,
        },
      },
    })

    if (error) {
      setMensagem(error.message)
      return
    }

    setMensagem('Cadastro realizado com sucesso!')
  }

  return (
    <main style={{ padding: '40px', maxWidth: '500px', margin: '0 auto' }}>
      <h1> Criar conta</h1>

      <div style={{ display: 'grid', gap: '12px', marginTop: '30px' }}>
        <input
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <button onClick={cadastrar}>
          Criar conta
        </button>

        {mensagem && <p>{mensagem}</p>}
      </div>
    </main>
  )
}