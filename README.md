# Biblioteca de Mapas para Campanhas Longas — Foundry VTT v14

Módulo system-agnostic para criar uma biblioteca de **cenas** em compendiums separados por categoria. A fonte inicial é o repositório público `mbround18/vtt-maps`, que disponibiliza mapas em Universal VTT (`.dd2vtt`).

## Como funciona

1. Ative o módulo como GM.
2. Na primeira abertura, ele consulta a árvore pública da fonte e cria compendiums `Mapas — ...`.
3. Cada entrada é uma cena leve com metadados da fonte; a imagem pesada não fica no módulo.
4. Importe/arraste uma cena do compendium para o seu mundo.
5. O módulo baixa o `.dd2vtt`, extrai a imagem para `Data/worlds/<seu-mundo>/long-campaign-map-library/...` e cria grade, paredes, portas e luzes.
6. Use **Sincronizar Mapas** no rodapé da aba Cenas para buscar novos mapas adicionados à fonte.

## Categorias

- Florestas e Bosques
- Cidades, Vilas e Ruas
- Pântanos, Brejos e Mangues
- Tavernas, Estalagens e Pubs
- Hotéis e Hospedarias
- Masmorras, Criptas e Tumbas
- Cavernas, Minas e Subterrâneos
- Ruínas, Templos e Santuários
- Castelos, Fortalezas e Torres
- Estradas, Pontes, Acampamentos e Viagem
- Praias, Costas, Portos e Navios
- Desertos e Terras Áridas
- Tundra, Neve e Gelo
- Casas, Prédios e Interiores
- Encontros Genéricos
- Moderno, Sci-Fi e Cyberpunk
- Locações Especiais
- Outros Mapas

## Compatibilidade

- Foundry VTT: mínimo 14, verificado 14, máximo 14.
- Sistema: qualquer sistema (Scenes são documentos agnósticos ao sistema).
- O módulo `dd-import` (Universal Battlemap Importer) é apenas **recomendado**, não obrigatório.

## Direitos autorais e fonte

Este pacote **não redistribui as imagens dos mapas**. Ele funciona como um catálogo/importador e busca os arquivos diretamente da fonte pública quando o GM decide importar uma cena. Direitos, licenças e atribuições dos mapas/assets continuam pertencendo aos respectivos autores/fontes. O repositório de origem atualmente não expõe uma licença de repositório inequívoca no metadata do GitHub; por isso os mapas não foram empacotados dentro deste ZIP.

Se você pretende redistribuir, publicar streams comerciais ou vender conteúdo derivado, confira a licença/atribuição de cada fonte antes.

## Atualização manual pelo console

```js
await game.modules.get("long-campaign-map-library").api.syncCatalog();
```

## Manifest público

Para instalação por Manifest URL, publique estes arquivos em um repositório/servidor HTTPS e adicione os campos `manifest` e `download` ao `module.json`. Um modelo está em `module.manifest-template.json`.

## Estrutura dos ZIPs entregues

- `long-campaign-map-library-manual.zip`: contém a pasta `long-campaign-map-library/`; extraia diretamente em `Data/modules/`.
- `long-campaign-map-library-release.zip`: contém `module.json` na raiz do ZIP; este é o arquivo ideal para servir no campo `download` de um manifest público.
