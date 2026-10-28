import os
import secrets
import json
import hmac
import hashlib
import urllib.error
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    Header,
    Request,
)
from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials,
)
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, Field
from dotenv import load_dotenv

from supabase import create_client


# ============================================================
# CONFIGURAÇÃO DO .ENV
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(BASE_DIR, ".env")

load_dotenv(ENV_FILE)


supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase_secret_key = os.getenv("SUPABASE_SECRET_KEY")
mercado_pago_access_token = os.getenv("MERCADO_PAGO_ACCESS_TOKEN")
mercado_pago_public_key = os.getenv("MERCADO_PAGO_PUBLIC_KEY")
mercado_pago_webhook_secret = os.getenv("MERCADO_PAGO_WEBHOOK_SECRET")
mercado_pago_webhook_url = os.getenv("MERCADO_PAGO_WEBHOOK_URL")
app_frontend_url = os.getenv("APP_FRONTEND_URL", "http://localhost:3000").rstrip("/")

# IDs dos planos já cadastrados no Supabase. Podem ser sobrescritos no .env.
plano_gratuito_id = os.getenv(
    "PLANO_GRATUITO_ID", "505ee029-a434-4061-91c3-81a8437b63e2"
)
plano_plus_id = os.getenv(
    "PLANO_PLUS_ID", "be2bd336-6ec1-4501-9180-cd6c8828ab81"
)


if not supabase_url or not supabase_key:
    raise RuntimeError(
        f"SUPABASE_URL ou SUPABASE_KEY não foram encontrados "
        f"no arquivo: {ENV_FILE}"
    )


# ============================================================
# SUPABASE
# ============================================================

supabase = create_client(
    supabase_url,
    supabase_key
)

# Cliente privilegiado: usado somente nas rotas administrativas de assinatura/webhook.
# A chave secreta nunca deve ser enviada ao frontend.
supabase_admin = (
    create_client(supabase_url, supabase_secret_key)
    if supabase_secret_key
    else None
)


def exigir_configuracao_assinaturas():
    """Falha de forma explícita se as credenciais de assinatura não estiverem configuradas."""
    if not supabase_admin:
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_SECRET_KEY não está configurada no backend."
        )
    if not mercado_pago_access_token:
        raise HTTPException(
            status_code=503,
            detail="MERCADO_PAGO_ACCESS_TOKEN não está configurado no backend."
        )
    if not mercado_pago_webhook_secret:
        raise HTTPException(
            status_code=503,
            detail="MERCADO_PAGO_WEBHOOK_SECRET não está configurado no backend. Configure a assinatura secreta do webhook antes de contratar o Plus."
        )


def requisicao_mercado_pago(metodo: str, caminho: str, payload: Optional[dict] = None):
    """Executa uma requisição à API do Mercado Pago sem expor o Access Token."""
    if not mercado_pago_access_token:
        raise HTTPException(
            status_code=503,
            detail="MERCADO_PAGO_ACCESS_TOKEN não está configurado no backend."
        )

    url = "https://api.mercadopago.com" + caminho
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {mercado_pago_access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if metodo.upper() == "POST":
        headers["X-Idempotency-Key"] = secrets.token_urlsafe(24)

    request = urllib.request.Request(
        url, data=body, headers=headers, method=metodo.upper()
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as resposta:
            texto = resposta.read().decode("utf-8")
            return json.loads(texto) if texto else {}
    except urllib.error.HTTPError as erro:
        detalhe = erro.read().decode("utf-8", errors="replace")
        print("ERRO API MERCADO PAGO:", erro.code, detalhe[:1000])

        # O 429 indica limitação temporária. Devolvemos 503 para que a falha
        # fique explícita e o provedor possa tentar novamente quando aplicável.
        if erro.code == 429:
            raise HTTPException(
                status_code=503,
                detail="O Mercado Pago está limitando temporariamente as requisições. Tente novamente mais tarde."
            )

        raise HTTPException(
            status_code=502,
            detail="O Mercado Pago não aceitou a solicitação. Confira o log do backend."
        )
    except (urllib.error.URLError, TimeoutError) as erro:
        print("ERRO DE CONEXÃO MERCADO PAGO:", str(erro))
        raise HTTPException(
            status_code=502,
            detail="Não foi possível conectar ao Mercado Pago."
        )


def validar_assinatura_webhook(x_signature: Optional[str], x_request_id: Optional[str], data_id: Optional[str]) -> bool:
    """Valida x-signature conforme o manifesto HMAC do Mercado Pago."""
    if not mercado_pago_webhook_secret or not x_signature or not x_request_id or not data_id:
        return False

    partes = {}
    for trecho in x_signature.split(","):
        if "=" in trecho:
            chave, valor = trecho.strip().split("=", 1)
            partes[chave] = valor

    timestamp = partes.get("ts")
    assinatura_recebida = partes.get("v1")
    if not timestamp or not assinatura_recebida:
        return False

    # O ID da notificação é normalizado em minúsculas no manifesto.
    manifesto = f"id:{str(data_id).lower()};request-id:{x_request_id};ts:{timestamp};"
    assinatura_esperada = hmac.new(
        mercado_pago_webhook_secret.encode("utf-8"),
        manifesto.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(assinatura_esperada, assinatura_recebida)


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="Orçamentos Online API",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://orcamentos-online-henna.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# AUTENTICAÇÃO
# ============================================================

security = HTTPBearer()


def obter_cliente_supabase_autenticado(
    credenciais: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Recebe o JWT enviado pelo frontend.

    1. Cria um cliente Supabase isolado para esta requisição.
    2. Valida o JWT e obtém os dados do usuário.
    3. Configura o JWT nesse cliente para que as políticas RLS
       utilizem auth.uid() nas consultas e alterações.

    O cliente autenticado não é compartilhado entre requisições.
    Isso evita que tokens de usuários diferentes sejam misturados
    quando várias requisições acontecem ao mesmo tempo.
    """

    token = credenciais.credentials

    try:
        print("\n========================================")
        print("TENTANDO VALIDAR TOKEN")
        print("========================================")

        # Cada requisição recebe seu próprio cliente Supabase.
        cliente_usuario = create_client(
            supabase_url,
            supabase_key
        )

        resposta_claims = cliente_usuario.auth.get_claims(token)

        print("RESPOSTA GET_CLAIMS RECEBIDA")

        if isinstance(resposta_claims, dict):
            claims = resposta_claims.get("claims")
        else:
            claims = getattr(resposta_claims, "claims", None)

        if not claims:
            print("ERRO: GET_CLAIMS NÃO RETORNOU CLAIMS")
            raise HTTPException(
                status_code=401,
                detail="Token inválido ou expirado."
            )

        usuario_id = claims.get("sub")

        if not usuario_id:
            print("ERRO: TOKEN NÃO POSSUI SUB")
            raise HTTPException(
                status_code=401,
                detail="Token sem identificação de usuário."
            )

        email = claims.get("email")

        print("USUÁRIO IDENTIFICADO:")
        print("ID:", usuario_id)
        print("EMAIL:", email)

        # O JWT do usuário será usado nas consultas protegidas por RLS.
        cliente_usuario.postgrest.auth(token)

        print("JWT CONFIGURADO NO CLIENTE ISOLADO")
        print("========================================\n")

        return (
            cliente_usuario,
            {
                "id": usuario_id,
                "email": email
            }
        )

    except HTTPException:
        raise

    except Exception as erro:
        print("\n========================================")
        print("ERRO REAL NA AUTENTICAÇÃO")
        print("========================================")
        print("TIPO DO ERRO:", type(erro).__name__)
        print("MENSAGEM DO ERRO:", str(erro))
        print("========================================\n")

        raise HTTPException(
            status_code=401,
            detail="Token inválido ou expirado."
        )


# ============================================================
# MODELOS
# ============================================================

class ItemOrcamento(BaseModel):
    item_id: str
    quantidade: float = Field(gt=0)
    valor_unitario: float = Field(ge=0)


class CriarOrcamento(BaseModel):
    cliente_id: str
    itens: List[ItemOrcamento]
    desconto: float = Field(default=0, ge=0)
    validade: Optional[str] = None
    observacoes: Optional[str] = None


class AtualizarOrcamento(BaseModel):
    cliente_id: str
    itens: List[ItemOrcamento]
    desconto: float = Field(default=0, ge=0)
    validade: Optional[str] = None
    observacoes: Optional[str] = None


# ============================================================
# ROTAS BÁSICAS
# ============================================================

@app.get("/")
def inicio():
    return {
        "mensagem": "API do Orçamentos Online funcionando!"
    }


@app.get("/teste-supabase")
def teste_supabase():
    return {
        "mensagem": "Conexão com Supabase configurada!"
    }


# ============================================================
# TESTE DE AUTENTICAÇÃO
# ============================================================

@app.get("/teste-autenticacao")
def teste_autenticacao(
    dados=Depends(obter_cliente_supabase_autenticado)
):
    cliente_supabase, usuario = dados

    return {
        "mensagem": "Usuário autenticado com sucesso!",
        "usuario_id": usuario["id"],
        "email": usuario["email"]
    }


# ============================================================
# ORÇAMENTO PÚBLICO
# ============================================================

@app.get("/orcamentos/publico/{token}")
def obter_orcamento_publico(token: str):
    """
    Retorna os dados públicos de um orçamento
    utilizando o token_publico.

    Esta rota não exige autenticação.
    """

    token = token.strip()

    if not token:
        raise HTTPException(
            status_code=400,
            detail="Token público não informado."
        )

    try:
        resposta = (
            supabase
            .rpc(
                "obter_orcamento_publico",
                {
                    "p_token": token
                }
            )
            .execute()
        )

    except Exception as erro:
        print(
            "ERRO AO BUSCAR ORÇAMENTO PÚBLICO:",
            erro
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Não foi possível consultar "
                "o orçamento público."
            )
        )

    if not resposta.data:
        raise HTTPException(
            status_code=404,
            detail="Orçamento não encontrado."
        )

    return resposta.data


# ============================================================
# FUNÇÃO AUXILIAR
# ============================================================

def obter_empresa_usuario(
    supabase_usuario,
    usuario_id: str
):
    try:
        resposta_empresa = (
            supabase_usuario
            .table("empresas")
            .select("id, plano_id")
            .eq("usuario_id", usuario_id)
            .execute()
        )

    except Exception as erro:
        print("ERRO AO BUSCAR EMPRESA:", erro)

        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar a empresa do usuário."
        )

    empresas = resposta_empresa.data or []

    if not empresas:
        raise HTTPException(
            status_code=404,
            detail="Empresa do usuário não encontrada."
        )

    return empresas[0]


# ============================================================
# CRIAR ORÇAMENTO
# ============================================================

@app.post("/orcamentos")
def criar_orcamento(
    dados: CriarOrcamento,
    autenticacao=Depends(
        obter_cliente_supabase_autenticado
    )
):
    supabase_usuario, usuario = autenticacao

    if not dados.itens:
        raise HTTPException(
            status_code=400,
            detail="O orçamento precisa ter pelo menos um item."
        )

    # --------------------------------------------------------
    # IMPEDIR ITEM DUPLICADO
    # --------------------------------------------------------

    ids_itens_recebidos = [
        item.item_id
        for item in dados.itens
    ]

    if len(ids_itens_recebidos) != len(
        set(ids_itens_recebidos)
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "O mesmo item não pode ser adicionado "
                "mais de uma vez ao orçamento."
            )
        )

    empresa = obter_empresa_usuario(
        supabase_usuario,
        usuario["id"]
    )

    empresa_id = empresa["id"]
    plano_id = empresa["plano_id"]

    try:
        resposta_plano = (
            supabase_usuario
            .table("planos")
            .select(
                "id, nome, limite_orcamentos, "
                "limite_clientes, limite_itens"
            )
            .eq("id", plano_id)
            .eq("ativo", True)
            .execute()
        )

    except Exception as erro:
        print("ERRO AO BUSCAR PLANO:", erro)

        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar o plano da empresa."
        )

    planos = resposta_plano.data or []

    if not planos:
        raise HTTPException(
            status_code=500,
            detail="Plano da empresa não encontrado."
        )

    plano = planos[0]
    limite_orcamentos = plano["limite_orcamentos"]

    if limite_orcamentos is not None:
        agora = datetime.now(timezone.utc)

        inicio_mes = agora.replace(
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0
        )

        try:
            resposta_contagem = (
                supabase_usuario
                .table("orcamentos")
                .select("id", count="exact")
                .eq("empresa_id", empresa_id)
                .gte(
                    "created_at",
                    inicio_mes.isoformat()
                )
                .execute()
            )

        except Exception as erro:
            print("ERRO AO CONTAR ORÇAMENTOS:", erro)

            raise HTTPException(
                status_code=500,
                detail="Erro ao verificar limite do plano."
            )

        quantidade_orcamentos = (
            resposta_contagem.count or 0
        )

        if quantidade_orcamentos >= limite_orcamentos:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Limite mensal de orçamentos "
                    "atingido para o plano atual."
                )
            )

    try:
        resposta_cliente = (
            supabase_usuario
            .table("clientes")
            .select("id, nome, empresa_id")
            .eq("id", dados.cliente_id)
            .eq("empresa_id", empresa_id)
            .eq("ativo", True)
            .execute()
        )

    except Exception as erro:
        print("ERRO AO BUSCAR CLIENTE:", erro)

        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar o cliente."
        )

    clientes = resposta_cliente.data or []

    if not clientes:
        raise HTTPException(
            status_code=404,
            detail=(
                "Cliente não encontrado "
                "ou não pertence à empresa."
            )
        )

    ids_itens = [
        item.item_id
        for item in dados.itens
    ]

    try:
        resposta_itens = (
            supabase_usuario
            .table("itens")
            .select(
                "id, nome, descricao, "
                "valor, empresa_id"
            )
            .eq("empresa_id", empresa_id)
            .eq("ativo", True)
            .in_("id", ids_itens)
            .execute()
        )

    except Exception as erro:
        print("ERRO AO BUSCAR ITENS:", erro)

        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar os itens."
        )

    itens_cadastrados = resposta_itens.data or []

    itens_por_id = {
        item["id"]: item
        for item in itens_cadastrados
    }

    for item in dados.itens:
        if item.item_id not in itens_por_id:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"O item {item.item_id} "
                    "não foi encontrado, está inativo "
                    "ou não pertence à empresa."
                )
            )

    subtotal = 0
    itens_processados = []

    for item in dados.itens:
        valor_total = (
            item.quantidade *
            item.valor_unitario
        )

        subtotal += valor_total

        item_cadastrado = itens_por_id[item.item_id]

        itens_processados.append({
            "item_id": item.item_id,
            "nome": item_cadastrado["nome"],
            "descricao": item_cadastrado["descricao"],
            "quantidade": item.quantidade,
            "valor_unitario": item.valor_unitario,
            "valor_total": round(valor_total, 2)
        })

    subtotal = round(subtotal, 2)
    desconto = round(dados.desconto, 2)
    total = round(subtotal - desconto, 2)

    if total < 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "O desconto não pode ser maior "
                "que o subtotal."
            )
        )

    try:
        resposta_numero = (
            supabase_usuario
            .rpc(
                "proximo_numero_orcamento",
                {"p_empresa_id": empresa_id}
            )
            .execute()
        )

    except Exception as erro:
        print("ERRO AO GERAR NÚMERO:", erro)

        raise HTTPException(
            status_code=500,
            detail=(
                "Não foi possível gerar "
                "o número do orçamento."
            )
        )

    numero = resposta_numero.data

    if numero is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "A função de numeração "
                "não retornou um número."
            )
        )

    token_publico = secrets.token_urlsafe(18)

    novo_orcamento = {
        "empresa_id": empresa_id,
        "cliente_id": dados.cliente_id,
        "numero": numero,
        "status": "rascunho",
        "subtotal": subtotal,
        "desconto": desconto,
        "total": total,
        "validade": dados.validade,
        "observacoes": dados.observacoes,
        "token_publico": token_publico
    }

    try:
        resposta_orcamento = (
            supabase_usuario
            .table("orcamentos")
            .insert(novo_orcamento)
            .execute()
        )

    except Exception as erro:
        print("ERRO AO SALVAR ORÇAMENTO:", erro)

        raise HTTPException(
            status_code=500,
            detail=(
                "Não foi possível salvar "
                "o orçamento."
            )
        )

    orcamentos_criados = (
        resposta_orcamento.data or []
    )

    if not orcamentos_criados:
        raise HTTPException(
            status_code=500,
            detail=(
                "O orçamento não foi retornado "
                "após a gravação."
            )
        )

    orcamento_criado = (
        orcamentos_criados[0]
    )

    orcamento_id = orcamento_criado["id"]

    registros_itens = []

    for item in itens_processados:
        registros_itens.append({
            "orcamento_id": orcamento_id,
            "item_id": item["item_id"],
            "nome": item["nome"],
            "descricao": item["descricao"],
            "quantidade": item["quantidade"],
            "valor_unitario": item["valor_unitario"],
            "valor_total": item["valor_total"]
        })

    try:
        resposta_itens_orcamento = (
            supabase_usuario
            .table("orcamento_itens")
            .insert(registros_itens)
            .execute()
        )

    except Exception as erro:
        print(
            "ERRO AO SALVAR ITENS DO ORÇAMENTO:",
            erro
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "O orçamento foi criado, "
                "mas ocorreu um erro ao salvar "
                "os itens."
            )
        )

    if not resposta_itens_orcamento.data:
        raise HTTPException(
            status_code=500,
            detail=(
                "O orçamento foi criado, "
                "mas os itens não foram salvos."
            )
        )

    return {
        "mensagem": "Orçamento criado com sucesso!",
        "orcamento": {
            "id": orcamento_id,
            "numero": numero,
            "numero_formatado": f"{numero:06d}",
            "status": "rascunho",
            "cliente_id": dados.cliente_id,
            "subtotal": subtotal,
            "desconto": desconto,
            "total": total,
            "validade": dados.validade,
            "observacoes": dados.observacoes,
            "token_publico": token_publico,
            "itens": itens_processados
        }
    }


# ============================================================
# ATUALIZAR ORÇAMENTO
# ============================================================

@app.put("/orcamentos/{orcamento_id}")
def atualizar_orcamento(
    orcamento_id: str,
    dados: AtualizarOrcamento,
    autenticacao=Depends(
        obter_cliente_supabase_autenticado
    )
):
    supabase_usuario, usuario = autenticacao

    if not dados.itens:
        raise HTTPException(
            status_code=400,
            detail="O orçamento precisa ter pelo menos um item."
        )

    # --------------------------------------------------------
    # IMPEDIR ITEM DUPLICADO
    # --------------------------------------------------------

    ids_itens_recebidos = [
        item.item_id
        for item in dados.itens
    ]

    if len(ids_itens_recebidos) != len(
        set(ids_itens_recebidos)
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "O mesmo item aparece mais de uma vez "
                "neste orçamento. Remova a duplicata "
                "antes de salvar."
            )
        )

    empresa = obter_empresa_usuario(
        supabase_usuario,
        usuario["id"]
    )

    empresa_id = empresa["id"]

    # --------------------------------------------------------
    # VERIFICAR SE O ORÇAMENTO EXISTE
    # E PERTENCE À EMPRESA
    # --------------------------------------------------------

    try:
        resposta_orcamento = (
            supabase_usuario
            .table("orcamentos")
            .select(
                "id, numero, status, empresa_id, "
                "cliente_id, token_publico"
            )
            .eq("id", orcamento_id)
            .eq("empresa_id", empresa_id)
            .execute()
        )

    except Exception as erro:
        print("ERRO AO BUSCAR ORÇAMENTO:", erro)

        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar o orçamento."
        )

    orcamentos = (
        resposta_orcamento.data or []
    )

    if not orcamentos:
        raise HTTPException(
            status_code=404,
            detail="Orçamento não encontrado."
        )

    orcamento_atual = orcamentos[0]

    # --------------------------------------------------------
    # CLIENTE
    # --------------------------------------------------------

    try:
        resposta_cliente = (
            supabase_usuario
            .table("clientes")
            .select(
                "id, nome, empresa_id"
            )
            .eq(
                "id",
                dados.cliente_id
            )
            .eq(
                "empresa_id",
                empresa_id
            )
            .eq(
                "ativo",
                True
            )
            .execute()
        )

    except Exception as erro:
        print("ERRO AO BUSCAR CLIENTE:", erro)

        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar o cliente."
        )

    clientes = (
        resposta_cliente.data or []
    )

    if not clientes:
        raise HTTPException(
            status_code=404,
            detail=(
                "Cliente não encontrado "
                "ou não pertence à empresa."
            )
        )

    # --------------------------------------------------------
    # ITENS
    # --------------------------------------------------------

    ids_itens = [
        item.item_id
        for item in dados.itens
    ]

    try:
        resposta_itens = (
            supabase_usuario
            .table("itens")
            .select(
                "id, nome, descricao, "
                "valor, empresa_id"
            )
            .eq(
                "empresa_id",
                empresa_id
            )
            .eq(
                "ativo",
                True
            )
            .in_(
                "id",
                ids_itens
            )
            .execute()
        )

    except Exception as erro:
        print("ERRO AO BUSCAR ITENS:", erro)

        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar os itens."
        )

    itens_cadastrados = (
        resposta_itens.data or []
    )

    itens_por_id = {
        item["id"]: item
        for item in itens_cadastrados
    }

    for item in dados.itens:
        if item.item_id not in itens_por_id:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"O item {item.item_id} "
                    "não foi encontrado, está inativo "
                    "ou não pertence à empresa."
                )
            )

    # --------------------------------------------------------
    # CALCULAR VALORES
    # --------------------------------------------------------

    subtotal = 0
    itens_processados = []

    for item in dados.itens:
        valor_total = (
            item.quantidade *
            item.valor_unitario
        )

        subtotal += valor_total

        item_cadastrado = (
            itens_por_id[item.item_id]
        )

        itens_processados.append({
            "item_id": item.item_id,
            "nome": item_cadastrado["nome"],
            "descricao": item_cadastrado["descricao"],
            "quantidade": item.quantidade,
            "valor_unitario": item.valor_unitario,
            "valor_total": round(
                valor_total,
                2
            )
        })

    subtotal = round(
        subtotal,
        2
    )

    desconto = round(
        dados.desconto,
        2
    )

    total = round(
        subtotal - desconto,
        2
    )

    if total < 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "O desconto não pode ser maior "
                "que o subtotal."
            )
        )

    # --------------------------------------------------------
    # ATUALIZAR ORÇAMENTO
    # --------------------------------------------------------

    dados_atualizacao = {
        "cliente_id": dados.cliente_id,
        "subtotal": subtotal,
        "desconto": desconto,
        "total": total,
        "validade": dados.validade,
        "observacoes": dados.observacoes
    }

    try:
        resposta_update = (
            supabase_usuario
            .table("orcamentos")
            .update(dados_atualizacao)
            .eq(
                "id",
                orcamento_id
            )
            .eq(
                "empresa_id",
                empresa_id
            )
            .execute()
        )

    except Exception as erro:
        print(
            "ERRO AO ATUALIZAR ORÇAMENTO:",
            erro
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Não foi possível atualizar "
                "o orçamento."
            )
        )

    if not resposta_update.data:
        raise HTTPException(
            status_code=500,
            detail=(
                "O orçamento não foi atualizado."
            )
        )

    # --------------------------------------------------------
    # REMOVER ITENS ANTIGOS
    # --------------------------------------------------------

    try:
        (
            supabase_usuario
            .table("orcamento_itens")
            .delete()
            .eq(
                "orcamento_id",
                orcamento_id
            )
            .execute()
        )

    except Exception as erro:
        print(
            "ERRO AO REMOVER ITENS ANTIGOS:",
            erro
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "O orçamento foi atualizado, "
                "mas ocorreu um erro ao substituir "
                "os itens."
            )
        )

    # --------------------------------------------------------
    # INSERIR NOVOS ITENS
    # --------------------------------------------------------

    registros_itens = []

    for item in itens_processados:
        registros_itens.append({
            "orcamento_id": orcamento_id,
            "item_id": item["item_id"],
            "nome": item["nome"],
            "descricao": item["descricao"],
            "quantidade": item["quantidade"],
            "valor_unitario": item["valor_unitario"],
            "valor_total": item["valor_total"]
        })

    try:
        resposta_itens = (
            supabase_usuario
            .table("orcamento_itens")
            .insert(registros_itens)
            .execute()
        )

    except Exception as erro:
        print(
            "ERRO AO INSERIR NOVOS ITENS:",
            erro
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "O orçamento foi atualizado, "
                "mas ocorreu um erro ao salvar "
                "os novos itens."
            )
        )

    if not resposta_itens.data:
        raise HTTPException(
            status_code=500,
            detail=(
                "O orçamento foi atualizado, "
                "mas os novos itens não foram salvos."
            )
        )

    return {
        "mensagem": "Orçamento atualizado com sucesso!",
        "orcamento": {
            "id": orcamento_id,
            "numero": orcamento_atual["numero"],
            "numero_formatado": (
                f"{orcamento_atual['numero']:06d}"
            ),
            "status": orcamento_atual["status"],
            "cliente_id": dados.cliente_id,
            "subtotal": subtotal,
            "desconto": desconto,
            "total": total,
            "validade": dados.validade,
            "observacoes": dados.observacoes,
            "token_publico": (
                orcamento_atual["token_publico"]
            ),
            "itens": itens_processados
        }
    }

# ============================================================
# ASSINATURA PLUS - MERCADO PAGO
# ============================================================

@app.post("/assinaturas/plus")
def criar_assinatura_plus(
    autenticacao=Depends(obter_cliente_supabase_autenticado)
):
    """Cria uma assinatura mensal pendente e devolve o link de autorização."""
    exigir_configuracao_assinaturas()
    if not mercado_pago_webhook_url:
        raise HTTPException(
            status_code=503,
            detail="MERCADO_PAGO_WEBHOOK_URL não está configurada. Inicie o túnel HTTPS e configure a URL antes de criar assinaturas.",
        )
    supabase_usuario, usuario = autenticacao
    empresa = obter_empresa_usuario(supabase_usuario, usuario["id"])
    empresa_id = empresa["id"]

    # Evita criar várias assinaturas pendentes/autorizadas para a mesma empresa.
    try:
        existentes = (
            supabase_admin.table("assinaturas")
            .select("id, status, referencia_externa, url_autorizacao, mercadopago_assinatura_id")
            .eq("empresa_id", empresa_id)
            .in_("status", ["pending", "authorized", "paused"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        ).data or []
    except Exception as erro:
        print("ERRO AO CONSULTAR ASSINATURAS EXISTENTES:", erro)
        raise HTTPException(status_code=500, detail="Não foi possível consultar as assinaturas existentes.")

    if existentes:
        assinatura_existente = existentes[0]
        status_existente = assinatura_existente.get("status")

        # Regra definida para o produto: uma assinatura pausada bloqueia
        # uma nova contratação até que a situação seja resolvida no Mercado Pago.
        # Isso evita criar outra assinatura e possíveis cobranças duplicadas.
        if status_existente == "paused":
            raise HTTPException(
                status_code=409,
                detail=(
                    "Sua assinatura Plus está pausada no Mercado Pago. "
                    "Resolva a situação da assinatura existente antes de "
                    "iniciar uma nova contratação. Nenhuma nova assinatura foi criada."
                ),
            )

        if status_existente == "authorized":
            return {
                "mensagem": "A empresa já possui uma assinatura Plus autorizada.",
                "status": "authorized",
                "url_autorizacao": assinatura_existente.get("url_autorizacao"),
            }
        if assinatura_existente.get("status") == "pending" and assinatura_existente.get("url_autorizacao"):
            return {
                "mensagem": "Já existe uma assinatura aguardando autorização.",
                "status": "pending",
                "url_autorizacao": assinatura_existente["url_autorizacao"],
            }

        # Se a tentativa anterior deixou um registro pendente sem link, não criamos
        # outra assinatura imediatamente. Primeiro procuramos no Mercado Pago pela
        # referência externa original, que funciona como vínculo com nosso registro.
        if assinatura_existente.get("status") == "pending":
            referencia_pendente = assinatura_existente.get("referencia_externa")
            if not referencia_pendente:
                print("ASSINATURA PENDENTE SEM REFERÊNCIA EXTERNA:", assinatura_existente.get("id"))
                raise HTTPException(
                    status_code=503,
                    detail="Existe uma assinatura pendente sem referência externa. É necessária uma verificação antes de tentar novamente.",
                )

            caminho_busca = "/preapproval/search?" + urllib.parse.urlencode({"q": referencia_pendente})
            try:
                resultado_busca = requisicao_mercado_pago("GET", caminho_busca)
            except HTTPException:
                # Falha na consulta não prova que a assinatura inexiste.
                raise HTTPException(
                    status_code=503,
                    detail="Não foi possível verificar se a assinatura anterior foi criada. Tente novamente mais tarde; nenhuma nova assinatura foi criada.",
                )

            resultados = resultado_busca.get("results") or []
            correspondencias = [
                item for item in resultados
                if str(item.get("external_reference", "")) == str(referencia_pendente)
            ]

            if len(correspondencias) > 1:
                print("MAIS DE UMA ASSINATURA NO MERCADO PAGO PARA A MESMA REFERÊNCIA:", referencia_pendente)
                raise HTTPException(
                    status_code=503,
                    detail="Foram encontradas várias assinaturas para a mesma referência. É necessária uma verificação antes de continuar.",
                )

            if not correspondencias:
                # A busca pode não refletir imediatamente uma criação recente. Por
                # segurança, não criamos outra assinatura automaticamente aqui.
                raise HTTPException(
                    status_code=503,
                    detail="A assinatura anterior ainda não foi localizada no Mercado Pago. Tente novamente mais tarde; nenhuma nova assinatura foi criada para evitar duplicidade.",
                )

            assinatura_mp_recuperada = correspondencias[0]
            mp_id_recuperado = assinatura_mp_recuperada.get("id")
            url_recuperada = (
                assinatura_mp_recuperada.get("init_point")
                or assinatura_mp_recuperada.get("sandbox_init_point")
            )
            status_recuperado = str(assinatura_mp_recuperada.get("status", "")).lower()

            if mp_id_recuperado and not url_recuperada:
                try:
                    detalhe_mp = requisicao_mercado_pago("GET", f"/preapproval/{mp_id_recuperado}")
                    # Só aceitamos o detalhe se ele confirmar a mesma referência.
                    if str(detalhe_mp.get("external_reference", "")) == str(referencia_pendente):
                        url_recuperada = detalhe_mp.get("init_point") or detalhe_mp.get("sandbox_init_point")
                        status_recuperado = str(detalhe_mp.get("status", status_recuperado)).lower()
                except HTTPException:
                    # Não criamos outra assinatura se a consulta de detalhe falhar.
                    raise HTTPException(
                        status_code=503,
                        detail="A assinatura foi localizada, mas não foi possível recuperar seus dados. Tente novamente mais tarde.",
                    )

            if not mp_id_recuperado or not url_recuperada:
                print("ASSINATURA LOCALIZADA NO MERCADO PAGO, MAS SEM ID OU LINK:", referencia_pendente)
                raise HTTPException(
                    status_code=503,
                    detail="A assinatura foi localizada, mas o Mercado Pago não retornou todos os dados necessários. Tente novamente mais tarde.",
                )

            # Não ativamos o Plus aqui: a ativação continua dependendo do webhook validado.
            try:
                supabase_admin.table("assinaturas").update({
                    "mercadopago_assinatura_id": str(mp_id_recuperado),
                    "url_autorizacao": url_recuperada,
                    "status": "pending",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", assinatura_existente["id"]).execute()
            except Exception as erro:
                print("ERRO AO RECUPERAR REGISTRO DE ASSINATURA:", erro)
                raise HTTPException(
                    status_code=500,
                    detail="A assinatura foi localizada no Mercado Pago, mas não foi possível atualizar o registro local.",
                )

            return {
                "mensagem": "Recuperamos a assinatura anterior. Abra o link para autorizar a cobrança mensal.",
                "status": "pending",
                "url_autorizacao": url_recuperada,
                "public_key": mercado_pago_public_key,
            }

    referencia = "orcplus_" + secrets.token_urlsafe(24)
    registro = {
        "empresa_id": empresa_id,
        "plano_id": plano_plus_id,
        "provedor": "mercado_pago",
        "status": "pending",
        "referencia_externa": referencia,
        "email_pagador": usuario.get("email"),
        "valor_mensal": 19.90,
        "moeda": "BRL",
    }

    try:
        supabase_admin.table("assinaturas").insert(registro).execute()
    except Exception as erro:
        print("ERRO AO REGISTRAR ASSINATURA PENDENTE:", erro)
        raise HTTPException(status_code=500, detail="Não foi possível iniciar a assinatura.")

    payload = {
        "reason": "Orçamentos Online Plus - assinatura mensal",
        "external_reference": referencia,
        "payer_email": usuario.get("email"),
        "auto_recurring": {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": 19.90,
            "currency_id": "BRL",
        },
        "back_url": f"{app_frontend_url}/assinatura/retorno",
        "notification_url": mercado_pago_webhook_url,
        "status": "pending",
    }

    try:
        resposta_mp = requisicao_mercado_pago("POST", "/preapproval", payload)
    except HTTPException:
        # O registro pendente fica guardado para auditoria; não libera o Plus.
        raise

    mp_id = resposta_mp.get("id")
    url_autorizacao = resposta_mp.get("init_point") or resposta_mp.get("sandbox_init_point")
    status_mp = resposta_mp.get("status", "pending")

    if not mp_id or not url_autorizacao:
        print("RESPOSTA INCOMPLETA DO MERCADO PAGO:", resposta_mp)
        raise HTTPException(status_code=502, detail="O Mercado Pago não retornou o link de autorização esperado.")

    try:
        supabase_admin.table("assinaturas").update({
            "mercadopago_assinatura_id": str(mp_id),
            "url_autorizacao": url_autorizacao,
            # A autorização efetiva do plano é aplicada exclusivamente pelo webhook validado.
            "status": "pending",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("referencia_externa", referencia).execute()
    except Exception as erro:
        print("ERRO AO ATUALIZAR REGISTRO DA ASSINATURA:", erro)
        # Não libera o plano se o registro não foi atualizado.
        raise HTTPException(status_code=500, detail="A assinatura foi criada no Mercado Pago, mas não foi possível atualizar o registro local.")

    # Mesmo que a API retorne status authorized, a ativação é feita pelo webhook validado.
    return {
        "mensagem": "Assinatura criada. Abra o link para autorizar a cobrança mensal.",
        "status": "pending",
        "url_autorizacao": url_autorizacao,
        "public_key": mercado_pago_public_key,
    }


@app.get("/assinaturas/minha")
def obter_minha_assinatura(
    autenticacao=Depends(obter_cliente_supabase_autenticado)
):
    """Consulta a assinatura da empresa atual usando a sessão/RLS do usuário."""
    supabase_usuario, usuario = autenticacao
    empresa = obter_empresa_usuario(supabase_usuario, usuario["id"])
    try:
        resposta = (
            supabase_usuario.table("assinaturas")
            .select("id, plano_id, status, valor_mensal, moeda, url_autorizacao, created_at, updated_at")
            .eq("empresa_id", empresa["id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
    except Exception as erro:
        print("ERRO AO CONSULTAR MINHA ASSINATURA:", erro)
        raise HTTPException(status_code=500, detail="Não foi possível consultar a assinatura.")
    return {"assinatura": (resposta.data or [None])[0]}


@app.post("/webhooks/mercado-pago")
def webhook_mercado_pago(
    request: Request,
    payload: dict,
    x_signature: Optional[str] = Header(default=None, alias="x-signature"),
    x_request_id: Optional[str] = Header(default=None, alias="x-request-id"),
):
    """Recebe notificações de assinatura; valida assinatura HMAC e consulta a API oficial."""
    if not supabase_admin:
        raise HTTPException(status_code=503, detail="SUPABASE_SECRET_KEY não está configurada.")
    if not mercado_pago_access_token:
        raise HTTPException(status_code=503, detail="MERCADO_PAGO_ACCESS_TOKEN não está configurado.")
    if not mercado_pago_webhook_secret:
        raise HTTPException(status_code=503, detail="MERCADO_PAGO_WEBHOOK_SECRET não está configurada.")

    dados = payload.get("data") or {}
    data_id = request.query_params.get("data.id")
    tipo = payload.get("type") or payload.get("topic") or ""    
    if not data_id:
        raise HTTPException(status_code=400, detail="Notificação sem data.id.")

    # Aceita apenas eventos relacionados a assinaturas e cobranças recorrentes.
    if tipo not in {
        "subscription_preapproval",
        "preapproval",
        "subscription_authorized_payment",
    }:
        return {
            "recebido": True,
            "ignorado": True,
            "motivo": "Tipo de notificação não utilizado por esta rota.",
        }

    if not validar_assinatura_webhook(
        x_signature, x_request_id, str(data_id)
    ):
        raise HTTPException(
            status_code=401,
            detail="Assinatura do webhook inválida ou ausente.",
        )

    # Para notificações de cobrança recorrente, primeiro identificamos
    # a assinatura relacionada por meio do recurso de cobrança.
    if tipo == "subscription_authorized_payment":
        pagamento_mp = requisicao_mercado_pago(
            "GET", f"/authorized_payments/{str(data_id)}"
        )
        preapproval_id = pagamento_mp.get("preapproval_id")

        if not preapproval_id:
            print(
                "COBRANÇA SEM preapproval_id:",
                data_id,
            )
            return {
                "recebido": True,
                "ignorado": True,
                "motivo": "Cobrança sem identificação da assinatura.",
            }

        id_consulta = str(preapproval_id)
    else:
        id_consulta = str(data_id)

    # Nunca confiamos no status que vem no corpo do webhook:
    # consultamos o objeto de assinatura na API oficial.
    assinatura_mp = requisicao_mercado_pago(
        "GET", f"/preapproval/{id_consulta}"
    )
    referencia = assinatura_mp.get("external_reference")
    status_mp = str(assinatura_mp.get("status", "")).lower()
    mp_id = str(assinatura_mp.get("id", id_consulta))

    if not referencia:
        print("WEBHOOK SEM external_reference PARA A ASSINATURA:", mp_id)
        return {
            "recebido": True,
            "ignorado": True,
            "motivo": "Assinatura sem referência externa.",
        }

    mapa_status = {
        "authorized": "authorized",
        "pending": "pending",
        "paused": "paused",
        "cancelled": "canceled",
        "canceled": "canceled",
        "rejected": "rejected",
        "expired": "expired",
    }

    status_local = mapa_status.get(status_mp)
    if not status_local:
        print("STATUS MERCADO PAGO NÃO MAPEADO:", status_mp)
        return {"recebido": True, "ignorado": True, "motivo": "Status de assinatura não reconhecido."}

    try:
        resposta_local = (
            supabase_admin.table("assinaturas")
            .select("id, empresa_id, plano_id")
            .eq("referencia_externa", referencia)
            .eq("mercadopago_assinatura_id", mp_id)
            .limit(1)
            .execute()
        )
        registros = resposta_local.data or []
    except Exception as erro:
        print("ERRO AO LOCALIZAR ASSINATURA PARA WEBHOOK:", erro)
        raise HTTPException(status_code=500, detail="Não foi possível localizar a assinatura no banco.")

    if not registros:
        # Não cria registros a partir de notificações desconhecidas.
        print("ASSINATURA DO WEBHOOK NÃO ENCONTRADA:", mp_id, referencia)
        return {"recebido": True, "ignorado": True, "motivo": "Assinatura não encontrada no banco."}

    registro = registros[0]
    try:
        # Atualiza o status local sem apagar inicio_em em notificações que não
        # representam uma nova autorização.
        atualizacao_assinatura = {
            "status": status_local,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if status_local == "authorized":
            atualizacao_assinatura["inicio_em"] = assinatura_mp.get("date_created") or datetime.now(timezone.utc).isoformat()

        supabase_admin.table("assinaturas").update(
            atualizacao_assinatura
        ).eq("id", registro["id"]).execute()

        # Uma assinatura autorizada pode ativar o PLUS.
        if status_local == "authorized":
            supabase_admin.table("empresas").update({
                "plano_id": plano_plus_id,
            }).eq("id", registro["empresa_id"]).execute()

        # Não rebaixa por estados temporários (pending, paused ou rejected).
        # Em cancelamento/expiração, só volta ao gratuito se não existir outra
        # assinatura autorizada para a mesma empresa.
        elif status_local in {"canceled", "expired"}:
            resposta_outras = (
                supabase_admin.table("assinaturas")
                .select("id")
                .eq("empresa_id", registro["empresa_id"])
                .eq("status", "authorized")
                .neq("id", registro["id"])
                .limit(1)
                .execute()
            )
            outras_ativas = resposta_outras.data or []
            if not outras_ativas:
                supabase_admin.table("empresas").update({
                    "plano_id": plano_gratuito_id,
                }).eq("id", registro["empresa_id"]).execute()

    except HTTPException:
        raise
    except Exception as erro:
        print("ERRO AO APLICAR STATUS DA ASSINATURA:", erro)
        raise HTTPException(status_code=500, detail="Não foi possível atualizar o plano da empresa.")

    return {"recebido": True, "status_assinatura": status_local}