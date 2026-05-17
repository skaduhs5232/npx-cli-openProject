import { Command } from 'commander';
import { registerLoginCommand } from './commands/login';
import { registerInitCommand } from './commands/init';
import { registerSyncCommand } from './commands/sync';

const program = new Command();

program
  .name('op-tasks')
  .description('CLI para sincronizar tarefas do Open Project localmente')
  .version('1.0.0');

registerLoginCommand(program);
registerInitCommand(program);
registerSyncCommand(program);

program.parse();
