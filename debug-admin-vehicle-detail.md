# Debug Session: admin-vehicle-detail
- **Status**: [OPEN]
- **Issue**: Ao clicar em "Analisar" no menu de veiculos do admin, a tela de detalhe nao carrega e mostra erro ao inves dos dados do veiculo.
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-admin-vehicle-detail.ndjson

## Reproduction Steps
1. Acessar `Admin > Veiculos`.
2. Clicar em `Analisar` em um veiculo listado.
3. Aguardar o carregamento da tela de detalhe.
4. Observar a mensagem de erro no lugar dos dados do veiculo.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | O `id` recebido na rota de detalhe chega com formato diferente do UUID esperado na server function. | High | Low | Rejected |
| B | A query do detalhe falha por causa do `LEFT JOIN profiles p ON p.id = v.perfil_id OR p.id = v.vendedor_id`, gerando erro de consulta e a UI trata como falha genérica. | High | Medium | Inconclusive |
| C | O detalhe encontra o veiculo, mas quebra depois ao buscar `logs` ou ao calcular `progresso/validacao`. | Medium | Medium | Rejected |
| D | A lista de veiculos exibe registros que nao existem mais na tabela `veiculos` usada pelo detalhe. | Low | Medium | Rejected |

## Log Evidence
- `trae-debug-log-admin-vehicle-detail.ndjson`: o `id` recebido na rota foi `ddd988ae-47e1-4699-ba71-d77a427062e1`, valido e consistente em multiplas reproducoes.
- `trae-debug-log-admin-vehicle-detail.ndjson`: a falha aconteceu durante a query SQL principal do detalhe, antes de qualquer pos-processamento.
- Logs do EasyPanel mostraram apenas `NOTICE` de colunas ja existentes em `veiculos`; esses avisos nao sao o erro raiz do detalhe.

## Verification Conclusion
- O `id` da rota esta correto.
- A quebra esta na consulta SQL do detalhe do veiculo.
- Foi identificado um erro objetivo na query: o subselect em `contratos` ordenava por `criado_em`, mas o schema de `contratos` usa `gerado_em` e `atualizado_em`.
- Foi aplicada correcao trocando a ordenacao para `ORDER BY atualizado_em DESC NULLS LAST, gerado_em DESC NULLS LAST` nos dois pontos do fluxo admin de detalhe/validacao.
