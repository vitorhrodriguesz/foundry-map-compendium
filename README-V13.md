# Biblioteca de Mapas para Campanhas Longas — Foundry VTT v13

Módulo para Foundry Virtual Tabletop v13 que cria uma biblioteca de mapas Universal VTT organizada por categorias.

## Instalação

Manifest URL:

`https://raw.githubusercontent.com/vitorhrodriguesz/foundry-map-compendium/main/module.json`

## Compatibilidade

- Foundry VTT: v13 (verificado contra a API 13.350)
- Usa o background padrão de Scene do v13.
- Importa grade, paredes, portas e luzes de arquivos `.dd2vtt`.
- Não depende do Universal Battlemap Importer.

## Uso

1. Ative o módulo no mundo.
2. Como GM, abra a aba **Cenas**.
3. Use **Sincronizar Mapas** para atualizar o catálogo.
4. Abra os Compendiums de mapas por categoria.
5. Importe uma Scene do compendium para o mundo.
6. O módulo baixa o `.dd2vtt`, extrai a imagem e cria a Scene pronta para uso.

Os arquivos de imagem importados são salvos em `Data/worlds/<seu-mundo>/long-campaign-map-library/`.
