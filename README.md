# Site convertido para Jekyll

Este repositório contém a versão do seu site estruturada para Jekyll, pronta para ser publicada no GitHub Pages.

Passos rápidos para deploy no GitHub Pages

1. Atualize `_config.yml` com a URL do seu repositório:

   - Altere `url: "https://github.com/SEU_USUARIO/SEU_REPOSITORIO"` para a URL correta.

2. Confirme os arquivos estáticos

   - CSS: `assets/css/styles.css` (já movido)
   - Ícones/imagens: `assets/icons/…` (já existe)

3. Branch e configuração do GitHub Pages

   - Faça commit e envie para o repositório no GitHub:

```bash
git add .
git commit -m "Configuração inicial Jekyll + mover assets"
git push origin main
```

   - No GitHub: vá em Settings → Pages e selecione o branch (`main` ou `gh-pages`) e a pasta `/ (root)` para publicar.

4. URLs e links

   - O Jekyll usa `{{ '/assets/css/styles.css' | relative_url }}` no layout. Não é necessário alterar links manuais se estiverem usando `relative_url`.

5. Como escrever posts

   - Crie arquivos Markdown em `_posts/` com o formato `YYYY-MM-DD-titulo.md` e front matter YAML (ex.: `layout: post`, `title:`).

6. Testar localmente (opcional)

   - Instale Jekyll (requer Ruby):

```bash
gem install bundler jekyll
jekyll serve
```

   - Abra `http://localhost:4000` para ver o site.

Notas

- Mantive `index.html`, `blog.html`, `curriculo.html` e `contato.html` como páginas com front matter para que usem `_layouts/default.html`.
- Convertemos também as versões em inglês para usar o layout: `index_en.html`, `blog_en.html`, `curriculo_en.html`, `contact_en.html`.

Rotas em inglês (URLs locais/produÃ§Ã£o):

- Home (EN): `/en/`
- Blog (EN): `/en/blog/`
- Resume (EN): `/en/resume/`
- Contact (EN): `/en/contact/`

Exemplo de URL pública (substitua pelo seu domínio GitHub Pages):

```
https://thiago-orbite-barreto.github.io/site-pessoal/en/
```

Se quiser, atualizo este README com instruções adicionais sobre internacionalização (ex.: configuração de redirecionamentos, tags hreflang) ou faço o commit/push para você.
