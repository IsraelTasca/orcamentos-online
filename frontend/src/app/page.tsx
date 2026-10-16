import { supabase } from '../../lib/supabase'

export default async function Home() {
  const { data, error } = await supabase
    .from('planos')
    .select('nome, preco')
    .limit(2)

  return (
    <main style={{ padding: '40px' }}>
      <h1>Teste do Supabase</h1>

      <pre>
        {JSON.stringify({ data, error }, null, 2)}
      </pre>
    </main>
  )
}