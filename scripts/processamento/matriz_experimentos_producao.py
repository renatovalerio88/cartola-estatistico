"""Consolida decisões científicas já persistidas no repositório sem inventar resultados."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'data'

def ler(nome):
    p=DATA/nome
    if not p.exists(): return None
    try: return json.loads(p.read_text(encoding='utf-8'))
    except Exception: return None

fontes={
 'torneio_selecao':'torneio-selecao-jogadores.json',
 'capitao':'validacao-integracao-capitao.json',
 'adaptativa':'decisao-estrategia-adaptativa.json',
 'motor_final':'auditoria-bloco-final-motor.json',
 'site_final':'auditoria-site-completo.json',
 'criterios_posicao':'auditoria-criterios-por-posicao.json',
}
dados={k:ler(v) for k,v in fontes.items()}
matriz={
 'capitao_posicional': {'status':'PRODUTIVO' if (dados['capitao'] or {}).get('aprovado') else 'NAO_APROVADO','evidencia':fontes['capitao']},
 'torneio_selecao_11': {'status':'MANTER_BASELINE','evidencia':fontes['torneio_selecao']},
 'estrategia_adaptativa_v2': {'status':(dados['adaptativa'] or {}).get('decisao','SEM_DECISAO'),'evidencia':fontes['adaptativa']},
 'motor_final': {'status':'PRODUTIVO' if (dados['motor_final'] or {}).get('aprovado') else 'NAO_APROVADO','evidencia':fontes['motor_final']},
 'criterios_por_posicao': {'status':'CANDIDATO_VALIDADO_ESTRUTURALMENTE' if (dados['criterios_posicao'] or {}).get('aprovado') else 'EM_VALIDACAO','evidencia':fontes['criterios_posicao']},
}
resultado={'modelo':'matriz_experimentos_producao_v1','fontesDisponiveis':{k:v is not None for k,v in dados.items()},'matriz':matriz}
(DATA/'matriz-experimentos-producao.json').write_text(json.dumps(resultado,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(resultado,ensure_ascii=False,indent=2))
