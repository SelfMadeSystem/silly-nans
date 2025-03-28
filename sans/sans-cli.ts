import { dialog, eod } from './sans.ts';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

async function navigateDialog(node: any) {
  if (typeof node === 'string') {
    console.log(node);
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      if (item === eod) {
        const answer = await askQuestion(
          'End of dialog. Do you want to start over? (y/N): ',
        );
        if (answer[0].toLowerCase() === 'y') {
          await navigateDialog(dialog);
        } else {
          rl.close();
        }
        return;
      } else if (typeof item === 'string') {
        console.log(item);
      } else {
        await navigateDialog(item);
      }
    }
  } else {
    const choices = Object.keys(node);
    for (let i = 0; i < choices.length; i++) {
      console.log(`${i + 1}. ${choices[i]}`);
    }
    const answer = await askQuestion('Choose an option: ');
    const choiceIndex = parseInt(answer) - 1;
    if (choiceIndex >= 0 && choiceIndex < choices.length) {
      await navigateDialog(node[choices[choiceIndex]]);
    } else {
      console.log('Invalid choice. Try again.');
      await navigateDialog(node);
    }
  }
}

async function startDialog() {
  console.log('hey buddy. you lost? or just... passing through');
  await navigateDialog(dialog);
  rl.close();
}

startDialog();
