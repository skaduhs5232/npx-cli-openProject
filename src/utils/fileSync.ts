import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { WorkPackage } from '../services/openProject';

const TASKS_DIR = path.join(process.cwd(), '.tasksOP');

export interface LocalTask extends WorkPackage {
  filePath: string;
}

export function initTasksDir(): boolean {
  let created = false;
  if (!fs.existsSync(TASKS_DIR)) {
    fs.mkdirSync(TASKS_DIR, { recursive: true });
    created = true;
  }
  
  const gitignorePath = path.join(TASKS_DIR, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, '*\n', 'utf8');
  }
  
  return created;
}

export function checkTasksDir(): boolean {
  return fs.existsSync(TASKS_DIR);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function sanitizeFolderName(name: string): string {
  // Substitui caracteres inválidos para pastas, mas mantém espaços para ficar bonito
  return name.replace(/[\/\\:*?"<>|]/g, '_').trim();
}

function getMdFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) {
    return results;
  }
  
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getMdFilesRecursively(filePath));
    } else if (file.endsWith('.md')) {
      results.push(filePath);
    }
  }
  return results;
}

export function saveTaskLocally(task: WorkPackage): void {
  initTasksDir();

  const projectFolder = path.join(TASKS_DIR, sanitizeFolderName(task.projectName!));
  if (!fs.existsSync(projectFolder)) {
    fs.mkdirSync(projectFolder, { recursive: true });
  }
  
  const statusFolder = path.join(projectFolder, sanitizeFolderName(task.status));
  if (!fs.existsSync(statusFolder)) {
    fs.mkdirSync(statusFolder, { recursive: true });
  }

  const fileName = `${task.id}-${sanitizeFileName(task.subject)}.md`;
  const newFilePath = path.join(statusFolder, fileName);

  // 1. Procurar se já existe um arquivo com esse ID em QUALQUER outra subpasta (caso o status tenha mudado)
  const allLocalTasks = getLocalTasks();
  const existingTask = allLocalTasks.find(t => t.id === task.id);
  
  if (existingTask && existingTask.filePath !== newFilePath) {
    try {
      // Remove o arquivo antigo da pasta do status anterior
      fs.unlinkSync(existingTask.filePath);
      
      // Se a pasta anterior ficou vazia (exceto por subpastas/arquivos ocultos), podemos tentar limpá-la
      const oldDir = path.dirname(existingTask.filePath);
      if (fs.readdirSync(oldDir).length === 0) {
        fs.rmdirSync(oldDir);
      }
    } catch (e) {
      // Ignora erro ao tentar remover arquivo antigo ou diretório
    }
  }

  // 2. Salva o arquivo na nova pasta de status
  const content = matter.stringify(task.description || 'Nenhuma descrição fornecida.', {
    id: task.id,
    subject: task.subject,
    status: task.status,
    lockVersion: task.lockVersion,
    updatedAt: task.updatedAt,
  });

  fs.writeFileSync(newFilePath, content, 'utf8');
}

export function getLocalTasks(): LocalTask[] {
  if (!fs.existsSync(TASKS_DIR)) {
    return [];
  }

  const mdFiles = getMdFilesRecursively(TASKS_DIR);
  const tasks: LocalTask[] = [];

  for (const filePath of mdFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = matter(content);

      if (parsed.data.id) {
        tasks.push({
          id: parsed.data.id,
          subject: parsed.data.subject,
          status: parsed.data.status,
          lockVersion: parsed.data.lockVersion,
          updatedAt: parsed.data.updatedAt,
          description: parsed.content.trim(),
          filePath,
        });
      }
    } catch (e) {
    }
  }

  return tasks;
}
