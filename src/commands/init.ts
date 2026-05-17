import { Command } from 'commander';
import chalk from 'chalk';
import { initTasksDir } from '../utils/fileSync';

export function registerInitCommand(program: Command) {
  program
    .command('init')
    .description('Inicializar o diretório de tarefas (.tasksOP) no diretório atual')
    .action(() => {
      const created = initTasksDir();
      if (created) {
        console.log(chalk.green('✔ Diretório .tasksOP criado com sucesso!'));
      } else {
        console.log(chalk.yellow('⚠ Diretório .tasksOP já existe neste local.'));
      }
    });
}
