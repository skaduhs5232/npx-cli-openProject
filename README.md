# Open Project Tasks CLI (op-tasks)

Uma interface de linha de comando (CLI) simples para baixar e sincronizar suas tarefas do [Open Project](https://www.openproject.org/) com arquivos Markdown (MD) locais.

## Instalação e Execução

Você não precisa instalar o pacote de forma permanente, basta usar o `npx` para baixar e executar a versão mais recente em qualquer diretório:

```bash
npx op-tasks-cli [comando]
```

## Como Usar

### 1. Login
O primeiro passo é fazer o login para salvar sua URL do servidor e seu Token de API localmente na sua máquina. O Token é salvo de forma segura no seu diretório `home`.

Para gerar um Token, vá no seu Open Project > "Minha Conta" (My Account) > "Tokens de Acesso" (Access tokens) > API.

```bash
npx op-tasks-cli login <sua-url-do-open-project> <seu-token-api>
```
*Exemplo:* `npx op-tasks-cli login https://projetos.minhaempresa.com.br abc123def456`

### 2. Inicializar um Diretório
Vá até a pasta do seu computador onde você deseja salvar e gerenciar suas tarefas e inicialize a estrutura:

```bash
npx op-tasks-cli init
```
Isso criará uma pasta oculta chamada `.tasksOP` no diretório atual. É aqui que todos os seus arquivos Markdown serão armazenados.

### 3. Sincronizar (Download & Upload)
Para baixar novas tarefas ou enviar atualizações para o Open Project, use:

```bash
npx op-tasks-cli sync
```

**Como a sincronização funciona:**
- **Download:** Se houver novas tarefas atribuídas a você no Open Project, a CLI fará o download e criará os arquivos Markdown correspondentes na pasta `.tasksOP`.
- **Upload:** Se você alterar o status de uma tarefa no arquivo local para um status de conclusão (ex: `Closed`, `Concluída`, `Done`), a CLI avisará o Open Project e fechará a tarefa lá também!

## Formato dos Arquivos

Cada tarefa é salva como um arquivo Markdown com metadados (_Frontmatter_) no topo. Exemplo:

```yaml
---
id: 1234
subject: Corrigir bug no formulário de contato
status: In progress
lockVersion: 3
updatedAt: 2026-05-17T02:00:00Z
---
Descrição da tarefa que veio do Open Project.
Você pode fazer anotações aqui.
```

Se quiser marcar a tarefa como concluída no sistema, basta alterar a linha `status:` para `Concluída` e rodar `npx op-tasks-cli sync`.
