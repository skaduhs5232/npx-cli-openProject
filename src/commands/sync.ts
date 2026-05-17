import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig } from '../utils/config';
import { checkTasksDir, getLocalTasks, saveTaskLocally } from '../utils/fileSync';
import { OpenProjectService, WorkPackage } from '../services/openProject';

export function registerSyncCommand(program: Command) {
  program
    .command('sync')
    .description('Sincroniza tarefas do Open Project com a pasta local .tasksOP')
    .action(async () => {
      const config = getConfig();
      if (!config) {
        console.log(chalk.red('✖ Nenhuma configuração encontrada. Execute "op-tasks login <url> <token>" primeiro.'));
        return;
      }

      if (!checkTasksDir()) {
        console.log(chalk.yellow('⚠ Diretório .tasksOP não encontrado. Execute "op-tasks init" primeiro.'));
        return;
      }

      const spinner = ora('Iniciando sincronização...').start();
      const opService = new OpenProjectService(config);

      try {
        // 1. Check local tasks for updates (e.g. status changes)
        spinner.text = 'Verificando tarefas locais...';
        const localTasks = getLocalTasks();
        const localTasksMap = new Map(localTasks.map(t => [t.id, t]));

        spinner.text = 'Buscando tarefas do Open Project...';
        const userId = await opService.getCurrentUserId();
        const remoteTasks = await opService.getMyWorkPackages(userId);
        const remoteTasksMap = new Map(remoteTasks.map(t => [t.id, t]));

        // Sync logic:
        // Se uma tarefa local tem um status diferente da remota, a local vence se estivermos atualizando o OP.
        // O caso de uso especifica: "marcar como concluida as que foram dadas como concluidas no open project"
        // Wait, "as que foram dadas como concluidas no open project" - if the user meant:
        // "marcar como concluidas (no OP) as que foram dadas como concluidas (localmente)" - that's upload.
        // "ou marcar como concluidas (localmente) as que foram dadas como concluidas no open project" - that's download.
        // We'll update the Open Project status if the local status changed and the local updatedAt is newer? 
        // Actually, markdown doesn't track local updatedAt automatically unless we use fs.stat.
        // Let's do a simple approach: if local status != remote status, we update OP if we assume local changes have priority during sync, OR we just download remote changes.
        // Let's update OP if local status is "Concluída", "Closed", "Fechada", "Done" and remote is not.
        
        const completedStatuses = ['closed', 'concluída', 'concluida', 'fechada', 'done'];

        let updatedRemoteCount = 0;
        for (const localTask of localTasks) {
          const remoteTask = remoteTasksMap.get(localTask.id);
          if (remoteTask) {
            const localIsCompleted = completedStatuses.includes(localTask.status.toLowerCase());
            const remoteIsCompleted = completedStatuses.includes(remoteTask.status.toLowerCase());

            if (localIsCompleted && !remoteIsCompleted) {
              spinner.text = `Atualizando status da tarefa #${localTask.id} no Open Project...`;
              await opService.updateWorkPackageStatus(localTask.id, remoteTask.lockVersion, localTask.status);
              updatedRemoteCount++;
              // After updating, update our local copy of remoteTask to have the new status so we don't overwrite it locally in the next step
              remoteTask.status = localTask.status; 
            } else if (localTask.status !== remoteTask.status) {
              // If there's another difference, we can choose to push local status or pull remote status.
              // To be safe, we'll push local status to OP if they differ and we want local to be the source of truth for status.
              spinner.text = `Atualizando status da tarefa #${localTask.id} no Open Project...`;
              try {
                await opService.updateWorkPackageStatus(localTask.id, remoteTask.lockVersion, localTask.status);
                updatedRemoteCount++;
                remoteTask.status = localTask.status;
              } catch (e: any) {
                // Ignore if status is not valid
              }
            }
          }
        }

        // 2. Download remote tasks to local (Creates new ones and updates existing ones)
        spinner.text = 'Sincronizando tarefas para o diretório local...';
        let updatedLocalCount = 0;
        let createdLocalCount = 0;

        for (const remoteTask of remoteTasks) {
          const localTask = localTasksMap.get(remoteTask.id);
          if (!localTask) {
            saveTaskLocally(remoteTask);
            createdLocalCount++;
          } else {
            // Se a tarefa remota for mais nova, ou se a gente acabou de atualizar o remoteTask, salvamos.
            saveTaskLocally(remoteTask);
            updatedLocalCount++;
          }
        }

        spinner.succeed(chalk.green('Sincronização concluída com sucesso!'));
        console.log(chalk.gray(`Tarefas baixadas/atualizadas localmente: ${createdLocalCount + updatedLocalCount}`));
        console.log(chalk.gray(`Tarefas atualizadas no Open Project: ${updatedRemoteCount}`));

      } catch (error: any) {
        spinner.fail(chalk.red('Erro durante a sincronização.'));
        console.error(chalk.red(error.message || error));
        if (error.response) {
            console.error(chalk.gray(`Status: ${error.response.status}`));
            console.error(chalk.gray(JSON.stringify(error.response.data)));
        }
      }
    });
}
