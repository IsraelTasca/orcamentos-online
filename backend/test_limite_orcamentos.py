
from types import SimpleNamespace

from fastapi.testclient import TestClient

import main


# ------------------------------------------------------------
# TESTES SIMPLES DA REGRA DE LIMITE
# ------------------------------------------------------------

def pode_criar_orcamento(quantidade_orcamentos, limite_orcamentos):
    if limite_orcamentos is None:
        return True

    return quantidade_orcamentos < limite_orcamentos


def test_plano_free_permite_criar_ate_o_nono_orcamento():
    assert pode_criar_orcamento(9, 10) is True


def test_plano_free_bloqueia_quando_ja_existirem_dez_orcamentos():
    assert pode_criar_orcamento(10, 10) is False


def test_plano_free_bloqueia_quando_existirem_mais_de_dez():
    assert pode_criar_orcamento(11, 10) is False


def test_plano_sem_limite_permite_criar_orcamento():
    assert pode_criar_orcamento(100, None) is True


# ------------------------------------------------------------
# SIMULAÇÃO DO SUPABASE
# Não consulta nem grava dados reais.
# ------------------------------------------------------------

class ConsultaSupabaseFalsa:
    def __init__(self, tabela):
        self.tabela = tabela
        self.contagem_exata = False

    def select(self, *args, **kwargs):
        self.contagem_exata = kwargs.get("count") == "exact"
        return self

    def eq(self, *args, **kwargs):
        return self

    def gte(self, *args, **kwargs):
        return self

    def execute(self):
        if self.tabela == "empresas":
            return SimpleNamespace(
                data=[
                    {
                        "id": "empresa-teste",
                        "plano_id": "plano-free",
                    }
                ]
            )

        if self.tabela == "planos":
            return SimpleNamespace(
                data=[
                    {
                        "id": "plano-free",
                        "nome": "Free",
                        "limite_orcamentos": 10,
                        "limite_clientes": 20,
                        "limite_itens": 20,
                    }
                ]
            )

        if self.tabela == "orcamentos" and self.contagem_exata:
            return SimpleNamespace(
                data=[],
                count=10,
            )

        raise AssertionError(
            f"Consulta inesperada na tabela: {self.tabela}"
        )


class SupabaseFalso:
    def __init__(self):
        self.gravacoes = 0

    def table(self, nome):
        return ConsultaSupabaseFalsa(nome)


# ------------------------------------------------------------
# TESTE DA ROTA REAL DO FASTAPI
# ------------------------------------------------------------

def test_rota_bloqueia_orcamento_quando_limite_free_foi_atingido():
    supabase_falso = SupabaseFalso()

    def autenticacao_falsa():
        return (
            supabase_falso,
            {
                "id": "usuario-teste",
                "email": "teste@example.com",
            },
        )

    main.app.dependency_overrides[
        main.obter_cliente_supabase_autenticado
    ] = autenticacao_falsa

    try:
        with TestClient(main.app) as cliente:
            resposta = cliente.post(
                "/orcamentos",
                json={
                    "cliente_id": "cliente-teste",
                    "itens": [
                        {
                            "item_id": "item-teste",
                            "quantidade": 1,
                            "valor_unitario": 50,
                        }
                    ],
                    "desconto": 0,
                },
            )

        assert resposta.status_code == 403

        assert resposta.json()["detail"] == (
            "Limite mensal de orçamentos "
            "atingido para o plano atual."
        )

        assert supabase_falso.gravacoes == 0

    finally:
        main.app.dependency_overrides.pop(
            main.obter_cliente_supabase_autenticado,
            None,
        )
