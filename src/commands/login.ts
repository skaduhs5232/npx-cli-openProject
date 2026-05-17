import { Command } from 'commander';
import chalk from 'chalk';
import { saveConfig } from '../utils/config';

export function registerLoginCommand(program: Command) {
  program
    .command('login')
    .description('Configurar a URL e o Token do Open Project')
    .argument('<url>', 'A URL base do seu servidor Open Project (ex: https://openproject.empresa.com)')
    .argument('<token>', 'O token de API (apikey) gerado no Open Project')
    .action((url: string, token: string) => {
      saveConfig({ url, token });
      console.log(chalk.green('✔ Configuração salva com sucesso!'));
      console.log(chalk.gray(`URL: ${url}`));
      console.log(chalk.gray('Token salvo de forma segura.'));
    });
}
