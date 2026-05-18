import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { checkbox } from '@inquirer/prompts';
import { initTasksDir } from '../utils/fileSync';
import { getConfig, saveLocalConfig } from '../utils/config';
import { OpenProjectService } from '../services/openProject';

export function registerInitCommand(program: Command) {
  program
    .command('init')
    .description(
      'Inicializa o diretório .tasksOP e permite escolher quais projetos sincronizar'
    )
    .action(async () => {
      const config = getConfig();
      if (!config) {
        console.log(
          chalk.red(
            '✖ Nenhuma configuração encontrada. Execute "op-tasks login <url> <token>" primeiro.'
          )
        );
        return;
      }

      const created = initTasksDir();
      if (created) {
        console.log(chalk.green('✔ Diretório .tasksOP criado com sucesso!'));
      } else {
        console.log(
          chalk.yellow('⚠ Diretório .tasksOP já existe neste local. Atualizando seleção de projetos...')
        );
      }

      const spinner = ora('Buscando projetos do Open Project...').start();
      const opService = new OpenProjectService(config);

      let projects;
      try {
        projects = await opService.getMyProjects();
        spinner.succeed(chalk.green(`Encontrados ${projects.length} projeto(s).`));
      } catch (error: any) {
        spinner.fail(chalk.red('Falha ao buscar projetos.'));
        console.error(chalk.red(error.message || error));
        if (error.response) {
          console.error(chalk.gray(`Status: ${error.response.status}`));
        }
        return;
      }

      if (projects.length === 0) {
        console.log(
          chalk.yellow(
            '⚠ Você não é membro de nenhum projeto no Open Project. Nada a sincronizar.'
          )
        );
        return;
      }

      let selectedIds: number[];
      try {
        selectedIds = await checkbox<number>({
          message: 'Selecione os projetos que deseja sincronizar localmente:',
          choices: projects.map((p) => ({
            name: `${p.name} (${p.identifier})`,
            value: p.id,
          })),
          required: true,
          pageSize: 15,
        });
      } catch (error: any) {
        // Usuário cancelou (Ctrl+C)
        console.log(chalk.yellow('\n⚠ Seleção cancelada.'));
        return;
      }

      const selectedProjects = projects
        .filter((p) => selectedIds.includes(p.id))
        .map((p) => ({ id: p.id, name: p.name, identifier: p.identifier }));

      saveLocalConfig({ projects: selectedProjects });

      console.log(
        chalk.green(
          `✔ ${selectedProjects.length} projeto(s) selecionado(s). Execute "op-tasks sync" para baixar as tarefas.`
        )
      );
      selectedProjects.forEach((p) => {
        console.log(chalk.gray(`  • ${p.name}`));
      });
    });
}
